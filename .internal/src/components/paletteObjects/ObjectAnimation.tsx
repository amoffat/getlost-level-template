import { AnimationTemplate } from "@/types/animation";
import { PaletteObjectProps } from "@/types/palette";
import TileAnimation from "../TileAnimation";

export function renderObjectAnimation({
  scale,
  obj,
  selected,
}: PaletteObjectProps<AnimationTemplate>): React.ReactNode | null {
  return (
    <div
      data-objid={obj.id}
      data-tsid={obj.frames[0]!.tg.tilesetId}
      style={{ display: "contents" }}
      key={`${obj.id}`}
    >
      <TileAnimation frames={obj.frames} scale={scale} selected={selected} />
    </div>
  );
}
