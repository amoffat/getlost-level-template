import { PaletteObjectProps } from "@/types/palette";
import { TileGroupTemplate } from "@/types/tilegroup";
import TilesetGroup from "../TilesetGroup";

export function renderTileGroup({
  scale,
  obj,
  selected,
}: PaletteObjectProps<TileGroupTemplate>): React.ReactNode | null {
  return (
    <div
      data-tsid={obj.tilesetId}
      data-objid={obj.id}
      style={{ display: "contents" }}
      key={`${obj.tilesetId}-${obj.id}`}
    >
      <TilesetGroup scale={scale} group={obj} selected={selected} />
    </div>
  );
}
