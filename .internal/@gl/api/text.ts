/**
 * Prepares a dialogue for display. This mainly shows the player an interaction
 * button that they can press, that when pressed, will display the dialogue.
 *
 * @param refId The dialogue to prepare. Find this in the editor.
 * @param stage Whether to prepare or unprepare.
 */
export declare function prepare(refId: string, stage: boolean): void;

/**
 * Displays a dialogue immediately. Use this to trigger dialogue immediately.
 *
 * @param refId The dialogue to display. Find this in the editor.
 */
export declare function display(refId: string): void;
