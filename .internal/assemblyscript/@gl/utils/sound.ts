import { loadSound } from "../api/w2h/sound";

export function loadMusic(name: string, volume: number = 1.0): Promise<number> {
  const assetId = loadSound({
    name,
    loop: true,
    autoplay: false,
    volume,
    sprites: [],
  });
  return assetId;
}
