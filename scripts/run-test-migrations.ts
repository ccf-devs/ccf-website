import { spawnSync } from "child_process";
import { parseAndValidateTestDatabaseUrl } from "./verify-test-db";

/**
 * Executes Prisma migrations strictly against the verified local test database.
 * Ensures the target is validated as loopback ccf_e2e_test before any Prisma execution.
 */
function main() {
  console.log("[RUN-TEST-MIGRATIONS] Validating test database target before running migrations...");
  const config = parseAndValidateTestDatabaseUrl();

  console.log(`[RUN-TEST-MIGRATIONS] Safety guard confirmed: ${config.database} on ${config.host}:${config.port}`);
  console.log("[RUN-TEST-MIGRATIONS] Executing: npx prisma migrate deploy...");

  const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
    env: {
      ...process.env,
      DATABASE_URL: config.url,
    },
    stdio: "inherit",
    shell: true,
  });

  if (result.status !== 0) {
    console.error(`[RUN-TEST-MIGRATIONS] Migration failed with exit code ${result.status}`);
    process.exit(result.status ?? 1);
  }

  console.log("[RUN-TEST-MIGRATIONS] Migrations applied successfully to local test database.");
}

if (require.main === module) {
  try {
    main();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[RUN-TEST-MIGRATIONS ERROR] ${message}`);
    process.exit(1);
  }
}
