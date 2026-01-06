import { Tool } from "@/editors/common/tooldispatch";
import { globals as gApp } from "@/globals";
import { selectors } from "@/slices/tilesetEditor";
import { store } from "@/store/store";
import { isTileGroupTemplate, TileGroupTemplate } from "@/types/tilegroup";
import { subState } from "@/utils/redux";
import * as P from "pixi.js";
import { globals as g } from "../globals";

/**
 * A tool that implements the Tool interface for drawing collision masks on tile
 * groups. The collision mask is painted as an opaque red overlay where the user
 * draws with a brush.
 */
export class ColliderTool implements Tool {
  /** The currently active tile group template being edited */
  private currentObj: TileGroupTemplate | null = null;

  /** Graphics object used to draw collision mask shapes before rendering to texture */
  private maskGraphics: P.Graphics | null = null;

  /** Render texture that stores the collision mask as a drawable surface */
  private maskTexture: P.RenderTexture | null = null;

  /** Sprite that displays the collision mask texture with red tint overlay */
  private maskSprite: P.Sprite | null = null;

  /** Container that holds the brush cursor visual feedback */
  private brushContainer: P.Container | null = null;

  /** Graphics object that renders the brush cursor outline */
  private brushGraphics: P.Graphics | null = null;

  /** Whether the user is currently drawing (mouse button held down) */
  private isDrawing = false;

  /** The last position where drawing occurred, used for interpolating smooth
   * strokes */
  private lastDrawPos: P.Point | null = null;

  /** Size of the square brush in pixels */
  private brushSize = 8;

  /** If true, brush only draws on non-transparent pixels; if false, draws on
   * all pixels including transparent areas */
  public drawOnOpaqueOnly = true;

  /** If true, brush acts as an eraser; if false, brush draws collision mask */
  private isEraserMode = false;

  /** 2D array storing collision mask data: true = collision, false = no
   * collision */
  private collisionMask: boolean[][] = [];

  /**
   * Clears all collision mask visual elements and resets state.
   */
  private clearCollisionMask(): void {
    if (this.maskSprite) {
      g.tilesetContainer.removeChild(this.maskSprite);
      this.maskSprite.destroy();
      this.maskSprite = null;
    }

    if (this.maskTexture) {
      this.maskTexture.destroy(true);
      this.maskTexture = null;
    }

    if (this.maskGraphics) {
      this.maskGraphics.destroy();
      this.maskGraphics = null;
    }

    if (this.brushContainer) {
      g.tilesetContainer.removeChild(this.brushContainer);
      this.brushContainer.destroy({ children: true });
      this.brushContainer = null;
      this.brushGraphics = null;
    }

    this.currentObj = null;
    this.isDrawing = false;
    this.lastDrawPos = null;
    this.collisionMask = [];
  }

  /**
   * Initializes the collision mask visual elements for the given object.
   */
  private initializeCollisionMask(obj: TileGroupTemplate): void {
    this.clearCollisionMask();
    this.currentObj = obj;

    const width = Math.floor(obj.pos.width);
    const height = Math.floor(obj.pos.height);

    // Initialize collision mask data structure
    this.collisionMask = Array(height)
      .fill(null)
      .map(() => Array(width).fill(false));

    // Create render texture for the mask
    this.maskTexture = P.RenderTexture.create({
      width,
      height,
      antialias: false,
    });

    // Create graphics for drawing into the render texture
    this.maskGraphics = new P.Graphics();

    // Create sprite to display the mask
    this.maskSprite = new P.Sprite(this.maskTexture);
    this.maskSprite.position.set(obj.pos.x, obj.pos.y);
    this.maskSprite.tint = 0xff0000; // Red tint
    this.maskSprite.alpha = 0.8; // Semi-transparent
    this.maskSprite.zIndex = 100; // Render above everything else
    // Disable texture smoothing for hard pixelated edges
    this.maskTexture.source.scaleMode = "nearest";

    g.tilesetContainer.addChild(this.maskSprite);

    // Create brush cursor container
    this.brushContainer = new P.Container();
    this.brushContainer.zIndex = 200;
    this.brushGraphics = new P.Graphics();
    this.brushContainer.addChild(this.brushGraphics);
    g.tilesetContainer.addChild(this.brushContainer);

    // Draw initial brush cursor
    this.updateBrushCursor();
  }

  /**
   * Updates the brush cursor appearance.
   */
  private updateBrushCursor(): void {
    if (!this.brushGraphics) return;

    this.brushGraphics.clear();
    // Draw a solid square brush cursor (not centered, positioned at top-left)
    // This makes it clear exactly which pixels will be drawn
    this.brushGraphics.rect(0, 0, this.brushSize, this.brushSize);
    this.brushGraphics.fill({
      color: this.isEraserMode ? 0x0000ff : 0xff0000,
      alpha: 0.5,
    });
  }

