export interface HasId {
  id: string;
}

export type RequiredWithMaybeUndefined<T> = {
  [K in keyof T]-?: T[K] extends undefined ? T[K] : T[K] | undefined;
};
