export function sanitize(value: string): string {
  return (
    value
      .toLowerCase()
      // Replace spaces and non-ASCII characters with dashes
      .replace(/[^\x21-\x7e]/g, "-")
      // Replace any remaining non-alphanumeric/dash characters with dashes
      .replace(/[^a-z0-9-]/g, "-")
      // Replace multiple dashes with a single dash
      .replace(/-+/g, "-")
      // Replace only a dash with nothing
      .replace(/^-$/g, "")
  );
}
