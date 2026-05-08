export function requiredName(value: string | undefined): string | null {
  if (!value || value.trim() === "") {
    return "Name cannot be empty";
  }
  return null;
}

export function uniqueName(
  existingNames: Set<string>,
  value: string | undefined,
): string | null {
  if (value && existingNames.has(value.trim())) {
    return "Must be unique";
  }
  return null;
}

export function requiredUniqueName(
  existingNames: Set<string>,
  value: string | undefined,
): string | null {
  const nonEmptyError = requiredName(value);
  if (nonEmptyError) {
    return nonEmptyError;
  }
  return uniqueName(existingNames, value);
}
