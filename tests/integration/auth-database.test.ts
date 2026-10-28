import "../test-env";
import { describe, it, expect, beforeEach } from "vitest";
import { parseAndValidateTestDatabaseUrl } from "../../scripts/verify-test-db";
import {
  seedTestFixtures,
  TEST_TOTP_SECRET,
  TEST_BOOTSTRAP_OTP_FORMATTED,
  TEST_RECOVERY_CODE_RAW,
} from "../../scripts/seed-test-fixtures";
import { testPrisma } from "../test-env";
import {
  issueBootstrapOtp,
  verifyAndRedeemBootstrapOtp,
} from "../../lib/auth/bootstrap";
import {
  decryptTotpSecret,
  encryptTotpSecret,
} from "../../lib/auth/totp";
import {
  generateAndStoreRecoveryCodes,
} from "../../lib/auth/recovery";
import { authOptions } from "../../lib/auth/config";
import { authenticator } from "otplib";
import fs from "fs";
import { AdminRole } from "@prisma/client";

// Safety check before running integration tests
const dbConfig = parseAndValidateTestDatabaseUrl();
if (dbConfig.database !== "ccf_e2e_test" || (dbConfig.host !== "127.0.0.1" && dbConfig.host !== "localhost")) {
  throw new Error("Safety guard violation: auth database integration tests must run exclusively on local ccf_e2e_test");
}

function getProvider(id: string): any {
  const p = authOptions.providers.find(
    (item: any) => item.id === id || item.options?.id === id
  ) as any;
  if (!p) return undefined;
  // NextAuth CredentialsProvider wraps options; expose authorize directly if in options
  if (p.options?.authorize) {
    return {
      ...p,
      authorize: p.options.authorize,
    };
  }
  return p;
}

