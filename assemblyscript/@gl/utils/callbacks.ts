// A helper that allows you to add and remove listeners from an array of

import { VoidFunction } from "../types/void";

// callbacks.
export function addListener<T extends Function>(
  callbacks: T[],
  callback: T
): VoidFunction {
  callbacks.push(callback);
  return () => {
    const index = callbacks.indexOf(callback);
    if (index !== -1) {
      callbacks.splice(index, 1);
    }
  };
}
