import {
  Application,
  Container,
  Sprite,
  Texture,
  TilingSprite,
  type FederatedPointerEvent,
  type FederatedWheelEvent,
} from "pixi.js";

let app: Application;
let tilesetContainer: Container;
let gridContainer: Container;
let backgroundContainer: Container;
let checkerboard: TilingSprite | undefined;
let currentSprite: Sprite | undefined;
let currentSpriteBaseWidth = 1;
let currentSpriteBaseHeight = 1;

export const state = {
  gridSize: 16,
};

// Zoom limits for tilesetContainer
const MIN_ZOOM = 0.125;
const MAX_ZOOM = 16;

// Panning state
let isPanning = false;
let panStartGlobal = { x: 0, y: 0 };
let panStartContainer = { x: 0, y: 0 };

export async function init() {
  // Create a new application
  app = new Application();

  // Initialize the application
  await app.init({ backgroundAlpha: 0 });

  // Tweak canvas interaction to avoid browser scroll/selection during drag
  const canvas = app.canvas;
  canvas.style.touchAction = "none";
  canvas.style.userSelect = "none";
  canvas.style.cursor = "default";

  // Background container with checkerboard pattern (conventional transparent-bg look)
  backgroundContainer = new Container();
  app.stage.addChild(backgroundContainer);

  // Foreground container for the tileset sprite
  tilesetContainer = new Container();
  app.stage.addChild(tilesetContainer);

  // Ensure we receive federated events
  app.stage.interactive = true;
  // Route events directly to the stage to avoid per-move hit testing of children
  // (reduces pointermove overhead) and disable child event handling
  app.stage.eventMode = "static";
  // Make sure the stage captures pointer events across the whole viewport
  // and update its hitArea to the current screen when needed
  app.stage.hitArea = app.screen;

  // Overlay container for grid lines (kept separate so clearing tileset doesn't remove grid)
  gridContainer = new Container();
  app.stage.addChild(gridContainer);

  // Build checkerboard background
  createOrUpdateCheckerboard();

  // Keep layout responsive to available size
  app.ticker.add(() => {
    // Resize checkerboard to fill the stage
    if (checkerboard) {
      if (
        checkerboard.width !== app.screen.width ||
        checkerboard.height !== app.screen.height
      ) {
        checkerboard.width = app.screen.width;
        checkerboard.height = app.screen.height;
      }
    }

    // Contain-scale the current sprite using quantized scales (integer up, 1/n down)
    if (
      currentSprite &&
      currentSpriteBaseWidth > 0 &&
      currentSpriteBaseHeight > 0
    ) {
      const scaleW = app.screen.width / currentSpriteBaseWidth;
      const scaleH = app.screen.height / currentSpriteBaseHeight;
      const targetScale = Math.min(scaleW, scaleH);
      const quantized = quantizeScale(targetScale);
      if (Math.abs(currentSprite.scale.x - quantized) > 0.001) {
        currentSprite.scale.set(quantized);
      }
    }
  });

  // Enable mouse wheel zooming on the tileset container
  setupWheelZoom();

  // Enable click-drag panning
  setupPanControls();

  return app;
}

export async function loadTileset(source: File) {
  // Clear any previous content
  tilesetContainer.removeChildren();

  const bitmap = await createImageBitmap(source);
  const texture = Texture.from(bitmap);
  texture.source.scaleMode = "nearest";

  const sprite = new Sprite(texture);
  sprite.x = 0;
  sprite.y = 0;
  sprite.roundPixels = true;

  // Fit the sprite inside the parent (contain) without clipping
  const texW = sprite.texture.width || 1;
  const texH = sprite.texture.height || 1;
  currentSpriteBaseWidth = texW;
  currentSpriteBaseHeight = texH;
  const scaleW = app.screen.width / texW;
  const scaleH = app.screen.height / texH;
  const target = Math.min(scaleW, scaleH);
  const quantized = quantizeScale(target);
  sprite.scale.set(quantized);

  tilesetContainer.addChild(sprite);

  // Track current sprite for responsive resizes
  currentSprite = sprite;

  return sprite;
}

