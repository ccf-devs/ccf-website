import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import { parseAndValidateTestDatabaseUrl } from "@/scripts/verify-test-db";

describe("Fail-Closed Test Database Safety Guard", () => {
  const tempDir = path.resolve(process.cwd(), "tmp-test-guard");

  beforeEach(() => {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("fails closed when .env.test.local does not exist", () => {
    const nonExistentFile = path.join(tempDir, ".env.test.local.missing");
    expect(() => parseAndValidateTestDatabaseUrl(nonExistentFile)).toThrow(
      /Required test environment file.*does not exist/
    );
  });

  it("fails closed when DATABASE_URL is missing in test env file", () => {
    const envFile = path.join(tempDir, ".env.test.local");
    fs.writeFileSync(envFile, "AUTH_SECRET=some-secret\n");
    expect(() => parseAndValidateTestDatabaseUrl(envFile)).toThrow(
      /DATABASE_URL is not defined in \.env\.test\.local/
    );
  });

  it("rejects remote host by IP address (e.g. production/remote PostgreSQL)", () => {
    const envFile = path.join(tempDir, ".env.test.local");
    fs.writeFileSync(
      envFile,
      'DATABASE_URL="postgresql://test_user:secret_pass@52.76.108.241:5432/ccf_e2e_test"\n'
    );
    expect(() => parseAndValidateTestDatabaseUrl(envFile)).toThrow(
      /Target host '52\.76\.108\.241' is NOT a loopback address/
    );
  });

  it("rejects remote host by domain name (e.g. Neon branch)", () => {
    const envFile = path.join(tempDir, ".env.test.local");
    fs.writeFileSync(
      envFile,
      'DATABASE_URL="postgresql://test_user:secret_pass@ep-shiny-pond-1234.ap-southeast-1.aws.neon.tech:5432/ccf_e2e_test?sslmode=require"\n'
    );
    expect(() => parseAndValidateTestDatabaseUrl(envFile)).toThrow(
      /Target host 'ep-shiny-pond-1234\.ap-southeast-1\.aws\.neon\.tech' is NOT a loopback address/
    );
  });

  it("rejects loopback host if targeting production database name", () => {
    const envFile = path.join(tempDir, ".env.test.local");
    fs.writeFileSync(
      envFile,
      'DATABASE_URL="postgresql://postgres:localpass@127.0.0.1:5432/ccf_production"\n'
    );
    expect(() => parseAndValidateTestDatabaseUrl(envFile)).toThrow(
      /Database name is 'ccf_production'\. Expected exclusively 'ccf_e2e_test'/
    );
  });

  it("rejects non-postgres protocols", () => {
    const envFile = path.join(tempDir, ".env.test.local");
    fs.writeFileSync(
      envFile,
      'DATABASE_URL="mysql://postgres:localpass@127.0.0.1:3306/ccf_e2e_test"\n'
    );
    expect(() => parseAndValidateTestDatabaseUrl(envFile)).toThrow(
      /Invalid protocol 'mysql:'\. Expected 'postgresql:'/
    );
  });

  it("passes when host is 127.0.0.1 and database is ccf_e2e_test", () => {
    const envFile = path.join(tempDir, ".env.test.local");
    fs.writeFileSync(
      envFile,
      'DATABASE_URL="postgresql://ccf_tester:strong_local_pass@127.0.0.1:5432/ccf_e2e_test"\n'
    );
    const config = parseAndValidateTestDatabaseUrl(envFile);
    expect(config.host).toBe("127.0.0.1");
    expect(config.port).toBe(5432);
    expect(config.database).toBe("ccf_e2e_test");
  });

  it("passes when host is localhost and database is ccf_e2e_test", () => {
    const envFile = path.join(tempDir, ".env.test.local");
    fs.writeFileSync(
      envFile,
      'DATABASE_URL="postgresql://ccf_tester:strong_local_pass@localhost:5432/ccf_e2e_test"\n'
    );
    const config = parseAndValidateTestDatabaseUrl(envFile);
    expect(config.host).toBe("localhost");
    expect(config.port).toBe(5432);
    expect(config.database).toBe("ccf_e2e_test");
    expect(config.url).toBe("postgresql://ccf_tester:strong_local_pass@localhost:5432/ccf_e2e_test");
  });

  it("getValidatedTestDatabaseUrl returns exact raw URL string when valid", () => {
    const envFile = path.join(tempDir, ".env.test.local");
    const rawUrl = "postgresql://ccf_tester:strong_local_pass@127.0.0.1:5432/ccf_e2e_test";
    fs.writeFileSync(envFile, `DATABASE_URL="${rawUrl}"\n`);
    const resultUrl = parseAndValidateTestDatabaseUrl(envFile).url;
    expect(resultUrl).toBe(rawUrl);
  });
});
