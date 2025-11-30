import { useToggle } from "@mantine/hooks";
import { useCallback, useEffect, useRef } from "react";

/**
 * A toggle hook that persists its state to localStorage.
 * Acts like useToggle but automatically syncs with localStorage.
 *
 * @param key - The localStorage key to use for persistence
 * @param defaultValue - The default value if nothing is stored (defaults to false)
 * @returns A tuple of [value, toggle] where toggle switches between true/false
 */
export function useLocalStorageToggle(
  key: string,
  defaultValue: boolean = false
): readonly [boolean, () => void] {
  // Initialize from localStorage
  const initialValue = localStorage.getItem(key) === "true";
  const hasStoredValue = localStorage.getItem(key) !== null;
  const [value, toggle] = useToggle([
    hasStoredValue ? initialValue : defaultValue,
    hasStoredValue ? !initialValue : !defaultValue,
  ] as const);

  // Track if this is the initial mount to avoid unnecessary localStorage writes
  const isInitialMount = useRef(true);

  // Sync to localStorage whenever value changes (except on initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    localStorage.setItem(key, value.toString());
  }, [key, value]);

  // Wrap toggle to ensure we always return the same function reference
  const wrappedToggle = useCallback(() => {
    toggle();
  }, [toggle]);

  return [value, wrappedToggle] as const;
}
