/**
 * Logs a message to the console. Like `console.log`.
 *
 * @param message The message to log.
 */
export declare function log(message: string): void;
export declare function logError(message: string): void;
export declare function logWarning(message: string): void;

export const _keep_log = log;
export const _keep_logError = logError;
export const _keep_logWarning = logWarning;
