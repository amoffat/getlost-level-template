import { useEffect, useRef, useState } from "react";
import styles from "./DevInput.module.css";

// Helper to get all callable paths on window.gl (e.g., markers.record)
function getGLFunctionPaths(obj: any, prefix: string | null = null): string[] {
  if (!obj || typeof obj !== "object") return [];
  let paths: string[] = [];
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof val === "function") {
      paths.push(path);
    } else if (val && typeof val === "object") {
      paths = paths.concat(getGLFunctionPaths(val, path));
    }
  }
  return paths;
}

export default function DevInput() {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [_, setHistoryIndex] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [output, setOutput] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  // Autocomplete suggestions
  useEffect(() => {
    if (!window.gl) return setSuggestions([]);
    if (!input.trim()) return setSuggestions([]);
    const allFns = getGLFunctionPaths(window.gl);
    setSuggestions(allFns.filter((fn) => fn.startsWith(input.trim())));
  }, [input]);

  // Handle input execution
  function handleExec(cmd: string) {
    setHistory((h) => [...h, cmd]);
    setHistoryIndex(null);
    setOutput("");
    try {
      let fn = new Function(`return gl.${cmd}`);
      let result = fn();

      // They meant to call it
      if (typeof result === "function") {
        fn = new Function(`return gl.${cmd}()`);
        result = fn();
      }

      if (result instanceof Promise) {
        result
          .then((r: any) => setOutput(JSON.stringify(r)))
          .catch((e: any) => setOutput(String(e)));
      } else {
        setOutput(JSON.stringify(result));
      }
    } catch (e: any) {
      setOutput(e.message || String(e));
    }
    setInput("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      if (input.trim()) {
        handleExec(input.trim());
      }
    } else if (e.key === "Tab") {
      e.preventDefault();
      if (suggestions.length > 0) {
        setInput(suggestions[0]);
      }
    } else if (e.key === "ArrowUp") {
      if (history.length) {
        setHistoryIndex((idx) => {
          const newIdx =
            idx === null ? history.length - 1 : Math.max(0, idx - 1);
          setInput(history[newIdx]);
          return newIdx;
        });
      }
    } else if (e.key === "ArrowDown") {
      if (history.length) {
        setHistoryIndex((idx) => {
          if (idx === null) return null;
          const newIdx = Math.min(history.length - 1, idx + 1);
          setInput(history[newIdx] || "");
          return newIdx === history.length ? null : newIdx;
        });
      }
    }
  }

  return (
    <div className={styles.devInputRoot}>
      <div className={styles.inputRow}>
        <span className={styles.prompt}>&gt;</span>
        <input
          ref={inputRef}
          className={styles.inputField}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          autoComplete="off"
          placeholder="Developer Console"
        />
      </div>
      {suggestions.length > 0 && (
        <div className={styles.suggestions}>
          {suggestions.slice(0, 5).map((s) => (
            <div className={styles.suggestionItem} key={s}>
              {s}
            </div>
          ))}
        </div>
      )}
      {output && (
        <div
          className={
            output.startsWith("Error")
              ? styles.outputError
              : styles.outputSuccess
          }
        >
          {output}
        </div>
      )}
    </div>
  );
}
