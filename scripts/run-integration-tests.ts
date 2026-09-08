import { spawnSync } from "node:child_process";

const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const result = spawnSync(command, ["exec", "vitest", "run", "src/features/integration.test.ts"], {
  env: { ...process.env, RUN_DB_INTEGRATION_TESTS: "true" },
  shell: process.platform === "win32",
  stdio: "inherit",
});

process.exit(result.status ?? 1);
