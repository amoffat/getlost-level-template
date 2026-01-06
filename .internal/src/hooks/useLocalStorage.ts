import { useEffect, useState } from "react";

export function useLocalStorage<T>(options: {
  key: string;
  defaultValue: T;
}): [T, (value: T | ((prev: T) => T)) => void] {
  const { key, defaultValue } = options;

  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) {
        return JSON.parse(stored) as T;
      }
    } catch (e) {
      // Ignore localStorage errors (e.g., parsing errors, access denied)
      console.warn(`Error reading localStorage key "${key}":`, e);
    }
    return defaultValue;
  });

  // Sync changes back to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn(`Error writing to localStorage key "${key}":`, e);
    }
  }, [key, value]);

  return [value, setValue];
}