function createOrUpdateCheckerboard() {
  const size = 16; // size of each square
  const canvas = document.createElement("canvas");
  canvas.width = size * 2;
  canvas.height = size * 2;
  const ctx = canvas.getContext("2d")!;

  // Colors for the checker pattern
  const c1 = "#bfbfbf"; // light gray
  const c2 = "#8f8f8f"; // darker gray

  // Draw 2x2 checkerboard
  ctx.fillStyle = c1;
  ctx.fillRect(0, 0, size * 2, size * 2);
  ctx.fillStyle = c2;
  ctx.fillRect(0, 0, size, size);
  ctx.fillRect(size, size, size, size);

  const tex = Texture.from(canvas);

  if (!checkerboard) {
    checkerboard = new TilingSprite({
      texture: tex,
      width: app.screen.width,
      height: app.screen.height,
    });
    backgroundContainer.addChild(checkerboard);
  } else {
    checkerboard.texture = tex;
    checkerboard.width = app.screen.width;
    checkerboard.height = app.screen.height;
  }
  // Keep the stage's hit area in sync with screen size for pointer events
  app.stage.hitArea = app.screen;
}

// Choose integer scales when scaling up, and reciprocal integer fractions when scaling down
function quantizeScale(target: number): number {
  if (!isFinite(target) || target <= 0) return 1;
  if (target >= 1) {
    const n = Math.floor(target);
    return n >= 1 ? n : 1;
  }
  const denom = Math.ceil(1 / target);
  return 1 / Math.max(1, denom);
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function setupWheelZoom() {
  // Use Pixi's federated wheel events on the stage
  app.stage.on("wheel", (e: FederatedWheelEvent) => {
    // Prevent page scroll to make zoom feel native
    e.preventDefault();

    // Determine zoom direction and amount using convenience deltaY
    const zoomFactor = e.deltaY < 0 ? 1.1 : 1 / 1.1;

    // Pointer position in global (world) coords provided by Pixi
    const global = e.global; // { x, y }

    // Convert the pointer position to the container's local coords BEFORE scaling
    const beforeLocal = tilesetContainer.toLocal(global);

    // Apply clamped uniform scaling
    const current = tilesetContainer.scale.x || 1;
    const next = clamp(current * zoomFactor, MIN_ZOOM, MAX_ZOOM);
    tilesetContainer.scale.set(next);

    // Compute where that same local point is AFTER scaling in global coords
    const afterGlobal = tilesetContainer.toGlobal(beforeLocal);

    // Translate so the zoom centers around the pointer
    tilesetContainer.position.x += global.x - afterGlobal.x;
    tilesetContainer.position.y += global.y - afterGlobal.y;
  });
}

function setupPanControls() {
  const canvas = app.canvas as HTMLCanvasElement | undefined;

  app.stage.on("pointerdown", (e: FederatedPointerEvent) => {
    // Only start panning on primary button (left click)
    if (e.button !== 0) return;
    e.preventDefault();
    isPanning = true;
    panStartGlobal = { x: e.global.x, y: e.global.y };
    panStartContainer = {
      x: tilesetContainer.position.x,
      y: tilesetContainer.position.y,
    };
    if (canvas) canvas.style.cursor = "grabbing";
  });

  app.stage.on("pointermove", (e: FederatedPointerEvent) => {
    if (!isPanning) return;
    e.preventDefault();
    const dx = e.global.x - panStartGlobal.x;
    const dy = e.global.y - panStartGlobal.y;
    tilesetContainer.position.set(
      panStartContainer.x + dx,
      panStartContainer.y + dy
    );
  });

  const endPan = (e: FederatedPointerEvent) => {
    if (!isPanning) return;
    e.preventDefault();
    isPanning = false;
    if (canvas) canvas.style.cursor = "default";
  };

  app.stage.on("pointerup", endPan);
  app.stage.on("pointerupoutside", endPan);
  app.stage.on("pointercancel", endPan);
}
