import { defineConfig, UserConfig, UserConfigFn } from "tsdown";

const config: UserConfig | UserConfigFn = defineConfig({
  entry: ["./src/index.ts"],
  platform: "node",
  dts: true,
  format: ["esm", "cjs"],
  unused: {
    level: "error",
    ignore: [
      "typescript", // Yarn PnP
    ],
  },
  exports: true,
  onSuccess() {
    console.info("🎉 Build succeeded!");
  },
});

export default config;
