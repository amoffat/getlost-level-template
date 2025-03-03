import pino from "pino";

export const log = pino({
  browser: {
    asObject: true, // logs in a structured format
  },
  level: "debug", // set log level
});
