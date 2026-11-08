import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

// Evals call the real model, so they need a provider key from .env.local.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "node",
    include: ["evals/**/*.eval.ts"],
    env: loadEnv("development", process.cwd(), ""),
    testTimeout: 120_000,
    maxConcurrency: 2,
  },
});
