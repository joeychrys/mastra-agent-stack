import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
  },
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ["react", "@assistant-ui/react", "@tanstack/react-query", "assistant-stream"],
  banner: {
    js: '"use client";',
  },
});
