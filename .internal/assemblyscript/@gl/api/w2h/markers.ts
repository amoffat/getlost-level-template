/**
 * Report a marker. This will show a toast to the player.
 *
 * @param slug The slug of the marker.
 * @param notify Whether to notify the player with a toast.
 */
export declare function record(slug: string, notify: boolean): void;

/**
 * Check if the player has a marker. If true, this will show a toast to the
 * player.
 *
 * @param name The exact name or a regex of the marker to check.
 * @param notify Whether to notify the player with a toast.
 * @returns True if the marker has been made, false otherwise.
 */
export declare function query(name: string, notify: boolean): boolean;

export const _keep_record = record;
export const _keep_query = query;
