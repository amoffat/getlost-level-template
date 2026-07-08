import TilesetGroup from "@/components/TilesetGroup";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { actions as mapEdActions } from "@/slices/mapEditor";
import { selectors as tsSelectors } from "@/slices/tilesetEditor";
import { TileGroupTemplate, isTileGroupTemplate } from "@/types/tilegroup";
import { Tileset } from "@/types/tileset";
import { trackKeyPresses } from "@/utils/keypress";
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
    tsSelectors.selectTileset(
      state,
      state.tilesetEditor.objIdToTs[placeObj.id],
    ),
  );
  const [hovered, setHovered] = useState(false);

  const gridData = useMemo(() => {
    if (!tileset) return null;
    if (tileset.composite) return null;
    const gs = tileset.gridSize;
    if (placeObj.pos.width !== gs || placeObj.pos.height !== gs) return null;
    return {
      gs,
      totalCols: Math.floor(tileset.width / gs),
      totalRows: Math.floor(tileset.height / gs),
      col: Math.round(placeObj.pos.x / gs),
      row: Math.round(placeObj.pos.y / gs),
      gridIndex: buildGridIndex(tileset),
    };
  }, [tileset, placeObj]);

  const contextTiles = useMemo(() => {
    if (!gridData) return null;
    const { totalCols, totalRows, col, row, gridIndex } = gridData;
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
  }, [gridData]);

  // Move selection in a cardinal direction, skipping over empty cells.
  const moveSelection = useEffectEvent((dx: number, dy: number) => {
    if (!gridData) return;
    const { totalCols, totalRows, col, row, gridIndex } = gridData;
    let tc = col + dx;
    let tr = row + dy;
    while (tc >= 0 && tc < totalCols && tr >= 0 && tr < totalRows) {
      const tile = gridIndex.get(`${tc},${tr}`);
      if (tile) {
        dispatch(mapEdActions.setPlace(tile));
        return;
      }
      tc += dx;
      tr += dy;
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

  // Build a set of "row,col" keys for cells that should show a WASD hint.
  // A hint is shown whenever any tile exists in that direction, even if the
  // immediate neighbor cell is empty.
  const hintMap = useMemo(() => {
    const map = new Map<string, string>(); // "row,col" -> label
    if (!gridData) return map;
    const { totalCols, totalRows, col, row, gridIndex } = gridData;
    for (const { dx, dy, label } of DIRECTION_MAP) {
      let tc = col + dx;
      let tr = row + dy;
      while (tc >= 0 && tc < totalCols && tr >= 0 && tr < totalRows) {
        if (gridIndex.has(`${tc},${tr}`)) {
          map.set(`${DEPTH + dy},${DEPTH + dx}`, label);
          break;
        }
        tc += dx;
        tr += dy;
      }
    }
    return map;
  }, [gridData]);

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
              <div key={`${rowIdx}-${colIdx}`} className={classes.emptyCell}>
                {hovered && hintLabel && (
                  <Kbd className={classes.keyHint} size="md">
                    {hintLabel}
                  </Kbd>
                )}
              </div>
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
              {/* `bounded` fits the tile to its responsive grid cell; the
                  scale is just an upscale cap (cells stay well under 8× a
                  16px tile), so this fills the cell like auto-fit did. */}
              <TilesetGroup group={tile} scale={8} bounded />
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