  /**
   * Checks if a pixel is opaque (non-transparent) in the tileset ImageData.
   */
  private isPixelOpaque(localX: number, localY: number): boolean {
    if (!this.currentObj) return false;

    const obj = this.currentObj;
    const imageData = gApp.tilesetImageDataCache.get(obj.tilesetId);
    if (!imageData) return false;

    // Calculate the absolute position in the tileset texture
    const tilesetX = Math.floor(obj.pos.x + localX);
    const tilesetY = Math.floor(obj.pos.y + localY);

    // Check bounds
    if (
      tilesetX < 0 ||
      tilesetX >= imageData.width ||
      tilesetY < 0 ||
      tilesetY >= imageData.height
    ) {
      return false;
    }

    // Get the alpha channel value (RGBA format, so alpha is at index 3)
    const pixelIndex = (tilesetY * imageData.width + tilesetX) * 4;
    const alpha = imageData.data[pixelIndex + 3];

    // Consider pixel opaque if alpha > 0
    return alpha > 0;
  }

  /**
   * Draws a brush shape at the specified position in the collision mask. Only
   * draws on non-transparent pixels of the underlying object.
   */
  private drawAtPosition(x: number, y: number): void {
    if (!this.maskGraphics || !this.currentObj || !this.maskTexture) return;

    const obj = this.currentObj;

    // Center the brush on the mouse position, then snap to pixel grid
    const halfSize = this.brushSize / 2;
    const snappedX = Math.floor(x - halfSize);
    const snappedY = Math.floor(y - halfSize);

    // Convert to local coordinates relative to the object
    const localX = snappedX - obj.pos.x;
    const localY = snappedY - obj.pos.y;

    // Update collision mask data and draw only on opaque pixels
    const minX = Math.max(0, Math.floor(localX));
    const maxX = Math.min(
      obj.pos.width - 1,
      Math.floor(localX + this.brushSize - 1)
    );
    const minY = Math.max(0, Math.floor(localY));
    const maxY = Math.min(
      obj.pos.height - 1,
      Math.floor(localY + this.brushSize - 1)
    );

    // Update the collision mask data array
    for (let py = minY; py <= maxY; py++) {
      for (let px = minX; px <= maxX; px++) {
        // Check if within square brush bounds and (optionally) on an opaque pixel
        const shouldDraw = this.drawOnOpaqueOnly
          ? this.isPixelOpaque(px, py)
          : true;
        if (shouldDraw) {
          // Update collision mask data based on eraser mode
          this.collisionMask[py][px] = !this.isEraserMode;
        }
      }
    }

    // Redraw the entire mask texture from the collision mask data
    this.redrawMaskTexture();
  }

  /**
   * Redraws the entire mask texture from the collision mask data array.
   */
  private redrawMaskTexture(): void {
    if (!this.maskGraphics || !this.currentObj || !this.maskTexture) return;

    const obj = this.currentObj;

    // Clear the graphics
    this.maskGraphics.clear();

    // Draw all pixels that are marked as collision in the data array
    for (let y = 0; y < obj.pos.height; y++) {
      for (let x = 0; x < obj.pos.width; x++) {
        if (this.collisionMask[y][x]) {
          this.maskGraphics.rect(x, y, 1, 1);
        }
      }
    }

    // Fill with white
    this.maskGraphics.fill({ color: 0xffffff, alpha: 1.0 });

    // Render to texture with clear
    g.app.renderer.render({
      container: this.maskGraphics,
      target: this.maskTexture,
      clear: true,
      clearColor: [0, 0, 0, 0],
    });
  }

  /**
   * Draws a line between two points using circles (for smooth brush strokes).
   */
  private drawLine(x1: number, y1: number, x2: number, y2: number): void {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) {
      this.drawAtPosition(x1, y1);
      return;
    }

