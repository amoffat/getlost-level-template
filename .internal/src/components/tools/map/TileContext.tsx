import TilesetGroup from "@/components/TilesetGroup";
import { trackKeyPresses } from "@/editors/common/keypress";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { actions as mapEdActions } from "@/slices/mapEditor";
import { selectors as tsSelectors } from "@/slices/tilesetEditor";
import { TileGroupTemplate, isTileGroupTemplate } from "@/types/tilegroup";
import { Tileset } from "@/types/tileset";
import { Kbd, SimpleGrid } from "@mantine/core";
import { useEffect, useEffectEvent, useMemo, useState } from "react";
import classes from "./TileContext.module.css";

const DEPTH = 2;
const SIZE = DEPTH * 2 + 1; // 5x5 grid

/** Cardinal direction offsets mapped to their WASD label. */
const DIRECTION_MAP: { dx: number; dy: number; label: string }[] = [
  { dx: 0, dy: -1, label: "W" }, // up
  { dx: -1, dy: 0, label: "A" }, // left
  { dx: 0, dy: 1, label: "S" }, // down
  { dx: 1, dy: 0, label: "D" }, // right
];

interface TileContextProps {
  placeObj: TileGroupTemplate;
}

/**
 * Given a tileset and a grid-sized tile, find all grid-sized TileGroupTemplates
 * indexed by their grid column and row.
 */
function buildGridIndex(ts: Tileset): Map<string, TileGroupTemplate> {
  const gs = ts.gridSize;
  const map = new Map<string, TileGroupTemplate>();
  for (const obj of Object.values(ts.tiles.entities)) {
    if (!obj || !isTileGroupTemplate(obj)) continue;
    // Only include grid-sized tiles (exactly one grid cell)
    if (obj.pos.width !== gs || obj.pos.height !== gs) continue;
    const col = Math.round(obj.pos.x / gs);
    const row = Math.round(obj.pos.y / gs);
    map.set(`${col},${row}`, obj);
  }
  return map;
}

export default function TileContext({ placeObj }: TileContextProps) {
  const dispatch = useAppDispatch();
  const tileset = useAppSelector((state) =>
    tsSelectors.selectTileset(state, placeObj.tilesetId),
  );
  const [hovered, setHovered] = useState(false);

  const contextTiles = useMemo(() => {
    if (!tileset) return null;

    // Composite tilesets are excluded
    if (tileset.composite) return null;

    const gs = tileset.gridSize;

    // Tile must be grid-sized
    if (placeObj.pos.width !== gs || placeObj.pos.height !== gs) return null;

    const totalCols = Math.floor(tileset.width / gs);
    const totalRows = Math.floor(tileset.height / gs);

    const col = Math.round(placeObj.pos.x / gs);
    const row = Math.round(placeObj.pos.y / gs);

    const gridIndex = buildGridIndex(tileset);

    const grid: (TileGroupTemplate | null)[][] = [];
    for (let dy = -DEPTH; dy <= DEPTH; dy++) {
      const rowArr: (TileGroupTemplate | null)[] = [];
      for (let dx = -DEPTH; dx <= DEPTH; dx++) {
        const tc = col + dx;
        const tr = row + dy;
        if (tc < 0 || tc >= totalCols || tr < 0 || tr >= totalRows) {
          rowArr.push(null);
        } else {
          rowArr.push(gridIndex.get(`${tc},${tr}`) ?? null);
        }
      }
      grid.push(rowArr);
    }
    return grid;
  }, [tileset, placeObj]);

  // Move selection in a cardinal direction via the context grid
  const moveSelection = useEffectEvent((dx: number, dy: number) => {
    if (!contextTiles) return;
    const targetRow = DEPTH + dy;
    const targetCol = DEPTH + dx;
    const tile = contextTiles[targetRow]?.[targetCol];
    if (tile) {
      dispatch(mapEdActions.setPlace(tile));
    }
  });

  useEffect(() => {
    const makeHandler = (dx: number, dy: number) => (pressed: boolean) => {
      if (pressed) moveSelection(dx, dy);
    };

    const cleanup = trackKeyPresses({
      handlers: {
        w: makeHandler(0, -1),
        ArrowUp: makeHandler(0, -1),
        a: makeHandler(-1, 0),
        ArrowLeft: makeHandler(-1, 0),
        s: makeHandler(0, 1),
        ArrowDown: makeHandler(0, 1),
        d: makeHandler(1, 0),
        ArrowRight: makeHandler(1, 0),
      },
      element: document.documentElement,
    });
    return cleanup;
  }, []);

  // Build a set of "row,col" keys for cells that should show a WASD hint
  const hintMap = useMemo(() => {
    const map = new Map<string, string>(); // "row,col" -> label
    if (!contextTiles) return map;
    for (const { dx, dy, label } of DIRECTION_MAP) {
      const r = DEPTH + dy;
      const c = DEPTH + dx;
      if (contextTiles[r]?.[c]) {
        map.set(`${r},${c}`, label);
      }
    }
    return map;
  }, [contextTiles]);

  if (!contextTiles) return null;

  // Check if there's at least one non-null tile other than the center
  const hasAnyContext = contextTiles.some((row, dy) =>
    row.some((tile, dx) => tile !== null && !(dy === DEPTH && dx === DEPTH)),
  );
  if (!hasAnyContext) return null;

  return (
    <SimpleGrid
      cols={SIZE}
      spacing={1}
      p={0}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {contextTiles.flatMap((row, rowIdx) =>
        row.map((tile, colIdx) => {
          const isCenter = rowIdx === DEPTH && colIdx === DEPTH;
          const hintLabel = hintMap.get(`${rowIdx},${colIdx}`);
          if (!tile) {
            return (
              <div key={`${rowIdx}-${colIdx}`} className={classes.emptyCell} />
            );
          }
          return (
            <div
              key={tile.id}
              className={`${classes.cell} ${isCenter ? classes.centerCell : classes.contextCell}`}
              onClick={
                isCenter
                  ? undefined
                  : () => dispatch(mapEdActions.setPlace(tile))
              }
              title={isCenter ? "Current tile" : "Click to place this tile"}
            >
              <TilesetGroup group={tile} scale={Infinity} bounded />
              {hovered && hintLabel && (
                <Kbd className={classes.keyHint} size="md">
                  {hintLabel}
                </Kbd>
              )}
            </div>
          );
        }),
      )}
    </SimpleGrid>
  );
}
