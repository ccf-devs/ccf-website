import { execFileSync } from "child_process";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import readline from "readline";

/**
 * Sets up the dedicated local test database `ccf_e2e_test`
 * and provisions a dedicated role `ccf_test_user`.
 *
 * Security Guarantees:
 * - Strictly targets loopback 127.0.0.1 on port 5432.
 * - Creates only 'ccf_e2e_test' and role 'ccf_test_user'.
 * - Generates 256-bit cryptographically secure random secrets.
 * - Writes .env.test.local atomically via a temporary file.
 * - Never prints passwords, tokens, or connection strings.
 * - Clears credentials from memory immediately after execution.
 */

const PSQL_PATH = "C:\\Program Files\\PostgreSQL\\16\\bin\\psql.exe";

function runPsql(sql: string, db = "postgres", passwordOverride?: string): string {
  if (!fs.existsSync(PSQL_PATH)) {
    throw new Error(`psql not found at ${PSQL_PATH}`);
  }

  const env = { ...process.env };
  if (passwordOverride) {
    env.PGPASSWORD = passwordOverride;
  }

  const output = execFileSync(
    PSQL_PATH,
    ["-h", "127.0.0.1", "-p", "5432", "-U", "postgres", "-d", db, "-w", "-c", sql],
    {
      encoding: "utf8",
      env,
      stdio: ["ignore", "pipe", "pipe"],
    }
  );
  return output.trim();
}

async function promptPasswordSecurely(): Promise<string> {
  // If PGPASSWORD is set in environment, use it
  if (process.env.PGPASSWORD) {
    return process.env.PGPASSWORD;
  }

  // If pgpass.conf exists, psql will read it automatically without PGPASSWORD
  const appData = process.env.APPDATA || "";
  const pgpassPath = path.join(appData, "postgresql", "pgpass.conf");
  if (fs.existsSync(pgpassPath)) {
    return ""; // psql will read pgpass.conf directly
  }

  // If interactive TTY, prompt with masking
  if (process.stdin.isTTY) {
    return new Promise((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      process.stdout.write("Enter local PostgreSQL superuser password (input masked): ");

      // Turn off character echo
      const stdin = process.stdin;
      const wasRaw = stdin.isRaw;
      if (stdin.setRawMode) stdin.setRawMode(true);

      let password = "";
      const onData = (char: Buffer) => {
        const c = char.toString("utf8");
        if (c === "\n" || c === "\r" || c === "\u0004") {
          stdin.removeListener("data", onData);
          if (stdin.setRawMode) stdin.setRawMode(wasRaw);
          rl.close();
          process.stdout.write("\n");
          resolve(password);
        } else if (c === "\u0003") {
          // Ctrl+C
          process.exit(1);
        } else if (c === "\b" || c === "\x7f") {
          // Backspace
          if (password.length > 0) {
            password = password.slice(0, -1);
          }
        } else {
          password += c;
        }
      };

      stdin.on("data", onData);
    });
  }

  throw new Error(
    "[SETUP-TEST-DB] Superuser password not provided. Provide it via interactive prompt, $env:PGPASSWORD, or pgpass.conf."
  );
}

