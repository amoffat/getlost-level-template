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
