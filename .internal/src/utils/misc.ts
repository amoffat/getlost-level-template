export interface HasId {
  id: string;
}

export type RequiredButMaybeUndefined<T> = {
  [K in keyof T]-?: T[K] extends undefined ? T[K] : T[K] | undefined;
};
