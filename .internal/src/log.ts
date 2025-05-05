import pino from "pino";

export const log = pino({
  browser: {
    transmit: {
      send: (_level, logEvent) => {
        window.top?.postMessage(
          {
            type: "pino-log",
            data: logEvent,
          },
          "*" // TODO: tighten this up?
        );
      },
    },
  },
  level: "debug",
});