describe("Auth Database Integration Tests (ccf_e2e_test)", () => {
  beforeEach(async () => {
    // Deterministic re-seed before test cases with dedicated auth prefix
    await seedTestFixtures("auth");
  });

  describe("1. IT_ADMIN Bootstrap OTP Lifecycle", () => {
    it("successfully redeems a valid bootstrap OTP atomically", async () => {
      const email = "bootstrap-auth-it-admin@crescentcluboffinance.com";
      const result = await verifyAndRedeemBootstrapOtp(email, TEST_BOOTSTRAP_OTP_FORMATTED);

      expect(result.success).toBe(true);
      expect(result.admin?.email).toBe(email);
      expect(result.admin?.role).toBe("IT_ADMIN");

      // Verify in DB that it is marked redeemed
      const otpRecord = await testPrisma.adminBootstrapOtp.findFirst({
        where: { admin: { email } },
      });
      expect(otpRecord?.redeemedAt).not.toBeNull();
    });

    it("rejects reuse of an already-redeemed bootstrap OTP", async () => {
      const email = "bootstrap-auth-it-admin@crescentcluboffinance.com";
      // First redemption
      const first = await verifyAndRedeemBootstrapOtp(email, TEST_BOOTSTRAP_OTP_FORMATTED);
      expect(first.success).toBe(true);

      // Attempt second redemption
      const second = await verifyAndRedeemBootstrapOtp(email, TEST_BOOTSTRAP_OTP_FORMATTED);
      expect(second.success).toBe(false);
      expect(second.error).toContain("No active bootstrap OTP found");
    });

    it("decrements remaining attempts on invalid OTP candidate and reports remaining count", async () => {
      const email = "bootstrap-auth-it-admin@crescentcluboffinance.com";
      const result = await verifyAndRedeemBootstrapOtp(email, "WRONG-OTP");

      expect(result.success).toBe(false);
      expect(result.error).toContain("attempt(s) remaining");

      const otpRecord = await testPrisma.adminBootstrapOtp.findFirst({
        where: { admin: { email } },
      });
      expect(otpRecord?.attempts).toBe(1);
    });

    it("locks and rejects an OTP once max attempts are exhausted", async () => {
      const email = "bootstrap-auth-it-admin@crescentcluboffinance.com";

      // Exhaust 5 attempts
      for (let i = 0; i < 4; i++) {
        const res = await verifyAndRedeemBootstrapOtp(email, `FAIL-000${i}`);
        expect(res.success).toBe(false);
      }

      // 5th attempt exhausts
      const finalAttempt = await verifyAndRedeemBootstrapOtp(email, "FAIL-FINAL");
      expect(finalAttempt.success).toBe(false);
      expect(finalAttempt.locked).toBe(true);
      expect(finalAttempt.error).toContain("Maximum verification attempts exceeded");

      // Subsequent attempt with CORRECT OTP is still rejected because it's locked
      const blockedAttempt = await verifyAndRedeemBootstrapOtp(email, TEST_BOOTSTRAP_OTP_FORMATTED);
      expect(blockedAttempt.success).toBe(false);
      expect(blockedAttempt.locked).toBe(true);
    });

    it("rejects an expired bootstrap OTP", async () => {
      const itAdmin = await testPrisma.adminUser.findUnique({
        where: { email: "bootstrap-auth-it-admin@crescentcluboffinance.com" },
      });

      // Issue an expired OTP (expired 1 minute ago)
      await testPrisma.adminBootstrapOtp.updateMany({
        where: { adminId: itAdmin!.id },
        data: {
          expiresAt: new Date(Date.now() - 60 * 1000),
        },
      });

      const res = await verifyAndRedeemBootstrapOtp(
        "bootstrap-auth-it-admin@crescentcluboffinance.com",
        TEST_BOOTSTRAP_OTP_FORMATTED
      );
      expect(res.success).toBe(false);
      expect(res.error).toContain("expired");
    });

    it("rejects bootstrap OTP issuance for CCF_ADMIN accounts (SEC-007)", async () => {
      await expect(
        issueBootstrapOtp("auth-ccf-admin@crescentcluboffinance.com")
      ).rejects.toThrow("strictly restricted to IT_ADMIN accounts");
    });
  });

  describe("2. TOTP Enrollment & Authentication", () => {
    it("authenticates active IT_ADMIN with valid TOTP code via credentials provider", async () => {
      const totpProvider = getProvider("totp");
      expect(totpProvider).toBeDefined();

      const validToken = authenticator.generate(TEST_TOTP_SECRET);

      const user = await totpProvider.authorize({
        email: "auth-it-admin@crescentcluboffinance.com",
        code: validToken,
      });

      expect(user).not.toBeNull();
      expect(user?.email).toBe("auth-it-admin@crescentcluboffinance.com");
      expect(user?.role).toBe(AdminRole.IT_ADMIN);
    });

    it("rejects authentication with invalid TOTP code", async () => {
      const totpProvider = getProvider("totp");
      const user = await totpProvider.authorize({
        email: "auth-it-admin@crescentcluboffinance.com",
        code: "999999", // Invalid token
      });

      expect(user).toBeNull();
    });

    it("rejects TOTP authentication for inactive IT_ADMIN", async () => {
      const totpProvider = getProvider("totp");
      const validToken = authenticator.generate(TEST_TOTP_SECRET);

      const user = await totpProvider.authorize({
        email: "inactive-auth-it-admin@crescentcluboffinance.com",
        code: validToken,
      });

      expect(user).toBeNull();
    });

    it("protects encrypted TOTP secret integrity with AES-256-GCM", () => {
      const secret = "MYTESTSECRET123456";
      const encrypted = encryptTotpSecret(secret);
      expect(encrypted).toContain(".");
      const decrypted = decryptTotpSecret(encrypted);
      expect(decrypted).toBe(secret);
    });
  });

  describe("3. Recovery Code Authentication", () => {
    it("authenticates and atomically consumes a one-time recovery code", async () => {
      const itAdmin = await testPrisma.adminUser.findUnique({
        where: { email: "auth-it-admin@crescentcluboffinance.com" },
      });

      const recoveryProvider = getProvider("recovery");
      expect(recoveryProvider).toBeDefined();

      // Authenticate with seeded recovery code
      const user = await recoveryProvider.authorize({
        email: "auth-it-admin@crescentcluboffinance.com",
        code: TEST_RECOVERY_CODE_RAW,
      });

      expect(user).not.toBeNull();
      expect(user?.email).toBe("auth-it-admin@crescentcluboffinance.com");

      // Verify code is deleted from database (consumed)
      const remainingCodes = await testPrisma.adminRecoveryCode.findMany({
        where: { adminId: itAdmin!.id },
      });
      expect(remainingCodes.length).toBe(0);
    });

    it("rejects reuse of a consumed recovery code", async () => {
      const recoveryProvider = getProvider("recovery");

      // Consume code first time
      await recoveryProvider.authorize({
        email: "auth-it-admin@crescentcluboffinance.com",
        code: TEST_RECOVERY_CODE_RAW,
      });

      // Attempt second time
      const retryUser = await recoveryProvider.authorize({
        email: "auth-it-admin@crescentcluboffinance.com",
        code: TEST_RECOVERY_CODE_RAW,
      });

      expect(retryUser).toBeNull();
    });

    it("generates exactly 8 recovery codes and hashes them", async () => {
      const itAdmin = await testPrisma.adminUser.findUnique({
        where: { email: "auth-it-admin@crescentcluboffinance.com" },
      });

      const { plaintextCodes } = await generateAndStoreRecoveryCodes(itAdmin!.id);
      expect(plaintextCodes.length).toBe(8);

      const dbCodes = await testPrisma.adminRecoveryCode.findMany({
        where: { adminId: itAdmin!.id },
      });
      expect(dbCodes.length).toBe(8);
      // Ensure raw plaintext is not in DB
      for (const code of plaintextCodes) {
        expect(dbCodes.some((c) => c.codeHash === code)).toBe(false);
      }
    });
  });

  describe("4. CCF_ADMIN Magic Link Policy & Local Email Sink", () => {
    it("delivers verification email to local email sink for active CCF_ADMIN", async () => {
      const emailProvider = getProvider("email");
      expect(emailProvider).toBeDefined();

      const sinkFile = process.env.TEST_EMAIL_SINK_FILE;
      expect(sinkFile).toBeDefined();

      if (fs.existsSync(sinkFile!)) {
        fs.unlinkSync(sinkFile!);
      }

      const identifier = "auth-ccf-admin@crescentcluboffinance.com";
      const testUrl = "http://localhost:3000/api/auth/callback/email?token=test-token-12345";
      const expires = new Date(Date.now() + 10 * 60 * 1000);

      await emailProvider.sendVerificationRequest({
        identifier,
        url: testUrl,
        expires,
      });

      expect(fs.existsSync(sinkFile!)).toBe(true);
      const sinkData = JSON.parse(fs.readFileSync(sinkFile!, "utf8"));
      expect(sinkData.identifier).toBe(identifier);
      expect(sinkData.url).toBe(testUrl);
    });

    it("rejects magic link email delivery for IT_ADMIN accounts (SEC-004)", async () => {
      const emailProvider = getProvider("email");
      const sinkFile = process.env.TEST_EMAIL_SINK_FILE!;
      if (fs.existsSync(sinkFile)) {
        fs.unlinkSync(sinkFile);
      }

      await emailProvider.sendVerificationRequest({
        identifier: "auth-it-admin@crescentcluboffinance.com",
        url: "http://localhost:3000/api/auth/callback/email?token=should-not-send",
        expires: new Date(Date.now() + 10 * 60 * 1000),
      });

      // Sink file must NOT have been written
      expect(fs.existsSync(sinkFile)).toBe(false);
    });

    it("rejects magic link sign-in for IT_ADMIN in signIn callback", async () => {
      const signInCallback = authOptions.callbacks?.signIn;
      expect(signInCallback).toBeDefined();

      const isAllowed = await signInCallback!({
        user: {
          id: "some-id",
          role: AdminRole.IT_ADMIN,
          active: true,
        } as any,
        account: {
          provider: "email",
          type: "email",
          providerAccountId: "email",
        },
      });

      expect(isAllowed).toBe(false);
    });

    it("rejects magic link sign-in for inactive CCF_ADMIN", async () => {
      const signInCallback = authOptions.callbacks?.signIn;

      const isAllowed = await signInCallback!({
        user: {
          id: "inactive-id",
          role: AdminRole.CCF_ADMIN,
          active: false,
        } as any,
        account: {
          provider: "email",
          type: "email",
          providerAccountId: "email",
        },
      });

      expect(isAllowed).toBe(false);
    });
  });

  describe("5. Restricted Enrollment Session Boundaries", () => {
    it("flags restricted enrollment session in bootstrap authorize response", async () => {
      const bootstrapProvider = getProvider("bootstrap-otp");
      expect(bootstrapProvider).toBeDefined();

      const user = await bootstrapProvider.authorize({
        email: "bootstrap-auth-it-admin@crescentcluboffinance.com",
        otp: TEST_BOOTSTRAP_OTP_FORMATTED,
      });

      expect(user).not.toBeNull();
      expect(user?.isRestrictedEnrollment).toBe(true);
      expect(user?.role).toBe(AdminRole.IT_ADMIN);
    });

    it("propagates isRestrictedEnrollment through JWT and session callbacks", async () => {
      const jwtCallback = authOptions.callbacks?.jwt as any;
      const sessionCallback = authOptions.callbacks?.session as any;

      const initialToken = await jwtCallback({
        token: {},
        user: {
          id: "user-1",
          role: AdminRole.IT_ADMIN,
          active: true,
          isRestrictedEnrollment: true,
        },
      });

      expect(initialToken.isRestrictedEnrollment).toBe(true);

      const session = await sessionCallback({
        session: { expires: "2099-01-01", user: {} },
        token: initialToken,
      });

      expect((session.user as any)?.isRestrictedEnrollment).toBe(true);
    });
  });
});
