import { spawn } from "child_process";
import fs from "fs";
import { parseAndValidateTestDatabaseUrl } from "./verify-test-db";

const config = parseAndValidateTestDatabaseUrl();
console.log(`[TEST-SERVER] Verified test database target: ${config.database} on ${config.host}:${config.port}`);

const envContent = fs.readFileSync(config.sourceFile, "utf8");
const envVars: Record<string, string> = { ...process.env as Record<string, string> };

for (const line of envContent.split("\n")) {
  const match = line.match(/^([A-Za-z0-9_]+)\s*=\s*["']?([^"'\r\n]+)/);
  if (match && match[1] && match[2]) {
    envVars[match[1]] = match[2].trim();
  }
}

envVars.DATABASE_URL = config.url;
envVars.PORT = "3000";

console.log("[TEST-SERVER] Starting Next.js test server on port 3000 strictly backed by ccf_e2e_test...");

const server = spawn("npx", ["next", "dev", "-p", "3000"], {
  env: envVars as NodeJS.ProcessEnv,
  stdio: "inherit",
  shell: true,
});

server.on("exit", (code: number | null) => {
  console.log(`[TEST-SERVER] Server process exited with code ${code}`);
  process.exit(code ?? 0);
});
