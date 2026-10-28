import fs from "fs";
import path from "path";

/**
 * CCF Fail-Closed Test Database Safety Guard
 *
 * Verifies that any test database operation is strictly targeting
 * the dedicated, isolated local PostgreSQL instance (ccf_e2e_test)
 * running on loopback (127.0.0.1 or localhost).
 *
 * Rejection criteria:
 * - Missing or non-existent .env.test.local
 * - Missing or ambiguous DATABASE_URL
 * - Any remote host (e.g. Neon, AWS, remote IP/domain)
 * - Any database name other than 'ccf_e2e_test'
 * - Any exposure of credentials in logs
 */

export interface TestDbConfig {
  host: string;
  port: number;
  database: string;
  sourceFile: string;
  url: string;
}

export function parseAndValidateTestDatabaseUrl(
  envFilePath = path.resolve(process.cwd(), ".env.test.local")
): TestDbConfig {
  if (!fs.existsSync(envFilePath)) {
    throw new Error(
      `[SAFETY GUARD FAILURE] Required test environment file '${envFilePath}' does not exist. Aborting to protect production database.`
    );
  }

  const content = fs.readFileSync(envFilePath, "utf8");
  const match = content.match(/^DATABASE_URL\s*=\s*["']?([^"'\r\n]+)/m);

  if (!match || !match[1]) {
    throw new Error(
      "[SAFETY GUARD FAILURE] DATABASE_URL is not defined in .env.test.local. Aborting."
    );
  }

  const rawUrl = match[1].trim();

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("[SAFETY GUARD FAILURE] DATABASE_URL in .env.test.local is not a valid URL.");
  }

  if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") {
    throw new Error(
      `[SAFETY GUARD FAILURE] Invalid protocol '${parsed.protocol}'. Expected 'postgresql:'.`
    );
  }

  const host = parsed.hostname.toLowerCase();
  const isLoopback =
    host === "localhost" || host === "127.0.0.1" || host === "::1";

  if (!isLoopback) {
    throw new Error(
      `[SAFETY GUARD VIOLATION] Target host '${host}' is NOT a loopback address! Only localhost/127.0.0.1 is permitted for test operations. Aborting immediately.`
    );
  }

  // Database name is pathname without leading slash
  const database = parsed.pathname.replace(/^\//, "");
  if (database !== "ccf_e2e_test") {
    throw new Error(
      `[SAFETY GUARD VIOLATION] Database name is '${database}'. Expected exclusively 'ccf_e2e_test'. Aborting.`
    );
  }

  const port = parseInt(parsed.port || "5432", 10);

  return {
    host,
    port,
    database,
    sourceFile: envFilePath,
    url: rawUrl,
  };
}

export function getValidatedTestDatabaseUrl(
  envFilePath = path.resolve(process.cwd(), ".env.test.local")
): string {
  const config = parseAndValidateTestDatabaseUrl(envFilePath);
  return config.url;
}

if (require.main === module) {
  try {
    const config = parseAndValidateTestDatabaseUrl();
    console.log("[SAFETY GUARD PASS] Local test database configuration positively verified:");
    console.log(`- Source: ${config.sourceFile}`);
    console.log(`- Host: ${config.host} (loopback only)`);
    console.log(`- Port: ${config.port}`);
    console.log(`- Database: ${config.database}`);
    console.log("[SAFETY GUARD PASS] Safe to proceed with local test database operations.");
    process.exit(0);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(message);
    process.exit(1);
  }
}
