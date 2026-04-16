export type PartialNullable<T> = { [P in keyof T]?: T[P] | undefined | null };
