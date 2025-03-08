export declare function change(
  x: i32,
  y: i32,
  layer: string,
  tileset: string,
  id: u32
): void;
export declare function playAnimation(
  x: i32,
  y: i32,
  layer: string,
  tileset: string,
  animName: string
): void;

export const _keep_change = change;
export const _keep_playAnimation = playAnimation;
