import fs from "fs";
import path from "path";
import { parseAndValidateTestDatabaseUrl } from "../scripts/verify-test-db";
import { PrismaClient } from "@prisma/client";

// Validate test DB before running any test operations
const config = parseAndValidateTestDatabaseUrl();

// Load all env vars from .env.test.local
const envContent = fs.readFileSync(config.sourceFile, "utf8");
for (const line of envContent.split("\n")) {
  const match = line.match(/^([A-Za-z0-9_]+)\s*=\s*["']?([^"'\r\n]+)/);
  if (match && match[1] && match[2]) {
    process.env[match[1]] = match[2].trim();
  }
}

// Ensure critical variables are set
process.env.DATABASE_URL = config.url;
(process.env as any).NODE_ENV = "test";

export const testPrisma = new PrismaClient({
  datasources: {
    db: { url: config.url },
  },
});
