const VITE_PORT = 5173;
const TWINE_PORT = 5174;
const LEVEL_DIR = "/workspaces/getlost-level-template";

const isCodespace = !!process.env.CODESPACE_NAME;

module.exports = {
  apps: [
    {
      name: "preview",
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
      interpreter: "npx",
      script: isCodespace
        ? `vite --port ${TWINE_PORT}`
        : `vite --host --port ${TWINE_PORT}`,
      cwd: process.env.HOME + "/twinejs",
      restart_delay: 1000,
      env: {
        TWEE_OUTPUT_PATH: `${LEVEL_DIR}/level/story/Level.twee`,
      },
    },
  ],
};
