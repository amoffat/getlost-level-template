import { PaletteObjectProps } from "@/types/palette";
import { isObjectAnimation } from "@/types/tilegroup";
import TileAnimation from "../TileAnimation";

export function renderObjectAnimation({
  scale,
  obj,
  selected,
  dimmed,
}: PaletteObjectProps): React.ReactNode | null {
  if (!isObjectAnimation(obj)) return null;

  return (
    <TileAnimation
      frames={obj.frames}
      scale={scale}
      selected={selected}
      dimmed={dimmed}
    />
  );
}
