/**
 * Report a marker. This will show a toast to the player.
 *
 * @param slug The slug of the marker.
 */
export declare function record(slug: string): void;

/**
 * Check if the player has a marker. If true, this will show a toast to the
 * player.
 *
 * @param slug The slug of the marker.
 * @returns True if the marker has been made, false otherwise.
 */
export declare function query(slug: string): boolean;

export const _keep_record = record;
export const _keep_query = query;
