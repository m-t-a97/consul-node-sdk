import { defineConfig, UserConfig, UserConfigFn } from "tsdown";

const config: UserConfig | UserConfigFn = defineConfig({
  entry: ["./src/index.ts"],
  dts: true,
});

export default config;
