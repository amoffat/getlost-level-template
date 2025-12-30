import { LogEvent } from "pino";
import type { CSSProperties } from "react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import styles from "../styles/LogPane.module.css";

interface LogMessage {
  msg: string;
  color?: string;
  className: string;
  ts: number;
  key?: number;
  style?: CSSProperties;
}

interface DevMessage {
  dev: boolean;
  color?: string;
}

// Keys to strip from dev messages when formatting for display
const DEV_KEYS = ["dev", "color"] as const;

function isDevMessage(msg: unknown): msg is DevMessage {
  return (msg as DevMessage).dev === true;
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
  let color;
  let found = false;
  if (["error", "warn"].includes(event.level.label)) {
    found = true;
  } else {
    for (const msg of event.messages) {
      if (isDevMessage(msg)) {
        color = msg.color;
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
  };
  if (color) {
    // Precompute style object to avoid new allocations on each render
    msg.style = { color };
  }
  return msg;
}

const LogPane = ({ maxMessages }: { maxMessages: number }) => {
  // Rendered logs state
  const [logs, setLogs] = useState<LogMessage[]>([]);

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
    [scheduleFlush]
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
      event: MessageEvent<{ type: string; data: LogEvent }>
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

  // Memoized line component to avoid rerendering unchanged lines
  const LogLine = memo(({ m }: { m: LogMessage }) => (
    <pre className={styles[m.className]} style={m.style}>
      {m.msg}
    </pre>
  ));

  return (
    <div className={styles.container}>
      {logs.map((m) => (
        <LogLine key={m.key} m={m} />
      ))}
    </div>
  );
};

export default LogPane;
