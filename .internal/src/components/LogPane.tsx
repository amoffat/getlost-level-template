import {
  ActionIcon,
  Chip,
  CloseButton,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { IconRegex, IconSearch } from "@tabler/icons-react";
import { LogEvent } from "pino";
import type { CSSProperties } from "react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "../styles/LogPane.module.css";

// Hard-coded list of tag filter chips shown above the log entries. The "all"
// chip is always rendered separately and is not part of this list.
const FILTER_TAGS: string[] = [
  "collision",
  "tileset",
  "state",
  "api",
  "level",
  "time",
  "test",
];

interface LogMessage {
  msg: string;
  color?: string;
  className: string;
  ts: number;
  key?: number;
  style?: CSSProperties;
  tags?: string[];
}

interface DevMessage {
  dev: boolean;
  color?: string;
  tags?: string[];
}

// Keys to strip from dev messages when formatting for display
const DEV_KEYS = ["dev", "color", "tags"] as const;

function isDevMessage(msg: unknown): msg is DevMessage {
  return (msg as DevMessage).dev === true;
}

// Structured record emitted by the @gl test harness (see
// .internal/@gl/tests/harness.ts). Records carry their fields rather than a
// rendered line, so rendering switches on `kind` rather than parsing text.
type TestRecord = { gl: "test"; tags: string[] } & (
  | { kind: "test"; name: string }
  | { kind: "pass"; n: number; description: string }
  | {
      kind: "fail";
      n: number;
      description: string;
      expected?: string;
      actual?: string;
    }
  | { kind: "error"; name: string; error: string }
  | { kind: "summary"; total: number; passed: number; failed: number }
);

// Recognizes a test-harness record. The harness logs the record object and the
// engine's console bridge serializes it structurally, so it arrives as an
// object; the `gl` sentinel makes that a single property read.
function asTestRecord(value: unknown): TestRecord | undefined {
  if (
    value !== null &&
    typeof value === "object" &&
    (value as TestRecord).gl === "test"
  ) {
    return value as TestRecord;
  }
  return;
}

// Maps a test record to a CSS class and display text (icon + message). Rendered
// into a <pre>, so embedded newlines lay out as their own lines.
function classifyTest(record: TestRecord): { className: string; text: string } {
  switch (record.kind) {
    case "test":
      return { className: "testHeader", text: record.name };
    case "pass":
      return { className: "testPass", text: "✅ " + record.description };
    case "fail": {
      let text = "❌ " + record.description;
      if (record.expected !== undefined) {
        text += "\n  expected: " + record.expected;
        text += "\n  actual:   " + record.actual;
      }
      return { className: "testFail", text };
    }
    case "error":
      return {
        className: "testFail",
        text: `❌ unexpected error in "${record.name}"\n  ${record.error}`,
      };
    case "summary":
      return {
        className: "testInfo",
        text: `tests ${record.total}  pass ${record.passed}  fail ${record.failed}`,
      };
  }
}

function formatLogEvent(logEvent: LogEvent) {
  const timestamp = logEvent.ts / 1000;
  const level = logEvent.level.label.toUpperCase();
  // Compact, allocation-friendly stringify that avoids cycles and pretty-printing
  const seen = new WeakSet<object>();
  const safeStringify = (val: unknown): string => {
    try {
      if (typeof val === "string") return val;
      if (val && typeof val === "object") {
        // Remove the dev keys
        if (isDevMessage(val)) {
          const rest = { ...(val as unknown as Record<string, unknown>) };
          for (const key of DEV_KEYS) {
            delete rest[key];
          }
          val = rest;
          if (Object.keys(rest).length === 0) {
            return "";
          }
        }
        return JSON.stringify(val as any, (_key, value) => {
          if (typeof value === "object" && value !== null) {
            if (seen.has(value)) return "[Circular]";
            seen.add(value);
            if (value instanceof Map) {
              return Object.fromEntries(value);
            }
            if (value instanceof Set) {
              return Array.from(value);
            }
          }
          return value;
        }) as string;
      }
      return String(val);
    } catch {
      // Fallback to toString on errors
      try {
        return String(val);
      } catch {
        return "";
      }
    }
  };

  // Build message string with minimal intermediate arrays/strings
  let msgStr = "";
  for (let i = 0; i < logEvent.messages.length; i++) {
    const part = logEvent.messages[i];
    if (msgStr) msgStr += " ";
    msgStr += safeStringify(part);
  }

  if (logEvent.bindings.length > 0) {
    msgStr += " ";
    for (let i = 0; i < logEvent.bindings.length; i++) {
      if (i > 0) msgStr += ", ";
      // Bindings are typically small/simple objects
      msgStr += safeStringify(logEvent.bindings[i]);
    }
  }

  return `[${timestamp.toFixed(2)}] ${level}: ${msgStr}`;
}

function parseMessage(event: LogEvent): LogMessage | undefined {
  // Test-harness records get bespoke rendering (icons + colors) and bypass the
  // "[ts] LEVEL: <json>" formatting entirely.
  for (const raw of event.messages) {
    const record = asTestRecord(raw);
    if (record) {
      const { className, text } = classifyTest(record);
      return { msg: text, className, ts: event.ts, tags: record.tags };
    }
  }

  let color;
  let tags;
  let found = false;
  if (["error", "warn"].includes(event.level.label)) {
    found = true;
  } else {
    for (const msg of event.messages) {
      if (isDevMessage(msg)) {
        color = msg.color;
        tags = msg.tags;
        found = true;
        break;
      }
    }
  }

  if (!found) {
    return;
  }

  const msg: LogMessage = {
    msg: formatLogEvent(event),
    color,
    className: event.level.label.toLowerCase(),
    ts: event.ts,
    tags,
  };
  if (color) {
    // Precompute style object to avoid new allocations on each render
    msg.style = { color };
  }
  return msg;
}

// Memoized line component. Must stay at module scope: defined inside LogPane it
// would get a fresh identity every render, remounting every visible line.
const LogLine = memo(({ m }: { m: LogMessage }) => (
  <pre className={styles[m.className]} style={m.style}>
    {m.msg}
  </pre>
));

const LogPane = ({ maxMessages }: { maxMessages: number }) => {
  // Rendered logs state
  const [logs, setLogs] = useState<LogMessage[]>([]);

  // Active tag filters: the set of currently-checked tag chips. A tagged
  // message is shown when any of its tags is active (OR semantics); messages
  // without tags (errors, warnings, watcher logs) are always shown. The "all"
  // chip is a convenience toggle that checks/unchecks every tag chip, so it is
  // "on" exactly when every tag is active. Every tag is active by default.
  const [activeTags, setActiveTags] = useState<string[]>(() => [
    ...FILTER_TAGS,
  ]);

  const toggleTag = useCallback((tag: string) => {
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }, []);

  // Free-text filter applied on top of the tag filter. Matches against the
  // serialized message string (which already contains logged object keys and
  // values). Supports plain substring and regex modes.
  const [search, setSearch] = useState("");
  const [regexMode, setRegexMode] = useState(false);

  const { match, searchError } = useMemo(() => {
    const query = search.trim();
    if (!query) {
      return {
        match: null as ((m: LogMessage) => boolean) | null,
        searchError: false,
      };
    }
    if (regexMode) {
      try {
        const re = new RegExp(query, "i");
        return { match: (m: LogMessage) => re.test(m.msg), searchError: false };
      } catch {
        // Incomplete/invalid regex (e.g. mid-typing): don't filter, flag error.
        return { match: null, searchError: true };
      }
    }
    const lower = query.toLowerCase();
    return {
      match: (m: LogMessage) => m.msg.toLowerCase().includes(lower),
      searchError: false,
    };
  }, [search, regexMode]);

  // Internal refs for high-frequency updates without per-message array copies
  const logsRef = useRef<LogMessage[]>([]); // source of truth
  const pendingRef = useRef<LogMessage[]>([]); // batch buffer
  const rafIdRef = useRef<number | null>(null); // rAF scheduler
  const maxRef = useRef<number>(maxMessages);
  const keyCounterRef = useRef<number>(1);

  const flush = useCallback(() => {
    rafIdRef.current = null;
    const max = maxRef.current;
    const pending = pendingRef.current;

    if (pending.length === 0 && logsRef.current.length <= max) {
      return; // nothing to do
    }

    // Consume pending in one go to minimize allocations
    pendingRef.current = [];

    if (pending.length > 0) {
      // Build the new list with at most one allocation
      const existing = logsRef.current;
      const resultSize = Math.min(max, pending.length + existing.length);
      const result = new Array<LogMessage>(resultSize);

      // Insert pending in reverse (newest first)
      let idx = 0;
      for (let i = pending.length - 1; i >= 0 && idx < max; i--) {
        result[idx++] = pending[i];
      }

      // Append as much of existing as fits
      const tailLen = Math.min(max - idx, existing.length);
      for (let j = 0; j < tailLen; j++) {
        result[idx + j] = existing[j];
      }

      logsRef.current = result;
    } else if (logsRef.current.length > max) {
      // No new items, just trim in place to avoid new array
      logsRef.current.length = max;
    }

    // Publish a new array reference to trigger re-render
    setLogs(logsRef.current);
  }, []);

  // Keep latest max in a ref and trim on change lazily via flush
  useEffect(() => {
    maxRef.current = maxMessages;
    if (logsRef.current.length > maxMessages) {
      // Schedule a trim if we're over the new limit
      if (rafIdRef.current == null) {
        rafIdRef.current = requestAnimationFrame(() => flush());
      }
    }
  }, [maxMessages, flush]);

  const scheduleFlush = useCallback(() => {
    if (rafIdRef.current != null) return;
    rafIdRef.current = requestAnimationFrame(() => flush());
  }, [flush]);

  // Public API used by emitters: push to buffer and schedule a single rAF flush
  const addMessage = useCallback(
    (msg: LogMessage) => {
      if (msg.key == null) {
        msg.key = keyCounterRef.current++;
      }
      pendingRef.current.push(msg);
      scheduleFlush();
    },
    [scheduleFlush],
  );

  // Cleanup any scheduled flush on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current != null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, []);

  // This connects our log pane to the pino logs from the iframe
  useEffect(() => {
    const logListener = (
      event: MessageEvent<{ type: string; data: LogEvent }>,
    ) => {
      const envelope = event.data;
      if (envelope.type !== "pino-log") {
        return;
      }
      const msg = parseMessage(envelope.data);
      if (msg) {
        addMessage(msg);
      }
    };

    window.addEventListener("message", logListener);

    return () => {
      window.removeEventListener("message", logListener);
    };
  }, [addMessage]);

  // This connects our log pane to a custom event emitted from our Vite rollup
  // bundler plugin
  useEffect(() => {
    if (import.meta.hot) {
      import.meta.hot.on("gl:log", addMessage);

      return () => {
        import.meta.hot!.off("gl:log", addMessage);
      };
    }
  }, [addMessage]);

  // "all" selected -> everything, including untagged entries.
  // Otherwise -> only entries with a tag matching an active chip (OR). Untagged
  // entries are shown only when "all" is selected, so no selection shows
  // nothing.
  const allSelected = activeTags.length === FILTER_TAGS.length;
  const tagVisible = allSelected
    ? logs
    : logs.filter((m) => m.tags?.some((t) => activeTags.includes(t)));
  const visible = match ? tagVisible.filter(match) : tagVisible;

  return (
    <div className={styles.container}>
      <div className={styles.filterBar}>
        <Chip
          radius="xs"
          variant="outline"
          size="xs"
          checked={allSelected}
          onChange={() => setActiveTags(allSelected ? [] : [...FILTER_TAGS])}
        >
          all
        </Chip>
        {FILTER_TAGS.map((tag) => (
          <Chip
            radius="xs"
            variant="outline"
            size="xs"
            key={tag}
            checked={activeTags.includes(tag)}
            onChange={() => toggleTag(tag)}
          >
            {tag}
          </Chip>
        ))}
        <div className={styles.search}>
          <Tooltip label="Regex" withArrow>
            <ActionIcon
              variant={regexMode ? "filled" : "subtle"}
              size="sm"
              aria-label="Toggle regex search"
              onClick={() => setRegexMode((v) => !v)}
            >
              <IconRegex size={16} />
            </ActionIcon>
          </Tooltip>
          <TextInput
            size="xs"
            inputSize="50"
            placeholder="Search..."
            leftSection={<IconSearch size={14} />}
            value={search}
            error={searchError}
            onChange={(e) => setSearch(e.currentTarget.value)}
            rightSection={
              search ? (
                <CloseButton size="sm" onClick={() => setSearch("")} />
              ) : null
            }
          />
        </div>
      </div>
      <div className={styles.logScroll}>
        {visible.map((m) => (
          <LogLine key={m.key} m={m} />
        ))}
      </div>
    </div>
  );
};

export default LogPane;
