import { loadSound } from "../api/w2h/sound";

export function loadMusic(name: string, volume: f32 = 1.0): i32 {
  const assetId = loadSound({
    name,
    loop: true,
    autoplay: false,
    volume,
    sprites: [],
  });
  return assetId;
}
