import { ZONE_TYPE_META } from "@/constants/zoneMeta";
import { Tool } from "@/editors/common/tooldispatch";
import { actions, actions as mapActions, selectors } from "@/slices/mapEditor";
import { store } from "@/store/store";
import { Mode } from "@/types/editor";
import { MapLayerName } from "@/types/layer";
import { isZoneObj, MapObjType, ZoneObj } from "@/types/map";
import { BrushShape, ZoneType } from "@/types/zone";
import { shallowEquals } from "@/utils/array";
import { determineCoverage, pointInTriangle } from "@/utils/collider";
import { subState } from "@/utils/redux";
import * as P from "pixi.js";
import { globals as g } from "../globals";

/**
 * A brush-painting tool that creates painted zone objects of various types
 * (collision, sink, sound, zoom, sensor) on the Sensors layer. Supports
 * selection-aware activation: if a zone object is already selected, subsequent
 * strokes modify that object; otherwise a new object is created on first commit.
 */
export class ZonePaintTool implements Tool {
  private maskGraphics: P.Graphics | null = null;
  private maskTexture: P.RenderTexture | null = null;
  private maskSprite: P.Sprite | null = null;
  private brushContainer: P.Container | null = null;
  private brushGraphics: P.Graphics | null = null;
  private rectsGraphics: P.Graphics | null = null;

  private isDrawing = false;
  private lastDrawPos: P.Point | null = null;
  private startDrawPos: P.Point | null = null;

  private brushSize = 3;
  private brushShape: BrushShape = "square";
  private isEraserMode = false;
  private overlayOpacity = 0.5;
  public showColliders = true;
  private simplify = 0.5;
  private zoneType: ZoneType = MapObjType.CollisionZone;

  /** Working zone object id — null until first commit or set from selection */
  private _workingObjId: string | null = null;

  public get workingObjId(): string | null {
    return this._workingObjId;
  }

  private set workingObjId(value: string | null) {
    this._workingObjId = value;
  }

  /**
   * When the tool is attached to an already-selected zone, this is locked
   * to that zone's type and cannot be changed from the UI.
   */
  public lockedZoneType: ZoneType | null = null;

  /** Tile-grid mask dimensions */
  private maskWidth = 0;
  private maskHeight = 0;
  private tileSize = 16;
  private boundsX = 0;
  private boundsY = 0;

  /** The collision mask data (true = filled) at tile-grid resolution */
  private collisionMask: boolean[][] = [];

  // -------------------------------------------------------------------------
  // Initialization / teardown
  // -------------------------------------------------------------------------

  private initializeMask(): void {
    this.clearMaskDisplay();

    const state = store.getState();
    const bounds = state.mapEditor.bounds;
    const tileSize = state.mapEditor.grid.size.x;

    this.tileSize = tileSize;
    this.boundsX = bounds.x;
    this.boundsY = bounds.y;
    this.maskWidth = Math.ceil(bounds.width / tileSize);
    this.maskHeight = Math.ceil(bounds.height / tileSize);

    // Always start with an empty mask, then populate from the current object
    // state if one exists. Reconstructing from the object's actual x/y and
    // shapes ensures the mask stays in sync even after the object is moved.
    this.collisionMask = Array(this.maskHeight)
      .fill(null)
      .map(() => Array(this.maskWidth).fill(false));

    if (this.workingObjId) {
      const obj = state.mapEditor.objects.entities[this.workingObjId];
      if (isZoneObj(obj)) {
        this.rasterizeShapesToMask(obj.x, obj.y, obj.shapes);
      }
    }

    const meta = ZONE_TYPE_META[this.zoneType];

    // Render texture sized to mask cells, sprite scaled by tileSize
    this.maskTexture = P.RenderTexture.create({
      width: this.maskWidth,
      height: this.maskHeight,
      antialias: false,
    });
    this.maskTexture.source.scaleMode = "nearest";

    this.maskGraphics = new P.Graphics();

    this.maskSprite = new P.Sprite(this.maskTexture);
    this.maskSprite.position.set(bounds.x, bounds.y);
    this.maskSprite.scale.set(tileSize, tileSize);
    this.maskSprite.tint = meta.color;
    this.maskSprite.alpha = this.overlayOpacity;
    this.maskSprite.zIndex = 9000;
    g.mapContainer.addChild(this.maskSprite);

    this.brushContainer = new P.Container();
    this.brushContainer.zIndex = 9200;
    this.brushGraphics = new P.Graphics();
    this.brushContainer.addChild(this.brushGraphics);
    g.mapContainer.addChild(this.brushContainer);

    this.rectsGraphics = new P.Graphics();
    this.rectsGraphics.position.set(bounds.x, bounds.y);
    this.rectsGraphics.zIndex = 9100;
    g.mapContainer.addChild(this.rectsGraphics);

    this.updateBrushCursor();
    this.redrawMaskTexture();
  }

