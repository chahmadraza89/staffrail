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
  },
})
