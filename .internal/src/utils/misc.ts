export interface HasId {
  id: string;
}

/**
 * A utility type that makes all properties of T required, but still allows them
 * to have an explicit value of undefined. This is used for props of map object
 * instances, where undefined means "use the template value", but we still want
 * to allow explicitly setting a property to undefined to override the template.
 */
export type RequiredButMaybeUndefined<T> = {
  // [K in keyof T]: Iterate over all keys in type T
  // -?: Remove optional modifier (makes all properties required)
  // T[K] extends undefined: Check if the property type is exactly undefined
  // ? T[K]: If yes, keep it as undefined
  // : T[K] | undefined: If no, make it the original type OR undefined
  [K in keyof T]-?: T[K] extends undefined ? T[K] : T[K] | undefined;
};

/**
 * Fills in any missing properties on `target` using values from `defaults`.
 * Only keys absent from `target` are filled in; existing values are preserved.
 * Array and object defaults are cloned to avoid shared references between objects.
 */
export function applyDefaultProps<T extends object>(
  target: T,
  defaults: T,
): void {
  for (const key of Object.keys(defaults) as (keyof T)[]) {
    if (!Object.prototype.hasOwnProperty.call(target, key)) {
      const val = defaults[key];
      (target as Record<keyof T, unknown>)[key] =
        val !== null && typeof val === "object" ? structuredClone(val) : val;
    }
  }
}
