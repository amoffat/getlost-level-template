/**
 * Hardcoded map of supported dialogue variable substitution keys.
 * Key: variable name (without braces), Value: human-readable description shown in tooltip.
 */
const VARIABLE_MAP: Record<string, string> = {
  name: "The player's name.",
};

export function getDescription(key: string): string {
  return VARIABLE_MAP[key] ?? "User provided variable (set in level code)";
}

export type TextVariable = { key: string; known: boolean };

export type VariableSegment =
  | { type: "text"; value: string }
  | ({ type: "variable" } & TextVariable);

/**
 * Parses a dialogue string into alternating text and variable segments.
 * Variables are denoted by `{variableName}` syntax.
 */
export function parseVariables(text: string): VariableSegment[] {
  const segments: VariableSegment[] = [];
  const regex = /\{([^{}]+)\}/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: "text",
        value: text.slice(lastIndex, match.index),
      });
    }
    const key = match[1];
    segments.push({
      type: "variable",
      key,
      known: key in VARIABLE_MAP,
    });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", value: text.slice(lastIndex) });
  }

  return segments;
}

/** Returns the unique variable keys found in a string. */
export function extractVariableKeys(text: string): TextVariable[] {
  const keys = new Set<string>();
  const regex = /\{([^{}]+)\}/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    keys.add(match[1]);
  }

  return Array.from(keys).map((key) => ({ key, known: key in VARIABLE_MAP }));
}
