import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}", "tests/**/*.test.ts"],
    globals: true,
    setupFiles: ["./src/testSetup.ts"],
    testTimeout: 15000,
    hookTimeout: 15000,
    clearMocks: true,
    mockReset: true,
    restoreMocks: true,
  },
});
