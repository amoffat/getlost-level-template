import { SpatialIndex } from "@/types/spatial";
import { TileGroupTemplate } from "@/types/tilegroup";
import * as P from "pixi.js";

interface Globals {
  app: P.Application;
  canvas: HTMLCanvasElement;
  stage: P.Container;

  /** Main container for the tileset sprite and all interactive overlays. Handles zoom and pan transformations */
  tilesetContainer: P.Container;

  /** Container for rendering z-index indicators on tiles. */
  zIndexOverlay: P.Container;

  /** Container for the visual feedback during group creation/deletion operations (add-group, delete-group, replace-group modes) */
  groupSelContainer: P.Container;

  /** Graphics object that draws the green semi-transparent rectangle showing the area being grouped */
  groupSelGraphics: P.Graphics;

  /** Container that renders outlines around all existing tile groups in the tileset. */
  allGroupsOverlay: P.Container;

  /** Container for the grid overlay (unused in current implementation, grid is added directly to tilesetContainer) */
  gridContainer: P.Container;

  /** Container for the checkerboard background pattern that indicates transparency */
  backgroundContainer: P.Container;

  /** The actual grid display showing tile boundaries, with masked areas where tile groups exist */
  grid: P.Container;

  /** The currently loaded tileset sprite image, if any */
  currentTileset?: P.Sprite;

  /** Debug visualization container showing the current scan position during tileset unpacking operations */
  scanPos: P.Container;

  /** Spatial index for efficient collision detection and object lookup based on tile coordinates */
  spatialIndex: SpatialIndex<TileGroupTemplate>;

  /** Container for rendering selection outlines around selected tile objects. */
  selectionOutlines: P.Container;

  /** Container for the rectangle selection outline during drag-select operations. */
  rectSelectOutline: P.Container;

  /** Graphics object that draws the rectangle selection box during drag-select */
  rectSelect: P.Graphics;

  /** Graphics container for rendering the dimmed overlay outside the valid tileset bounds */
  boundsContainer: P.Graphics;

  /** Mask that defines the valid tileset area (inverse mask applied to boundsContainer) */
  boundsMask: P.Graphics;
}

export const globals: Globals = {} as Globals;