  private clearMaskDisplay(): void {
    if (this.maskSprite) {
      g.mapContainer.removeChild(this.maskSprite);
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
      g.mapContainer.removeChild(this.brushContainer);
      this.brushContainer.destroy({ children: true });
      this.brushContainer = null;
      this.brushGraphics = null;
    }
    if (this.rectsGraphics) {
      g.mapContainer.removeChild(this.rectsGraphics);
      this.rectsGraphics.destroy();
      this.rectsGraphics = null;
    }

    this.isDrawing = false;
    this.lastDrawPos = null;
  }

  // -------------------------------------------------------------------------
  // Brush drawing
  // -------------------------------------------------------------------------

  /**
   * Reconstructs the collisionMask by rasterizing the object's triangulated
   * shapes back to tile cells. Uses the object's current world position so the
   * mask stays aligned even if the object was moved since it was last painted.
   */
  private rasterizeShapesToMask(
    objX: number,
    objY: number,
    shapes: NonNullable<
      {
        shapes?: Array<
          Array<{
            a: { x: number; y: number };
            b: { x: number; y: number };
            c: { x: number; y: number };
          }>
        >;
      }["shapes"]
    >,
  ): void {
    const ts = this.tileSize;
    for (let cy = 0; cy < this.maskHeight; cy++) {
      for (let cx = 0; cx < this.maskWidth; cx++) {
        // Test the center of this tile cell in object-local coords
        const localX = this.boundsX + cx * ts + ts / 2 - objX;
        const localY = this.boundsY + cy * ts + ts / 2 - objY;
        let inside = false;
        outer: for (const polygon of shapes) {
          for (const tri of polygon) {
            if (pointInTriangle(localX, localY, tri.a, tri.b, tri.c)) {
              inside = true;
              break outer;
            }
          }
        }
        this.collisionMask[cy][cx] = inside;
      }
    }
  }

  private updateBrushCursor(): void {
    if (!this.brushGraphics) return;
    this.brushGraphics.clear();

    const ts = this.tileSize;

    const meta = ZONE_TYPE_META[this.zoneType];

    if (this.brushShape === "circle") {
      const radius = (this.brushSize * ts) / 2;
      this.brushGraphics.circle(radius, radius, radius);
    } else {
      this.brushGraphics.rect(0, 0, this.brushSize * ts, this.brushSize * ts);
    }

    this.brushGraphics.fill({
      color: this.isEraserMode ? 0x0000ff : meta.color,
      alpha: 0.4,
    });
  }

  /** Convert world position to mask-cell coordinates */
  private worldToMask(
    worldX: number,
    worldY: number,
  ): { mx: number; my: number } {
    return {
      mx: Math.floor((worldX - this.boundsX) / this.tileSize),
      my: Math.floor((worldY - this.boundsY) / this.tileSize),
    };
  }

  /**
   * Returns the top-left tile origin of the brush centered on (centerMX, centerMY).
   *
   * - Circle: fractional origin so the drawn circle is centred on the tile-left-edge
   *   (matches the circle graphic which is drawn with its centre at (radius, radius)).
   * - Square: integer-snapped origin so the brush occupies exactly `brushSize` whole
   *   tiles with the cursor tile in the middle (for odd sizes) or left-of-centre (even).
   */
  private brushOrigin(
    centerMX: number,
    centerMY: number,
  ): { originMX: number; originMY: number } {
    const halfSize = this.brushSize / 2;
    if (this.brushShape === "circle") {
      return { originMX: centerMX - halfSize, originMY: centerMY - halfSize };
    }
    const halfFloor = Math.floor(halfSize);
    return {
      originMX: centerMX - halfFloor,
      originMY: centerMY - halfFloor,
    };
  }

