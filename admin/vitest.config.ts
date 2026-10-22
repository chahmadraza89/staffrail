import { defineConfig } from "vitest/config"
import path from "node:path"

/**
 * Unit tests for StaffRail Admin auth logic.
 *
 * The `server-only` package intentionally throws outside React Server
 * Components — alias it to a no-op shim so Node tests can import the same
 * modules the Next.js server uses.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@/": path.resolve(__dirname, "./src") + "/",
      "server-only": path.resolve(__dirname, "./src/test-shims/empty.ts"),
    },
  },
  test: {
    environment: "node",
    // Component/hook tests opt into jsdom per-file via
    // `// @vitest-environment jsdom`.
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    setupFiles: ["src/test-shims/vitest.setup.ts"],
    // Radix dialogs + jsdom are slow on CI-class machines; individual tests
    // can take several seconds even though they never wait on real network.
    testTimeout: 15_000,
    hookTimeout: 15_000,
    // Keep peak memory bounded: several jsdom suites in parallel exhaust the
    // Windows fork pool (workers exit mid-run).
    maxWorkers: 2,
  },
})
