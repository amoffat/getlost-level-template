export declare function start(
  name: string,
  seconds: f32,
  repeat: boolean,
  userData: i32
): void;
export declare function stop(name: string): void;

export const _keep_start = start;
export const _keep_stop = stop;