  private drawAtPosition(worldX: number, worldY: number): void {
    if (!this.maskGraphics || !this.maskTexture) return;

    const { mx: centerMX, my: centerMY } = this.worldToMask(worldX, worldY);
    const { originMX, originMY } = this.brushOrigin(centerMX, centerMY);

    const minMX = Math.max(0, Math.floor(originMX));
    const maxMX = Math.min(
      this.maskWidth - 1,
      Math.floor(originMX) + this.brushSize - 1,
    );
    const minMY = Math.max(0, Math.floor(originMY));
    const maxMY = Math.min(
      this.maskHeight - 1,
      Math.floor(originMY) + this.brushSize - 1,
    );

    if (this.brushShape === "circle") {
      const radius = this.brushSize / 2;
      for (let py = minMY; py <= maxMY; py++) {
        for (let px = minMX; px <= maxMX; px++) {
          const dx = px + 0.5 - centerMX;
          const dy = py + 0.5 - centerMY;
          if (dx * dx + dy * dy <= radius * radius) {
            this.collisionMask[py][px] = !this.isEraserMode;
          }
        }
      }
    } else {
      for (let py = minMY; py <= maxMY; py++) {
        for (let px = minMX; px <= maxMX; px++) {
          this.collisionMask[py][px] = !this.isEraserMode;
        }
      }
    }

    this.redrawMaskTexture();
  }

  private drawLine(wx1: number, wy1: number, wx2: number, wy2: number): void {
    const dx = wx2 - wx1;
    const dy = wy2 - wy1;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) {
      this.drawAtPosition(wx1, wy1);
      return;
    }

