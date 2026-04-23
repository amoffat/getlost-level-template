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

// Matches single-word variables like {name}. ICU-style messages (e.g.
// {count, plural, one {item} other {items}}) are excluded both by the \w+
// pattern (no spaces/commas) and by the top-level brace check below.
const VAR_REGEX = /\{(\w+)\}/g;

export type VariableSegment =
  | { type: "text"; value: string }
  | ({ type: "variable" } & TextVariable);

type VarMatch = { index: number; end: number; key: string };

/**
 * Returns all top-level single-word variable matches in text.
 * Matches nested inside outer braces (e.g. inside ICU plural forms) are skipped.
 */
function findTopLevelVars(text: string): VarMatch[] {
  const results: VarMatch[] = [];
  const regex = new RegExp(VAR_REGEX.source, "g");
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    let depth = 0;
    for (let i = 0; i < match.index; i++) {
      if (text[i] === "{") depth++;
      else if (text[i] === "}") depth--;
    }
    if (depth === 0) {
      results.push({ index: match.index, end: regex.lastIndex, key: match[1] });
    }
  }
  return results;
}

/**
 * Parses a dialogue string into alternating text and variable segments.
 * Variables are denoted by `{variableName}` syntax.
 */
export function parseVariables(text: string): VariableSegment[] {
  const segments: VariableSegment[] = [];
  let lastIndex = 0;

  for (const { index, end, key } of findTopLevelVars(text)) {
    if (index > lastIndex) {
      segments.push({ type: "text", value: text.slice(lastIndex, index) });
    }
    segments.push({ type: "variable", key, known: key in VARIABLE_MAP });
    lastIndex = end;
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", value: text.slice(lastIndex) });
  }

  return segments;
}

/** Returns the unique variable keys found in a string. */
export function extractVariableKeys(text: string): TextVariable[] {
  const keys = new Set<string>();
  for (const { key } of findTopLevelVars(text)) {
    keys.add(key);
  }
  return Array.from(keys).map((key) => ({ key, known: key in VARIABLE_MAP }));
}
