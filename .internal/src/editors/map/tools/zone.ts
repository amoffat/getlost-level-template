import { ZONE_TYPE_META } from "@/constants/zoneMeta";
import { Tool } from "@/editors/common/tooldispatch";
import { actions, actions as mapActions, selectors } from "@/slices/mapEditor";
import { store } from "@/store/store";
import { Mode } from "@/types/editor";
import { MapLayerName } from "@/types/layer";
import {
  isZoneObj,
  MapObjType,
  ZoneObj,
  zoneTypeWithPadding,
} from "@/types/map";
import { ZonePaintOpts } from "@/types/tools";
import { BrushShape, ZoneType } from "@/types/zone";
import { shallowEquals } from "@/utils/array";
import { determineCoverage } from "@/utils/collider";
import {
  createQuadTree,
  Level,
  qtInsert,
  qtRemove,
  qtSnapLevel,
  qtToAdaptiveMask,
  QuadTree,
} from "@/utils/quadtree";
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
  private _maskGraphics: P.Graphics | null = null;
  private _maskTexture: P.RenderTexture | null = null;
  private _maskSprite: P.Sprite | null = null;
  private _brushContainer: P.Container | null = null;
  private _brushGraphics: P.Graphics | null = null;
  private _rectsGraphics: P.Graphics | null = null;

  private _isDrawing = false;
  private _lastDrawPos: P.Point | null = null;
  private _startDrawPos: P.Point | null = null;

  private _brushSize: Level = 16;
  private _brushShape: BrushShape = "square";
  private _isEraserMode = false;
  private _overlayOpacity = 0.5;
  private _showPolygons: boolean = false;
  private _simplify = 0.5;
  private _zoneType: ZoneType = MapObjType.CollisionZone;

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

  /** Pixel mask dimensions (equals bounds.width × bounds.height) */
  private _pixelWidth = 0;
  private _pixelHeight = 0;
  private _boundsX = 0;
  private _boundsY = 0;

  /**
   * Pixel offset applied to all quadtree operations so that stored
   * zone-local coordinates map correctly to map-relative texture pixels.
   *
   * For a freshly-painted zone this is 0. When an existing zone is loaded
   * after being moved, this equals `obj.x - (bounds.x + storedMinPX)` —
   * i.e. how far the object now sits from where its data expects it to be.
   * Every read/write/render path adds this offset rather than rewriting keys.
   */
  private _zoneOffsetX = 0;
  private _zoneOffsetY = 0;

  /** Linear quadtree mask (filled nodes at various power-of-2 resolutions) */
  private _quadTree: QuadTree = createQuadTree();
  private _maskInitialized = false;

  /** Cache for the last coverage computation — busted whenever the quadtree or simplify tolerance changes. */
  private _polygonCacheDirty = true;
  private _cachedCoverage: {
    shapes: ReturnType<typeof determineCoverage>;
    mask: boolean[][];
    cellSize: number;
    minPX: number;
    minPY: number;
  } | null = null;

  // -------------------------------------------------------------------------
  // Initialization / teardown
  // -------------------------------------------------------------------------

  private _initializeMask(): void {
    this._clearMaskDisplay();

    const state = store.getState();
    const bounds = state.mapEditor.bounds;

    this._boundsX = bounds.x;
    this._boundsY = bounds.y;
    this._pixelWidth = bounds.width;
    this._pixelHeight = bounds.height;

    // Load the quadtree from the working zone object if one exists.
    // Coordinates in the stored quadMask are map-relative pixels (relative to
    // bounds.x/y at the time of the last commit). If the zone has since been
    // moved, obj.x/y will differ from bounds.x + storedMinPX. We track that
    // difference as _zoneOffsetX/Y and apply it in every read/write/render
    // path, so the stored data never needs to be rewritten.
    this._quadTree = createQuadTree();
    this._zoneOffsetX = 0;
    this._zoneOffsetY = 0;
    this._polygonCacheDirty = true;
    this._cachedCoverage = null;
    if (this.workingObjId) {
      const obj = state.mapEditor.objects.entities[this.workingObjId];
      if (isZoneObj(obj) && obj.quadMask) {
        const { minPX: storedMinPX, minPY: storedMinPY } = qtToAdaptiveMask(
          obj.quadMask,
        );
        this._zoneOffsetX = obj.x - (bounds.x + storedMinPX);
        this._zoneOffsetY = obj.y - (bounds.y + storedMinPY);
        this._quadTree = { ...obj.quadMask };
      }
    }
    this._maskInitialized = true;

    const meta = ZONE_TYPE_META[this._zoneType];

    // Render texture at full pixel resolution; sprite has no extra scaling.
    this._maskTexture = P.RenderTexture.create({
      width: this._pixelWidth,
      height: this._pixelHeight,
      antialias: false,
    });
    this._maskTexture.source.scaleMode = "nearest";

    this._maskGraphics = new P.Graphics();

    this._maskSprite = new P.Sprite(this._maskTexture);
    this._maskSprite.position.set(bounds.x, bounds.y);
    this._maskSprite.scale.set(1, 1);
    this._maskSprite.tint = meta.color;
    this._maskSprite.alpha = this._overlayOpacity;
    this._maskSprite.zIndex = 9000;
    g.mapContainer.addChild(this._maskSprite);

    this._brushContainer = new P.Container();
    this._brushContainer.zIndex = 9200;
    this._brushGraphics = new P.Graphics();
    this._brushContainer.addChild(this._brushGraphics);
    g.mapContainer.addChild(this._brushContainer);

    this._rectsGraphics = new P.Graphics();
    this._rectsGraphics.position.set(bounds.x, bounds.y);
    this._rectsGraphics.zIndex = 9100;
    g.mapContainer.addChild(this._rectsGraphics);

    this._updateBrushCursor();
    this._redrawMaskTexture();
  }

  private _clearMaskDisplay(): void {
    if (this._maskSprite) {
      g.mapContainer.removeChild(this._maskSprite);
      this._maskSprite.destroy();
      this._maskSprite = null;
    }
    if (this._maskTexture) {
      this._maskTexture.destroy(true);
      this._maskTexture = null;
    }
    if (this._maskGraphics) {
      this._maskGraphics.destroy();
      this._maskGraphics = null;
    }
    if (this._brushContainer) {
      g.mapContainer.removeChild(this._brushContainer);
      this._brushContainer.destroy({ children: true });
      this._brushContainer = null;
      this._brushGraphics = null;
    }
    if (this._rectsGraphics) {
      g.mapContainer.removeChild(this._rectsGraphics);
      this._rectsGraphics.destroy();
      this._rectsGraphics = null;
    }

    this._isDrawing = false;
    this._lastDrawPos = null;
  }

  // -------------------------------------------------------------------------
  // Brush drawing
  // -------------------------------------------------------------------------

  private _updateBrushCursor(): void {
    if (!this._brushGraphics) return;
    this._brushGraphics.clear();

    const level = this._brushSize;

    const meta = ZONE_TYPE_META[this._zoneType];

    if (this._brushShape === "circle") {
      const radius = level / 2;
      this._brushGraphics.circle(radius, radius, radius);
    } else {
      this._brushGraphics.rect(0, 0, level, level);
    }

    this._brushGraphics.fill({
      color: this._isEraserMode ? 0x0000ff : meta.color,
      alpha: 0.4,
    });
  }

  /**
   * Returns the top-left world coordinate of the quadtree block that the
   * cursor is snapped to at the current level.
   */
  private blockOriginWorld(
    worldX: number,
    worldY: number,
  ): { originX: number; originY: number } {
    const level = this._brushSize;
    // Subtract the zone offset so snapping aligns with the painted data's
    // coordinate system, then add it back for the world-space result.
    const pixelX = worldX - this._boundsX - this._zoneOffsetX;
    const pixelY = worldY - this._boundsY - this._zoneOffsetY;
    const bx = Math.floor(pixelX / level);
    const by = Math.floor(pixelY / level);
    return {
      originX: bx * level + this._boundsX + this._zoneOffsetX,
      originY: by * level + this._boundsY + this._zoneOffsetY,
    };
  }

  private _drawAtPosition(worldX: number, worldY: number): void {
    if (!this._maskGraphics || !this._maskTexture) return;

    const level = this._brushSize;
    const bx = Math.floor((worldX - this._boundsX - this._zoneOffsetX) / level);
    const by = Math.floor((worldY - this._boundsY - this._zoneOffsetY) / level);

    if (this._isEraserMode) {
      qtRemove(this._quadTree, level, bx, by);
    } else {
      qtInsert(this._quadTree, level, bx, by);
    }

    this._polygonCacheDirty = true;
    this._redrawMaskTexture();
  }

  private _drawLine(wx1: number, wy1: number, wx2: number, wy2: number): void {
    const dx = wx2 - wx1;
    const dy = wy2 - wy1;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) {
      this._drawAtPosition(wx1, wy1);
      return;
    }

    // Step at most one block-width per sample so we don't skip blocks.
    const step = this._brushSize;
    const steps = Math.ceil(distance / Math.max(step, 1));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      this._drawAtPosition(wx1 + dx * t, wy1 + dy * t);
    }
  }

  private _redrawMaskTexture(): void {
    if (!this._maskGraphics || !this._maskTexture) return;

    const app = g.app;
    this._maskGraphics.clear();

    // Draw each quadtree node as a rect — one draw call per node, not per pixel.
    for (const k of Object.keys(this._quadTree)) {
      if (!this._quadTree[k]) continue;
      const parts = k.split(":");
      const level = Number(parts[0]);
      const bx = Number(parts[1]);
      const by = Number(parts[2]);
      // Apply the zone offset so the stored coords render at the correct
      // texture pixel position (accounting for any zone movement since commit).
      const px = bx * level + this._zoneOffsetX;
      const py = by * level + this._zoneOffsetY;
      const w = Math.min(level, this._pixelWidth - px);
      const h = Math.min(level, this._pixelHeight - py);
      if (w > 0 && h > 0) {
        this._maskGraphics.rect(px, py, w, h);
      }
    }
    this._maskGraphics.fill({ color: 0xffffff, alpha: 1.0 });

    app.renderer.render({
      container: this._maskGraphics,
      target: this._maskTexture,
      clear: true,
      clearColor: [0, 0, 0, 0],
    });
  }

  // -------------------------------------------------------------------------
  // Coverage computation and redux commit
  // -------------------------------------------------------------------------

  private _computeAndCommit(): void {
    if (!this._maskInitialized) return;

    const {
      shapes: coverageShapes,
      mask,
      cellSize,
      minPX,
      minPY,
    } = this._getOrComputeCoverage();

    this._refreshPolygons();

    if (coverageShapes.length === 0) {
      if (this.workingObjId) {
        store.dispatch(actions.removeOne(this.workingObjId));
        this.workingObjId = null;
        this.lockedZoneType = null;
      }
      return;
    }

    const maskW = mask[0]?.length ?? 0;
    const maskH = mask.length;

    const state = store.getState();
    const bounds = state.mapEditor.bounds;

    const objX = bounds.x + minPX + this._zoneOffsetX;
    const objY = bounds.y + minPY + this._zoneOffsetY;
    const objW = maskW * cellSize;
    const objH = maskH * cellSize;

    // Coverage shape vertices are in mask-cell units. Convert to pixel coords
    // local to the object origin (which equals minPX/minPY from boundsX/Y).
    const localShapes = coverageShapes.map((polygon) =>
      polygon.map((triangle) => ({
        a: { x: triangle.a.x * cellSize, y: triangle.a.y * cellSize },
        b: { x: triangle.b.x * cellSize, y: triangle.b.y * cellSize },
        c: { x: triangle.c.x * cellSize, y: triangle.c.y * cellSize },
      })),
    );

    const activeZoneType = this.lockedZoneType ?? this._zoneType;
    const isFirstCommit = this.workingObjId === null;

    if (isFirstCommit) {
      const padding = zoneTypeWithPadding(activeZoneType) ? 0 : undefined;
      const objId = crypto.randomUUID();
      const obj = {
        id: objId,
        layer: MapLayerName.Zones,
        x: objX,
        y: objY,
        z: 0,
        width: objW,
        height: objH,
        shapes: localShapes,
        quadMask: { ...this._quadTree },
        hidden: true,
        type: activeZoneType,
        simplify: this._simplify,
        name: "",
        padding,
        enabled: true,
      } as ZoneObj;

      this.workingObjId = objId;
      this.lockedZoneType = activeZoneType;
      store.dispatch(actions.addOne(obj));
      store.dispatch(actions.setOneSelected(objId));
    } else {
      const changes = {
        x: objX,
        y: objY,
        z: 0,
        width: objW,
        height: objH,
        shapes: localShapes,
        quadMask: { ...this._quadTree },
        simplify: this._simplify,
      } as Partial<ZoneObj>;

      store.dispatch(actions.updateOne({ id: this.workingObjId!, changes }));
    }
  }

  private _drawZonePolygons(
    coverageShapes: ReturnType<typeof determineCoverage>,
    cellSize: number,
    minPX: number,
    minPY: number,
  ): void {
    if (!this._rectsGraphics) return;
    this._rectsGraphics.clear();

    const meta = ZONE_TYPE_META[this.lockedZoneType ?? this._zoneType];

    coverageShapes.forEach((polygon) => {
      polygon.forEach((triangle) => {
        this._rectsGraphics!.poly([
          {
            x: minPX + this._zoneOffsetX + triangle.a.x * cellSize,
            y: minPY + this._zoneOffsetY + triangle.a.y * cellSize,
          },
          {
            x: minPX + this._zoneOffsetX + triangle.b.x * cellSize,
            y: minPY + this._zoneOffsetY + triangle.b.y * cellSize,
          },
          {
            x: minPX + this._zoneOffsetX + triangle.c.x * cellSize,
            y: minPY + this._zoneOffsetY + triangle.c.y * cellSize,
          },
        ])
          .fill({ color: meta.color, alpha: 1.0 })
          .stroke({ color: 0xffffff, width: 1, pixelLine: true });
      });
    });
  }

  /**
   * Returns cached coverage shapes, recomputing only when the quadtree or
   * simplify tolerance has changed since the last computation.
   */
  private _getOrComputeCoverage(): {
    shapes: ReturnType<typeof determineCoverage>;
    mask: boolean[][];
    cellSize: number;
    minPX: number;
    minPY: number;
  } {
    if (this._polygonCacheDirty || !this._cachedCoverage) {
      const { mask, cellSize, minPX, minPY } = qtToAdaptiveMask(this._quadTree);
      this._cachedCoverage = {
        shapes: determineCoverage(mask, {
          simplify: { tolerance: this._simplify, preserveCorners: false },
        }),
        mask,
        cellSize,
        minPX,
        minPY,
      };
      this._polygonCacheDirty = false;
    }
    return this._cachedCoverage;
  }

  /** Draws (or clears) the polygon overlay based on the current `_showPolygons` flag. */
  private _refreshPolygons(): void {
    if (!this._rectsGraphics) return;
    if (!this._showPolygons) {
      this._rectsGraphics.clear();
      return;
    }
    const { shapes, cellSize, minPX, minPY } = this._getOrComputeCoverage();
    this._drawZonePolygons(shapes, cellSize, minPX, minPY);
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  public setBrushSize(size: number): void {
    this._brushSize = qtSnapLevel(Math.max(1, Math.min(256, size)));
    this._updateBrushCursor();
  }

  public setBrushShape(shape: BrushShape): void {
    this._brushShape = shape;
    this._updateBrushCursor();
  }

  public setEraserMode(value: boolean): void {
    this._isEraserMode = value;
    this._updateBrushCursor();
  }

  public setShowPolygons(show: boolean): void {
    this._showPolygons = show;
    this._refreshPolygons();
  }

  public setOverlayOpacity(opacity: number): void {
    this._overlayOpacity = Math.max(0, Math.min(1, opacity));
    if (this._maskSprite) {
      this._maskSprite.alpha = this._overlayOpacity;
    }
  }

  public setSimplify(value: number): void {
    this._simplify = value;
    this._polygonCacheDirty = true;
    this._computeAndCommit();
  }

  public setZoneType(type: ZoneType): void {
    if (this.lockedZoneType !== null) return; // locked to selected object
    this._zoneType = type;
    if (this._maskSprite) {
      this._maskSprite.tint = ZONE_TYPE_META[type].color;
    }
    this._updateBrushCursor();
  }

  /** Clears the mask and removes the working region object from the map. */
  public clearMask(): void {
    if (!this._maskInitialized) return;

    this._quadTree = createQuadTree();
    this._polygonCacheDirty = true;
    this._cachedCoverage = null;

    if (this._maskGraphics && this._maskTexture) {
      this._maskGraphics.clear();
      g.app.renderer.render({
        container: this._maskGraphics,
        target: this._maskTexture,
        clear: true,
      });
    }

    this._rectsGraphics?.clear();

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
      this._zoneType = selectedZone.type;
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

    this._initializeMask();
  }

  /** Called when the tool becomes inactive. */
  public deactivate(): void {
    this._clearMaskDisplay();
    this._maskInitialized = false;

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
    if (!this._maskInitialized) return false;

    const localPos = g.mapContainer.toLocal(e.global);
    this._isDrawing = true;
    this._drawAtPosition(localPos.x, localPos.y);
    this._lastDrawPos = new P.Point(localPos.x, localPos.y);
    this._startDrawPos = new P.Point(localPos.x, localPos.y);
    return true;
  }

  public onPointerMove(e: P.FederatedPointerEvent): boolean {
    const mode = selectors.selectMode(store.getState());
    if (mode !== ("paint-zone" as Mode)) return false;
    if (!this._maskInitialized) return false;

    const localPos = g.mapContainer.toLocal(e.global);

    if (this._brushContainer) {
      const { originX, originY } = this.blockOriginWorld(
        localPos.x,
        localPos.y,
      );
      this._brushContainer.position.set(originX, originY);
    }

    if (this._isDrawing) {
      if (this._lastDrawPos) {
        this._drawLine(
          this._lastDrawPos.x,
          this._lastDrawPos.y,
          localPos.x,
          localPos.y,
        );
      } else {
        this._drawAtPosition(localPos.x, localPos.y);
      }

      this._refreshPolygons();

      this._lastDrawPos = new P.Point(localPos.x, localPos.y);
      return true;
    }

    return false;
  }

  public onPointerUp(e: P.FederatedPointerEvent): boolean {
    if (e.button !== 0) return false;
    if (!this._isDrawing) return false;

    const moved =
      this._startDrawPos !== null &&
      !this._startDrawPos.equals(g.mapContainer.toLocal(e.global));
    const wasDrawing = this._isDrawing;
    this._isDrawing = false;
    this._lastDrawPos = null;
    this._startDrawPos = null;

    if (wasDrawing) {
      this._computeAndCommit();
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

  let prevOpts: ZonePaintOpts | null = null;
  subState([(state) => state.mapEditor.toolOptions["paint-zone"]], (opts) => {
    if (!prevOpts || opts.brushSize !== prevOpts.brushSize) {
      tool.setBrushSize(opts.brushSize);
    }
    if (!prevOpts || opts.brushShape !== prevOpts.brushShape) {
      tool.setBrushShape(opts.brushShape);
    }
    if (!prevOpts || opts.mode !== prevOpts.mode) {
      tool.setEraserMode(opts.mode === "erase");
    }
    if (!prevOpts || opts.overlayOpacity !== prevOpts.overlayOpacity) {
      tool.setOverlayOpacity(opts.overlayOpacity);
    }
    if (!prevOpts || opts.simplify !== prevOpts.simplify) {
      tool.setSimplify(opts.simplify);
    }
    if (!prevOpts || opts.showPolygons !== prevOpts.showPolygons) {
      tool.setShowPolygons(opts.showPolygons);
    }
    if (
      tool.lockedZoneType === null &&
      (!prevOpts || opts.zoneType !== prevOpts.zoneType)
    ) {
      tool.setZoneType(opts.zoneType);
    }
    prevOpts = opts;
  });

  return tool;
}