    const step = this.tileSize * (this.brushSize / 4);
    const steps = Math.ceil(distance / Math.max(step, 1));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      this.drawAtPosition(wx1 + dx * t, wy1 + dy * t);
    }
  }

  private redrawMaskTexture(): void {
    if (!this.maskGraphics || !this.maskTexture) return;

    const app = g.app;
    this.maskGraphics.clear();

    for (let y = 0; y < this.maskHeight; y++) {
      for (let x = 0; x < this.maskWidth; x++) {
        if (this.collisionMask[y][x]) {
          this.maskGraphics.rect(x, y, 1, 1);
        }
      }
    }
    this.maskGraphics.fill({ color: 0xffffff, alpha: 1.0 });

    app.renderer.render({
      container: this.maskGraphics,
      target: this.maskTexture,
      clear: true,
      clearColor: [0, 0, 0, 0],
    });
  }

  // -------------------------------------------------------------------------
  // Coverage computation and redux commit
  // -------------------------------------------------------------------------

  private computeAndCommit(): void {
    if (this.collisionMask.length === 0) return;

    const coverageShapes = determineCoverage(this.collisionMask, {
      simplify: {
        tolerance: this.simplify,
        preserveCorners: false,
      },
    });

    if (this.showColliders) {
      this.drawColliders(coverageShapes);
    }

    if (coverageShapes.length === 0) {
      if (this.workingObjId) {
        store.dispatch(actions.removeOne(this.workingObjId));
        this.workingObjId = null;
        this.lockedZoneType = null;
      }
      return;
    }

    // Compute the tight bounding box over all painted mask cells.
    let minCX = this.maskWidth;
    let minCY = this.maskHeight;
    let maxCX = 0;
    let maxCY = 0;
    for (let y = 0; y < this.maskHeight; y++) {
      for (let x = 0; x < this.maskWidth; x++) {
        if (this.collisionMask[y][x]) {
          if (x < minCX) minCX = x;
          if (x > maxCX) maxCX = x;
          if (y < minCY) minCY = y;
          if (y > maxCY) maxCY = y;
        }
      }
    }

    const ts = this.tileSize;
    const state = store.getState();
    const bounds = state.mapEditor.bounds;

    const objX = bounds.x + minCX * ts;
    const objY = bounds.y + minCY * ts;
    const objW = (maxCX - minCX + 1) * ts;
    const objH = (maxCY - minCY + 1) * ts;

    const localShapes = coverageShapes.map((polygon) =>
      polygon.map((triangle) => ({
        a: {
          x: (triangle.a.x - minCX) * ts,
          y: (triangle.a.y - minCY) * ts,
        },
        b: {
          x: (triangle.b.x - minCX) * ts,
          y: (triangle.b.y - minCY) * ts,
        },
        c: {
          x: (triangle.c.x - minCX) * ts,
          y: (triangle.c.y - minCY) * ts,
        },
      })),
    );

    const activeZoneType = this.lockedZoneType ?? this.zoneType;

    const isFirstCommit = this.workingObjId === null;
    const objId = this.workingObjId ?? crypto.randomUUID();

    const obj: ZoneObj = {
      id: objId,
      layer: MapLayerName.Sensors,
      x: objX,
      y: objY,
      z: 0,
      width: objW,
      height: objH,
      points: [],
      shapes: localShapes,
      hidden: true,
      type: activeZoneType,
    };

    if (isFirstCommit) {
      this.workingObjId = objId;
      this.lockedZoneType = activeZoneType;
      store.dispatch(actions.addOne(obj));
      store.dispatch(actions.setOneSelected(objId));
    } else {
      store.dispatch(actions.removeOne(this.workingObjId!));
      store.dispatch(actions.addOne(obj));
    }
  }

  private drawColliders(
    coverageShapes: ReturnType<typeof determineCoverage>,
  ): void {
    if (!this.rectsGraphics) return;
    this.rectsGraphics.clear();

    const meta = ZONE_TYPE_META[this.lockedZoneType ?? this.zoneType];

    coverageShapes.forEach((polygon) => {
      polygon.forEach((triangle) => {
        const ts = this.tileSize;
        this.rectsGraphics!.poly([
          { x: triangle.a.x * ts, y: triangle.a.y * ts },
          { x: triangle.b.x * ts, y: triangle.b.y * ts },
          { x: triangle.c.x * ts, y: triangle.c.y * ts },
        ])
          .fill({ color: meta.color, alpha: 1.0 })
          .stroke({ color: 0xffffff, width: 1, pixelLine: true });
      });
    });
  }

  public clearCoverageDisplay(): void {
    if (this.rectsGraphics) {
      this.rectsGraphics.clear();
    }
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  public setBrushSize(size: number): void {
    this.brushSize = Math.max(1, Math.min(50, size));
    this.updateBrushCursor();
  }

  public setBrushShape(shape: BrushShape): void {
    this.brushShape = shape;
    this.updateBrushCursor();
  }

  public setEraserMode(value: boolean): void {
    this.isEraserMode = value;
    this.updateBrushCursor();
  }

  public setOverlayOpacity(opacity: number): void {
    this.overlayOpacity = Math.max(0, Math.min(1, opacity));
    if (this.maskSprite) {
      this.maskSprite.alpha = this.overlayOpacity;
    }
  }

  public setSimplify(value: number): void {
    this.simplify = value;
  }

  public setZoneType(type: ZoneType): void {
    if (this.lockedZoneType !== null) return; // locked to selected object
    this.zoneType = type;
    if (this.maskSprite) {
      this.maskSprite.tint = ZONE_TYPE_META[type].color;
    }
    this.updateBrushCursor();
  }

  /** Clears the mask and removes the working region object from the map. */
  public clearMask(): void {
    if (this.collisionMask.length === 0) return;

    for (let y = 0; y < this.maskHeight; y++) {
      for (let x = 0; x < this.maskWidth; x++) {
        this.collisionMask[y][x] = false;
      }
    }

    if (this.maskGraphics && this.maskTexture) {
      this.maskGraphics.clear();
      g.app.renderer.render({
        container: this.maskGraphics,
        target: this.maskTexture,
        clear: true,
      });
    }

    this.clearCoverageDisplay();

    if (this.workingObjId) {
      store.dispatch(actions.removeOne(this.workingObjId));
      this.workingObjId = null;
      this.lockedZoneType = null;
    }
  }

  /** Called when the tool becomes active. */
  public activate(): void {
    if (!g.initialized) return;

    // Check if a zone object is already selected
    const state = store.getState();
    const selectedObjs = selectors.selectedObjs(state);
    const selectedZone = selectedObjs.find((o) => isZoneObj(o));

    if (selectedZone) {
      this.workingObjId = selectedZone.id;
      this.lockedZoneType = selectedZone.type;
      this.zoneType = selectedZone.type;
      store.dispatch(
        mapActions.updateOne({
          id: this.workingObjId,
          changes: { hidden: true },
        }),
      );
    } else {
      // No zone selected — always start fresh so the user can paint a new
      // zone. Keeping the old workingObjId would silently add to the previous
      // zone even after the user explicitly deselected it.
      this.workingObjId = null;
      this.lockedZoneType = null;
    }

    this.initializeMask();
  }

  /** Called when the tool becomes inactive. */
  public deactivate(): void {
    this.clearMaskDisplay();

    if (this.workingObjId) {
      store.dispatch(
        mapActions.updateOne({
          id: this.workingObjId,
          changes: { hidden: false },
        }),
      );
    }
  }

  // -------------------------------------------------------------------------
  // Tool interface
  // -------------------------------------------------------------------------

  public onPointerDown(e: P.FederatedPointerEvent): boolean {
    if (e.button !== 0) return false;

    const mode = selectors.selectMode(store.getState());
    if (mode !== ("paint-zone" as Mode)) return false;
    if (this.collisionMask.length === 0) return false;

    const localPos = g.mapContainer.toLocal(e.global);
    this.isDrawing = true;
    this.drawAtPosition(localPos.x, localPos.y);
    this.lastDrawPos = new P.Point(localPos.x, localPos.y);
    this.startDrawPos = new P.Point(localPos.x, localPos.y);
    return true;
  }

  public onPointerMove(e: P.FederatedPointerEvent): boolean {
    const mode = selectors.selectMode(store.getState());
    if (mode !== ("paint-zone" as Mode)) return false;
    if (this.collisionMask.length === 0) return false;

    const localPos = g.mapContainer.toLocal(e.global);

    if (this.brushContainer) {
      const ts = this.tileSize;
      const centerMX = Math.floor((localPos.x - this.boundsX) / ts);
      const centerMY = Math.floor((localPos.y - this.boundsY) / ts);
      const { originMX, originMY } = this.brushOrigin(centerMX, centerMY);

      this.brushContainer.position.set(
        originMX * ts + this.boundsX,
        originMY * ts + this.boundsY,
      );
    }

    if (this.isDrawing) {
      if (this.lastDrawPos) {
        this.drawLine(
          this.lastDrawPos.x,
          this.lastDrawPos.y,
          localPos.x,
          localPos.y,
        );
      } else {
        this.drawAtPosition(localPos.x, localPos.y);
      }

      if (this.showColliders) {
        const coverageShapes = determineCoverage(this.collisionMask, {
          simplify: { tolerance: this.simplify, preserveCorners: false },
        });
        this.drawColliders(coverageShapes);
      }

      this.lastDrawPos = new P.Point(localPos.x, localPos.y);
      return true;
    }

    return false;
  }

  public onPointerUp(e: P.FederatedPointerEvent): boolean {
    if (e.button !== 0) return false;
    if (!this.isDrawing) return false;

    const moved =
      this.startDrawPos !== null &&
      !this.startDrawPos.equals(g.mapContainer.toLocal(e.global));
    const wasDrawing = this.isDrawing;
    this.isDrawing = false;
    this.lastDrawPos = null;
    this.startDrawPos = null;

    if (wasDrawing) {
      this.computeAndCommit();
    }

    return moved;
  }

  public getCursor(_e: P.FederatedPointerEvent): string | null {
    const mode = selectors.selectMode(store.getState());
    if (mode !== ("paint-zone" as Mode)) return null;
    return "crosshair";
  }
}

