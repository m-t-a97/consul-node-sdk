import { defineConfig } from "vitest/config";
import type { ViteUserConfig } from "vitest/config";

const config: ViteUserConfig = defineConfig({
  test: {
    globals: true,
    passWithNoTests: true,
    environment: "node",
    root: "./",
    dir: "./tests",
    reporters: ["verbose"],
    coverage: {
      provider: "v8",
      reportsDirectory: "./tests/coverage",
    },
  },
  server: {
    host: "0.0.0.0",
  },
});

export default config;
