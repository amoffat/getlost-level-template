export function nonEmptyName(value: string | undefined): string | null {
  if (!value || value.trim() === "") {
    return "Name cannot be empty";
  }
  return null;
}
