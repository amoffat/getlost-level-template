/**
 * Create a new timer. When the timer is done, the `timerEvent` function in your
 * level code will be called with the name of the timer and the user data you
 * passed in.
 *
 * @param seconds How many seconds the timer should run for.
 * @param repeat Whether the timer should repeat.
 *
 * @returns The ID of the timer.
 */
export declare function start(seconds: f32, repeat: boolean): u32;

/**
 * Stop a timer.
 *
 * @param id The id of the timer to stop.
 */
export declare function stop(id: u32): void;

export const _keep_start = start;
export const _keep_stop = stop;
