/// <reference types="vitest/config" />
import { defineConfig } from "vite";

export default defineConfig({
  // base is overridden for GitHub Pages in Task 15
  base: "./",
  test: {
    environment: "jsdom",
  },
});
