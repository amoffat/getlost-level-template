/**
 * Displays a sign with a title and a message. A sign is a dialog whose text
 * appears immediately and has no interactions.
 *
 * @param title The title key of the sign.
 * @param msg The message key of the sign.
 */
export declare function displaySign(title: string, msg: string): void;

/**
 * Displays an interaction with a title, message, and choices. An interaction is
 * a dialog whose text appears incrementally and optionally has interactions.
 *
 * @param title The title key of the interaction.
 * @param msg The message key of the interaction.
 * @param choices The choices of the interaction.
 */
export declare function displayInteraction(
  title: string,
  msg: string,
  choices: string[]
): void;

export const _keep_displaySign = displaySign;
export const _keep_displayInteraction = displayInteraction;
