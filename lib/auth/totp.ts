import crypto from "crypto";
import { authenticator } from "otplib";
import QRCode from "qrcode";

// Configure otplib standard TOTP settings
authenticator.options = {
  digits: 6,
  step: 30,
  window: 1, // Allow 1 step before/after for slight clock skew
};

/**
 * Derives a 32-byte Buffer from AUTH_TOTP_ENCRYPTION_KEY.
 * Must be a 32-byte hex string (64 characters) or 32-byte binary key.
 */
function getEncryptionKey(): Buffer {
  const hexKey = process.env.AUTH_TOTP_ENCRYPTION_KEY;
  if (!hexKey) {
    if (process.env.NODE_ENV === "test") {
      // Deterministic fallback for testing
      return Buffer.from("0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef", "hex");
    }
    throw new Error("AUTH_TOTP_ENCRYPTION_KEY is not configured.");
  }

  const buf = Buffer.from(hexKey, "hex");
  if (buf.length !== 32) {
    throw new Error("AUTH_TOTP_ENCRYPTION_KEY must be a 64-character hex string (32 bytes).");
  }
  return buf;
}

/**
 * Encrypts a plaintext TOTP secret with AES-256-GCM.
 * Format: iv.authTag.ciphertext (hex)
 */
export function encryptTotpSecret(secret: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  let encrypted = cipher.update(secret, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}.${authTag}.${encrypted}`;
}

/**
 * Decrypts an AES-256-GCM encrypted TOTP secret.
 */
export function decryptTotpSecret(encryptedPayload: string): string {
  const key = getEncryptionKey();
  const parts = encryptedPayload.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted TOTP secret payload format.");
  }

  const [ivHex, authTagHex, cipherTextHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(cipherTextHex, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Generates a new random Base32 TOTP secret.
 */
export function generateTotpSecret(): string {
  return authenticator.generateSecret();
}

/**
 * Generates the otpauth:// URI for authenticator apps.
 */
export function generateOtpauthUri(email: string, secret: string): string {
  return authenticator.keyuri(email, "Crescent Club of Finance", secret);
}

/**
 * Generates a QR code Data URL (PNG) from an otpauth:// URI.
 */
export async function generateQrCodeDataUrl(otpauthUri: string): Promise<string> {
  return QRCode.toDataURL(otpauthUri, {
    margin: 2,
    width: 260,
    color: {
      dark: "#0f172a",
      light: "#ffffff",
    },
  });
}

/**
 * Verifies a 6-digit TOTP token against a plaintext secret.
 */
export function verifyTotpToken(token: string, secret: string): boolean {
  if (!token || typeof token !== "string") return false;
  const cleanToken = token.trim();
  if (!/^\d{6}$/.test(cleanToken)) return false;

  try {
    return authenticator.check(cleanToken, secret);
  } catch {
    return false;
  }
}