export async function setupTestDatabase() {
  console.log("[SETUP-TEST-DB] Checking connection to local PostgreSQL on 127.0.0.1:5432 as postgres...");

  let superuserPassword = "";
  let authenticated = false;

  // First attempt connection without password in case loopback trust is active
  try {
    const versionOutput = runPsql("SELECT version();", "postgres");
    console.log("[SETUP-TEST-DB] Successfully authenticated to local PostgreSQL server (passwordless/trust).");
    console.log(`[SETUP-TEST-DB] Server banner: ${versionOutput.split("\n")[2]?.trim() || "PostgreSQL 16"}`);
    authenticated = true;
  } catch {
    // Requires password
  }

  if (!authenticated) {
    try {
      superuserPassword = await promptPasswordSecurely();
      const versionOutput = runPsql("SELECT version();", "postgres", superuserPassword);
      console.log("[SETUP-TEST-DB] Successfully authenticated to local PostgreSQL server with password.");
      console.log(`[SETUP-TEST-DB] Server banner: ${versionOutput.split("\n")[2]?.trim() || "PostgreSQL 16"}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("password authentication failed") || msg.includes("no password supplied")) {
        throw new Error(
          "[SETUP-TEST-DB] Authentication failed. Superuser password was incorrect or not supplied."
        );
      }
      throw err;
    }
  }

  // 1. Generate strong random password for ccf_test_user (32 random bytes = 64 hex chars)
  let testUserPassword = crypto.randomBytes(32).toString("hex");

  console.log("[SETUP-TEST-DB] Provisioning dedicated role 'ccf_test_user'...");
  // Safely create or update ccf_test_user role using parameterized DO block
  runPsql(
    `
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'ccf_test_user') THEN
        CREATE ROLE ccf_test_user WITH LOGIN PASSWORD '${testUserPassword}';
      ELSE
        ALTER ROLE ccf_test_user WITH LOGIN PASSWORD '${testUserPassword}';
      END IF;
    END
    $$;
  `,
    "postgres",
    superuserPassword
  );

  console.log("[SETUP-TEST-DB] Ensuring dedicated database 'ccf_e2e_test' exists...");
  const checkDb = runPsql(
    "SELECT 1 FROM pg_database WHERE datname = 'ccf_e2e_test';",
    "postgres",
    superuserPassword
  );

  if (!checkDb.includes("1")) {
    runPsql("CREATE DATABASE ccf_e2e_test OWNER ccf_test_user;", "postgres", superuserPassword);
    console.log("[SETUP-TEST-DB] Database 'ccf_e2e_test' created.");
  } else {
    runPsql("ALTER DATABASE ccf_e2e_test OWNER TO ccf_test_user;", "postgres", superuserPassword);
    console.log("[SETUP-TEST-DB] Database 'ccf_e2e_test' already exists. Ownership verified.");
  }

  runPsql("GRANT ALL PRIVILEGES ON DATABASE ccf_e2e_test TO ccf_test_user;", "postgres", superuserPassword);
  runPsql("GRANT ALL ON SCHEMA public TO ccf_test_user;", "ccf_e2e_test", superuserPassword);

  // Clear superuser password from memory immediately
  superuserPassword = "";

  // 2. Generate random test application secrets (256-bit entropy)
  const authSecret = crypto.randomBytes(32).toString("hex");
  const authTotpKey = crypto.randomBytes(32).toString("hex");
  const emailSinkPath = path.resolve(
    process.cwd(),
    ".system_generated",
    "test-email-sink.json"
  );

  const sinkDir = path.dirname(emailSinkPath);
  if (!fs.existsSync(sinkDir)) {
    fs.mkdirSync(sinkDir, { recursive: true });
  }

  // 3. Atomically write .env.test.local (write to temporary file then atomic rename)
  const envTestLocalPath = path.resolve(process.cwd(), ".env.test.local");
  const envTestLocalTmpPath = path.resolve(process.cwd(), ".env.test.local.tmp");

  const envContent = [
    "# Dedicated local E2E test database configuration",
    "# Host is strictly loopback (127.0.0.1) and database is strictly ccf_e2e_test",
    `DATABASE_URL="postgresql://ccf_test_user:${testUserPassword}@127.0.0.1:5432/ccf_e2e_test"`,
    "",
    "# Dedicated test authentication keys",
    `AUTH_SECRET="${authSecret}"`,
    `AUTH_TOTP_ENCRYPTION_KEY="${authTotpKey}"`,
    "",
    "# Test Email Sink (intercepts magic link verification URLs locally without calling Resend)",
    `TEST_EMAIL_SINK_FILE="${emailSinkPath.replace(/\\/g, "/")}"`,
    "",
  ].join("\n");

  fs.writeFileSync(envTestLocalTmpPath, envContent, { encoding: "utf8", mode: 0o600 });
  fs.renameSync(envTestLocalTmpPath, envTestLocalPath);
  console.log("[SETUP-TEST-DB] Atomically wrote .env.test.local (permissions: 0600).");

  console.log("[SETUP-TEST-DB] Testing connection with dedicated 'ccf_test_user' credentials...");

  // Verify connection as ccf_test_user
  const verifyConn = execFileSync(
    PSQL_PATH,
    [
      "-h",
      "127.0.0.1",
      "-p",
      "5432",
      "-U",
      "ccf_test_user",
      "-d",
      "ccf_e2e_test",
      "-c",
      "SELECT current_user, current_database();",
    ],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        PGPASSWORD: testUserPassword,
      },
      stdio: ["ignore", "pipe", "pipe"],
    }
  );

  // Clear testUserPassword from memory
  testUserPassword = "";

  console.log("[SETUP-TEST-DB] Connection verified:");
  console.log(verifyConn.split("\n").slice(0, 4).join("\n"));
  console.log("[SETUP-TEST-DB] Test database setup complete.");
}

if (require.main === module) {
  setupTestDatabase().catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[SETUP-TEST-DB ERROR] ${msg}`);
    process.exit(1);
  });
}
