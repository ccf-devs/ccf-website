import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "fs";
import path from "path";
import { sendMagicLinkEmail } from "@/lib/auth/email";

describe("Safe Test Email Sink in sendMagicLinkEmail", () => {
  const tempSinkFile = path.resolve(process.cwd(), "tmp-email-sink.json");
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    if (fs.existsSync(tempSinkFile)) {
      fs.unlinkSync(tempSinkFile);
    }
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    if (fs.existsSync(tempSinkFile)) {
      fs.unlinkSync(tempSinkFile);
    }
  });

  it("intercepts email and writes to sink file in non-production when configured", async () => {
    (process.env as any).NODE_ENV = "test";
    process.env.TEST_EMAIL_SINK_FILE = tempSinkFile;
    delete process.env.RESEND_API_KEY;

    const expires = new Date(Date.now() + 10 * 60 * 1000);
    await sendMagicLinkEmail({
      identifier: "test-admin@crescent.education",
      url: "http://localhost:3000/api/auth/callback/email?token=test1234",
      expires,
    });

    expect(fs.existsSync(tempSinkFile)).toBe(true);
    const content = JSON.parse(fs.readFileSync(tempSinkFile, "utf8"));
    expect(content.identifier).toBe("test-admin@crescent.education");
    expect(content.url).toBe("http://localhost:3000/api/auth/callback/email?token=test1234");
    expect(content.expires).toBe(expires.toISOString());
  });

  it("strictly ignores TEST_EMAIL_SINK_FILE in production mode", async () => {
    (process.env as any).NODE_ENV = "production";
    process.env.TEST_EMAIL_SINK_FILE = tempSinkFile;
    delete process.env.RESEND_API_KEY;

    const expires = new Date(Date.now() + 10 * 60 * 1000);

    // In production without RESEND_API_KEY, it must throw RESEND_API_KEY is not configured
    // and must NOT write to the sink file!
    await expect(
      sendMagicLinkEmail({
        identifier: "test-admin@crescent.education",
        url: "http://localhost:3000/api/auth/callback/email?token=test1234",
        expires,
      })
    ).rejects.toThrow("RESEND_API_KEY is not configured.");

    expect(fs.existsSync(tempSinkFile)).toBe(false);
  });
});
