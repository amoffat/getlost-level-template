import { LogEvent } from "pino";
import { useCallback, useEffect, useState } from "react";
import styles from "../styles/LogPane.module.css";

interface LogMessage {
  msg: string;
  color?: string;
  className: string;
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
  if (event.level.label === "error") {
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
  };
  return msg;
}

const LogPane = () => {
  const [logs, setLogs] = useState<LogMessage[]>([]);

  const addMessage = useCallback((msg: LogMessage) => {
    setLogs((prevLogs) => [msg, ...prevLogs.slice(0, 100)]);
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
      const logListener = (data: unknown) => {
        const msg: LogMessage = {
          msg: data as string,
          className: "error",
        };
        addMessage(msg);
      };
      import.meta.hot.on("gl:wasm-compilation-error", logListener);

      return () => {
        import.meta.hot!.off("gl:wasm-compilation-error", logListener);
      };
    }
  }, [addMessage]);

  const mapMessage = useCallback((msg: LogMessage, i: number) => {
    return (
      <pre
        className={styles[msg.className]}
        key={i}
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