    // Draw circles along the line
    const steps = Math.ceil(distance / (this.brushSize / 4));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = x1 + dx * t;
      const y = y1 + dy * t;
      this.drawAtPosition(x, y);
    }
  }

  /**
   * Implements Tool.onPointerMove - updates brush cursor position and draws during drag.
   */
  public onPointerMove(e: P.FederatedPointerEvent): boolean {
    const state = store.getState();
    const mode = selectors.selectMode(state);

    if (mode !== "draw-colliders") {
      return false;
    }

    // Update brush cursor position, snapped to pixel grid and centered on mouse
    const localPos = g.tilesetContainer.toLocal(e.global);

    if (this.brushContainer) {
      // Center the brush on the mouse cursor, then snap to pixel grid
      const halfSize = this.brushSize / 2;
      const snappedX = Math.floor(localPos.x - halfSize);
      const snappedY = Math.floor(localPos.y - halfSize);
      this.brushContainer.position.set(snappedX, snappedY);
    }

    // Draw if currently dragging
    if (this.isDrawing && this.currentObj) {
      if (this.lastDrawPos) {
        this.drawLine(
          this.lastDrawPos.x,
          this.lastDrawPos.y,
          localPos.x,
          localPos.y
        );
      } else {
        this.drawAtPosition(localPos.x, localPos.y);
      }

      this.lastDrawPos = new P.Point(localPos.x, localPos.y);
      return true;
    }

    return false;
  }

  /**
   * Implements Tool.getCursor - returns crosshair cursor when in draw-colliders mode.
   */
  public getCursor(_e: P.FederatedPointerEvent): string | null {
    const state = store.getState();
    const mode = selectors.selectMode(state);

    if (mode !== "draw-colliders") {
      return null;
    }

    return "crosshair";
  }

  /**
   * Implements Tool.onPointerUp - ends drawing and commits changes.
   */
  public onPointerUp(_e: P.FederatedPointerEvent): boolean {
    if (this.isDrawing) {
      this.isDrawing = false;
      this.lastDrawPos = null;

      // TODO: Dispatch collision mask data to store
      // For now, we just clear the drawing state
      // In the future, this would save the collision mask to the object

      return true;
    }

    return false;
  }

  /**
   * Implements Tool.onPointerDown - starts drawing when left button is pressed.
   */
  public onPointerDown(e: P.FederatedPointerEvent): boolean {
    if (e.button !== 0) return false; // Only left button

    const state = store.getState();
    const mode = selectors.selectMode(state);

    if (mode !== "draw-colliders" || !this.currentObj) {
      return false;
    }

    // Start drawing
    this.isDrawing = true;

    const localPos = g.tilesetContainer.toLocal(e.global);
    this.drawAtPosition(localPos.x, localPos.y);
    this.lastDrawPos = new P.Point(localPos.x, localPos.y);

    return true;
  }

  /**
   * Sets the active object for collision mask editing.
   */
  public setActiveObject(obj: TileGroupTemplate | null): void {
    if (obj) {
      this.initializeCollisionMask(obj);
    } else {
      this.clearCollisionMask();
    }
  }

  /**
   * Sets the brush size for drawing.
   */
  public setBrushSize(size: number): void {
    this.brushSize = Math.max(1, Math.min(50, size)); // Clamp between 1 and 50
    this.updateBrushCursor();
  }

  /**
   * Sets whether the brush is in eraser mode.
   */
  public setEraserMode(value: boolean): void {
    this.isEraserMode = value;
    this.updateBrushCursor();
  }

  /**
   * Clears the entire collision mask.
   */
  public clearMask(): void {
    if (!this.currentObj || !this.maskTexture || !this.maskGraphics) return;

    // Clear the collision mask data
    const width = Math.floor(this.currentObj.pos.width);
    const height = Math.floor(this.currentObj.pos.height);
    this.collisionMask = Array(height)
      .fill(null)
      .map(() => Array(width).fill(false));

    // Clear the graphics
    this.maskGraphics.clear();

    // Re-render to texture (clearing it)
    g.app.renderer.render({
      container: this.maskGraphics,
      target: this.maskTexture,
      clear: true,
    });
  }
}

// Create a singleton instance of the tool
let colliderToolInstance: ColliderTool | null = null;

/**
 * Gets or creates the ColliderTool singleton instance.
 */
export function getColliderTool(): ColliderTool {
  if (!colliderToolInstance) {
    colliderToolInstance = new ColliderTool();
  }
  return colliderToolInstance;
}

/**
 * Sets up the collider tool and subscribes to state changes.
 */
export function setupCollider(): ColliderTool {
  const tool = getColliderTool();

  subState(
    [(state) => state.tilesetEditor.selectedTool, selectors.selectedObjects],
    (selectedTool, selectedObjs) => {
      if (selectedTool !== "draw-colliders") {
        tool.setActiveObject(null);
        return;
      }

      const objs = selectedObjs.filter(isTileGroupTemplate);
      tool.setActiveObject(objs.length === 1 ? objs[0] : null);
    }
  );

  // Subscribe to tool options changes
  subState(
    [(state) => state.tilesetEditor.toolOptions.collider],
    (colliderOpts) => {
      tool.setBrushSize(colliderOpts.brushSize);
      tool.setEraserMode(colliderOpts.mode === "erase");
      tool.drawOnOpaqueOnly = colliderOpts.drawOnOpaqueOnly;
    }
  );

  return tool;
}
