import path from "path";
import { defineConfig } from "vitest/config";

// Dedicated config for unit tests. We intentionally do NOT reuse vite.config.ts,
// which wires dev-server-only plugins (api, level watcher) unneeded for tests.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
