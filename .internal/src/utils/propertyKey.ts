/**
 * Utility functions for creating stable property keys for React memo optimization.
 * These functions help prevent unnecessary re-renders when unrelated properties
 * (like position) change on map objects.
 */

/**
 * Creates a stable key based only on the specified properties of an array of objects.
 * This prevents re-renders when unrelated properties (like position) change.
 *
 * @param objs - Array of objects to create a key from
 * @param props - Array of property names to include in the key
 * @returns A string key that uniquely identifies the objects based on the specified properties
 */
export function createPropertyKey<T, K extends keyof T>(
  objs: T[],
  props: readonly K[]
): string {
  return objs
    .map((obj) => {
      const parts: string[] = [];
      for (const prop of props) {
        const val = obj[prop];
        // Handle array values (like tags, exitIds)
        parts.push(Array.isArray(val) ? val.join(",") : String(val));
      }
      return parts.join("|");
    })
    .join("~");
}

/**
 * Creates a custom comparison function for React.memo that only compares
 * specified properties of objects in the `objs` prop.
 *
 * @param props - Array of property names to compare
 * @returns A comparison function suitable for React.memo's second argument
 */
export function createPropsEqualFn<T>(
  props: readonly (keyof T)[]
): (prevProps: { objs: T[] }, nextProps: { objs: T[] }) => boolean {
  return (prevProps, nextProps) =>
    createPropertyKey(prevProps.objs, props) ===
    createPropertyKey(nextProps.objs, props);
}
