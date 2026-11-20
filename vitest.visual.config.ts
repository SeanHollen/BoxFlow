import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/visual/**/*.visual.ts"],
    testTimeout: 120_000,
  },
});
