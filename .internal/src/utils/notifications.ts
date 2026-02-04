import type { NotificationData } from "@mantine/notifications";
import { notifications } from "@mantine/notifications";

// Map to track last notification timestamp by key
const lastNotificationTime = new Map<string, number>();

// Default throttle delay in milliseconds
const DEFAULT_THROTTLE_DELAY = 1000;

export interface ShowNotificationOptions extends NotificationData {
  /**
   * Optional key for throttling notifications.
   * If specified, notifications with the same key will be throttled.
   */
  key?: string;
  /**
   * Throttle delay in milliseconds. Defaults to 1000ms.
   * Only applies when a key is specified.
   */
  throttleDelay?: number;
}

/**
 * Show a notification with optional throttling.
 *
 * @param options - All Mantine notification options plus optional key and
 * throttleDelay
 *
 * @example
 * // Regular notification without throttling
 * showNotification({ message: "Hello", title: "Info" });
 *
 * @example
 * // Throttled notification - first shows immediately, subsequent ones suppressed for 300ms
 * showNotification({ message: "Saving...", title: "Progress", key: "save-progress" });
 *
 * @example
 * // Throttled with custom delay
 * showNotification({
 *   message: "Error occurred",
 *   title: "Error",
 *   key: "validation-error",
 *   throttleDelay: 500
 * });
 */
export function showNotification(options: ShowNotificationOptions): void {
  const {
    key,
    throttleDelay = DEFAULT_THROTTLE_DELAY,
    ...notificationOptions
  } = options;

  // If no key is provided, show immediately without throttling
  if (!key) {
    notifications.show(notificationOptions);
    return;
  }

  const now = Date.now();
  const lastTime = lastNotificationTime.get(key);

  // If this key hasn't been shown recently, show it now
  if (!lastTime || now - lastTime >= throttleDelay) {
    notifications.show(notificationOptions);
    lastNotificationTime.set(key, now);
  }
  // Otherwise, suppress this notification (throttled)
}

/**
 * Clear all throttle state.
 * After calling this, all keys will be able to show notifications immediately.
 */
export function clearAllThrottled(): void {
  lastNotificationTime.clear();
}

/**
 * Clear throttle state for a specific key.
 * After calling this, the key will be able to show a notification immediately.
 *
 * @param key - The notification key to clear
 */
export function clearThrottled(key: string): void {
  lastNotificationTime.delete(key);
}
