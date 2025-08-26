import { LogEvent } from "pino";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "../styles/LogPane.module.css";

interface LogMessage {
  msg: string;
  color?: string;
  className: string;
  ts: number;
  key: string;
}

interface DevMessage {
  dev: boolean;
  color?: string;
}

function isDevMessage(msg: unknown): msg is DevMessage {
  return (msg as DevMessage).dev === true;
}

function formatLogEvent(logEvent: LogEvent) {
  const timestamp = logEvent.ts / 1000;
  const level = logEvent.level.label.toUpperCase();

  // Flatten messages array
  const messages = logEvent.messages
    .filter((msg) => !isDevMessage(msg))
    .map((msg) =>
      typeof msg === "object" ? JSON.stringify(msg, null, 2) : msg
    )
    .join(" ");

  // Flatten bindings array
  const bindings =
    logEvent.bindings.length > 0
      ? ` ${logEvent.bindings.map((b) => JSON.stringify(b)).join(", ")}`
      : "";

  return `[${timestamp.toFixed(2)}] ${level}: ${messages}${bindings}`;
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

  const msg = {
    msg: formatLogEvent(event),
    color,
    className: event.level.label.toLowerCase(),
    ts: event.ts,
    key: `${event.ts}-${Math.random()}`,
  };
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
      // Newest should appear first. We collected in arrival order, so reverse.
      const newestFirst = pending.slice().reverse();

      // Determine how many from the existing list we can retain
      const remaining = Math.max(0, max - newestFirst.length);
      const tail = remaining > 0 ? logsRef.current.slice(0, remaining) : [];

      // Build the new list once per frame
      logsRef.current = newestFirst.concat(tail);
    } else if (logsRef.current.length > max) {
      // No new items, just trim if needed
      logsRef.current = logsRef.current.slice(0, max);
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

  // This connects our log pane to a custom event emitted from our Vite WASM
  // plugin
  useEffect(() => {
    if (import.meta.hot) {
      import.meta.hot.on("gl:wasm-compiler", addMessage);

      return () => {
        import.meta.hot!.off("gl:wasm-compiler", addMessage);
      };
    }
  }, [addMessage]);

  const mapMessage = useCallback((msg: LogMessage) => {
    return (
      <pre
        className={styles[msg.className]}
        key={msg.key}
        style={{ color: msg.color }}
      >
        {msg.msg}
      </pre>
    );
  }, []);
  const messages = logs.map(mapMessage);

  return <div className={styles.container}>{messages}</div>;
};

export default LogPane;
