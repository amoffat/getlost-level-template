import { NpcTemplate } from "@/types/npc";
import { PaletteObjectProps } from "@/types/palette";
import TilesetGroup from "../TilesetGroup";

export function renderNpc({
  scale,
  obj,
  selected,
}: PaletteObjectProps<NpcTemplate>): React.ReactNode | null {
  const tg = obj.animations.Idle.frames[0]!.tg;

  return (
    <div
      data-tsid={obj.tilesetId}
      data-objid={obj.id}
      style={{ display: "contents" }}
      key={`${obj.tilesetId}-${obj.id}`}
    >
      <TilesetGroup scale={scale} group={tg} selected={selected} />
    </div>
  );
}
