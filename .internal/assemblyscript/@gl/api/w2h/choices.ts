/**
 * Report that a choice has been made. This will show a toast to the player.
 *
 * @param slug The slug of the choice.
 */
export declare function makeChoice(slug: string): void;

/**
 * Check if a choice has been made. If true, this will show a toast to the
 * player.
 *
 * @param slug The slug of the choice.
 * @returns True if the choice has been made, false otherwise.
 */
export declare function checkChoice(slug: string): boolean;

export const _keep_makeChoice = makeChoice;
export const _keep_checkChoice = checkChoice;
