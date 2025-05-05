const VITE_PORT = 5173;
const TWINE_PORT = 5174;
const fs = require("fs");
const path = require("path");

const WORKSPACE_DIR = fs
  .readdirSync("/workspaces")
  .map((dir) => path.resolve("/workspaces", dir))[0];
const DEVENV_DIR = path.resolve(WORKSPACE_DIR, "_devenv");

const isCodespace = !!process.env.CODESPACE_NAME;

module.exports = {
  apps: [
    {
      name: "preview",
      cwd: DEVENV_DIR,
      interpreter: "npx",
      script: isCodespace
        ? `vite --port ${VITE_PORT}`
        : `vite --host --port ${VITE_PORT}`,
      restart_delay: 1000,
      env: {},
    },
    {
      name: "tiled",
      script: "tiled",
      args: "level/tiled/level.tiled-project",
      stop_exit_codes: [0],
    },
    {
      name: "twine",
      cwd: DEVENV_DIR,
      interpreter: "npx",
      script: isCodespace
        ? `vite --port ${TWINE_PORT}`
        : `vite --host --port ${TWINE_PORT}`,
      cwd: process.env.HOME + "/twinejs",
      restart_delay: 1000,
      env: {
        TWEE_OUTPUT_PATH: `${WORKSPACE_DIR}/level/story/Level.twee`,
      },
    },
  ],
};
