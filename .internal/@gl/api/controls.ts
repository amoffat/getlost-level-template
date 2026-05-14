import type { ButtonWithCallbacks } from "@gl/types/api/controls";

/**
 * Alters the player's UI to display the given button
 *
 * @param button The button to add to the UI
 */
export declare function addButton(button: ButtonWithCallbacks): void;
export declare function removeButton(slug: string): void;
