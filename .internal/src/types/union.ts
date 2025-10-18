// Helper utilities to work with unions of object types:
// - UnionKeys<T>: the union of keys across all members of T
// - PropType<T, K>: the union of property types for key K across members of T
type UnionKeys<T> = T extends any ? keyof T : never;
type PropType<T, K extends PropertyKey> = T extends { [P in K]?: infer V }
  ? V
  : never;

// AllPropsLoose<U>
// Produces an object type suitable for "update payloads" when U is a union of
// object types. It has these characteristics:
// - All properties are optional (so partial updates are allowed).
// - Includes Partial<U>, which uses the intersection of keys, ensuring that any
//   concrete U value is assignable to AllPropsLoose<U> without narrowing.
// - Also includes optional properties for any key present in any union member
//   (UnionKeys<U>), with the value type being the union of that property's
//   types across members (PropType<U, K>). This lets callers reference keys that
//   exist only on some variants (e.g., "flipX") in a type-safe, optional way.
export type AllPropsLoose<U> = Partial<U> & {
  [K in UnionKeys<U>]?: PropType<U, K>;
};