let zoneToolInstance: ZonePaintTool | null = null;

export function getZonePaintTool(): ZonePaintTool {
  if (!zoneToolInstance) {
    zoneToolInstance = new ZonePaintTool();
  }
  return zoneToolInstance;
}

export function setupZonePaintTool(): ZonePaintTool {
  const tool = getZonePaintTool();

  // Track whether the tool is currently active so we can avoid redundant
  // activate/deactivate calls around transient "pan" mode transitions.
  let toolIsActive = false;

  subState([selectors.selectMode], (mode) => {
    if (mode === "paint-zone") {
      if (!toolIsActive) {
        tool.activate();
        toolIsActive = true;
      }
    } else if (mode === "pan") {
      // Right-click panning pushes a transient "pan" mode on top of the real
      // mode. Deactivating here would destroy the mask display and coverage
      // graphics, which then can't be restored without re-painting. Skip the
      // deactivate so the visual state survives the pan.
    } else {
      if (toolIsActive) {
        tool.deactivate();
        toolIsActive = false;
      }
    }
  });

  // While the tool is active and has a working zone, prevent any external
  // selection change (e.g. right-click-drag pan clearing the selection) from
  // deselecting that zone. Re-assert the selection whenever it drifts.
  subState(
    [
      (state) => state.mapEditor.modeStack,
      (state) => state.mapEditor.selectedIds as string[],
    ],
    (modeStack, selectedIds) => {
      if (
        !shallowEquals(modeStack.slice(-2), ["paint-zone", "pan"]) &&
        modeStack.at(-1) !== "paint-zone"
      )
        return;
      const id = tool.workingObjId;
      if (id !== null && !selectedIds.includes(id)) {
        store.dispatch(actions.setOneSelected(id));
      }
    },
  );

  subState([(state) => state.mapEditor.toolOptions["paint-zone"]], (opts) => {
    tool.setBrushSize(opts.brushSize);
    tool.setBrushShape(opts.brushShape);
    tool.setEraserMode(opts.mode === "erase");
    tool.setOverlayOpacity(opts.overlayOpacity);
    tool.setSimplify(opts.simplify);
    tool.showColliders = opts.showColliders;

    if (tool.lockedZoneType === null) {
      tool.setZoneType(opts.zoneType);
    }

    if (!opts.showColliders) {
      tool.clearCoverageDisplay();
    }
  });

  return tool;
}
