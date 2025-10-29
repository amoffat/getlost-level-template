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
    <div
      data-tsid={obj.tilesetId}
      data-objid={obj.id}
      style={{ display: "contents" }}
      key={`${obj.tilesetId}-${obj.id}`}
    >
      <TilesetGroup
        scale={scale}
        group={obj}
        selected={selected}
        dimmed={dimmed}
      />
    </div>
  );
}
