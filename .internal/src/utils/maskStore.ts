/**
 * Module-level storage for collision mask data.
 *
 * Collision masks are stored here keyed by UUID to keep them out of Redux state
 * while still maintaining the ability to serialize/deserialize them with tilesets.
 */
export const collisionMaskStore = new Map<string, Uint8Array>();
