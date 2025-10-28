import { PaletteObjectProps } from "@/types/palette";
import { isTileGroup } from "@/types/tilegroup";
import TilesetGroup from "../TilesetGroup";

export function renderTileGroup({
  scale,
  obj,
  selected,
  dimmed,
}: PaletteObjectProps): React.ReactNode | null {
  if (!isTileGroup(obj)) return null;

  return (
    <TilesetGroup
      scale={scale}
      key={`${obj.tilesetId}-${obj.id}`}
      group={obj}
      selected={selected}
      dimmed={dimmed}
    />
  );
}
