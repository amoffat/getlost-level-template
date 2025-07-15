/**
 * Displays an interaction with a title, message, and choices.
 *
 * @param title The title key of the interaction.
 * @param msg The message key of the interaction.
 * @param choices The choices of the interaction.
 * @param params The parameters to interpolate.
 * @param animate Whether to animate the interaction.
 */
export declare function display(
  refId: string,
  title: string,
  msg: string,
  choices: string[],
  params: string[],
  animate: bool
): void;

export const _keep_display = display;
