import { describe, it, expect } from "vitest";
import {
  generateTotpSecret,
  encryptTotpSecret,
  decryptTotpSecret,
  generateOtpauthUri,
  generateQrCodeDataUrl,
  verifyTotpToken,
} from "@/lib/auth/totp";
import { authenticator } from "otplib";

describe("TOTP Authentication", () => {
  it("generates a valid Base32 secret", () => {
    const secret = generateTotpSecret();
    expect(secret).toBeDefined();
    expect(typeof secret).toBe("string");
    expect(secret.length).toBeGreaterThanOrEqual(16);
  });

  it("encrypts and decrypts secret using AES-256-GCM", () => {
    const secret = generateTotpSecret();
    const encrypted = encryptTotpSecret(secret);

    expect(encrypted).not.toBe(secret);
    expect(encrypted).toContain("."); // iv.authTag.ciphertext format

    const decrypted = decryptTotpSecret(encrypted);
    expect(decrypted).toBe(secret);
  });

  it("rejects tampered ciphertext during decryption", () => {
    const secret = generateTotpSecret();
    const encrypted = encryptTotpSecret(secret);
    const [iv, authTag, cipher] = encrypted.split(".");

    // Tamper with ciphertext
    const tamperedCipher = cipher.slice(0, -2) + "00";
    const tamperedPayload = `${iv}.${authTag}.${tamperedCipher}`;

    expect(() => decryptTotpSecret(tamperedPayload)).toThrow();
  });

  it("verifies a valid TOTP token", () => {
    const secret = generateTotpSecret();
    const validToken = authenticator.generate(secret);

    expect(verifyTotpToken(validToken, secret)).toBe(true);
  });

  it("rejects an invalid or malformed TOTP token", () => {
    const secret = generateTotpSecret();

    expect(verifyTotpToken("000000", secret)).toBe(false);
    expect(verifyTotpToken("123", secret)).toBe(false);
    expect(verifyTotpToken("abcdef", secret)).toBe(false);
    expect(verifyTotpToken("", secret)).toBe(false);
  });

  it("generates otpauth URI with Crescent Club of Finance issuer", () => {
    const secret = generateTotpSecret();
    const uri = generateOtpauthUri("admin@crescent.education", secret);

    expect(uri).toContain("otpauth://totp/");
    expect(uri).toContain("Crescent%20Club%20of%20Finance");
    expect(uri).toContain(encodeURIComponent("admin@crescent.education"));
  });

  it("generates a QR code Data URL from otpauth URI", async () => {
    const secret = generateTotpSecret();
    const uri = generateOtpauthUri("admin@crescent.education", secret);
    const qrDataUrl = await generateQrCodeDataUrl(uri);

    expect(qrDataUrl.startsWith("data:image/png;base64,")).toBe(true);
  });
});
