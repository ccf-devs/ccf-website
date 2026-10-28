import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/client";
import { normalizeAdminEmail } from "@/lib/auth/adapter";
import { AdminUser, AdminRole } from "@prisma/client";

// Crockford base32 characters (excluding 0, O, 1, I, L to avoid visual confusion)
const CROCKFORD_ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";
const OTP_LENGTH = 8;
const DEFAULT_EXPIRATION_MINUTES = 15;
const DEFAULT_MAX_ATTEMPTS = 5;
const BCRYPT_SALT_ROUNDS = 10;

// Dummy bcrypt hash for timing attack mitigation when admin/OTP is not found
const DUMMY_BCRYPT_HASH =
  "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

/**
 * Normalizes an OTP candidate by stripping spaces, hyphens, and converting to uppercase.
 */
export function normalizeBootstrapOtp(otp: string): string {
  if (!otp || typeof otp !== "string") return "";
  return otp.replace(/[\s-]/g, "").toUpperCase();
}

/**
 * Generates an 8-character cryptographic random OTP formatted as XXXX-XXXX.
 */
export function generateBootstrapOtp(): { raw: string; formatted: string } {
  const bytes = crypto.randomBytes(OTP_LENGTH);
  let raw = "";
  for (let i = 0; i < OTP_LENGTH; i++) {
    raw += CROCKFORD_ALPHABET[bytes[i] % CROCKFORD_ALPHABET.length];
  }
  const formatted = `${raw.slice(0, 4)}-${raw.slice(4)}`;
  return { raw, formatted };
}

export interface IssuedBootstrapOtp {
  formattedOtp: string;
  expiresAt: Date;
  adminId: string;
  adminEmail: string;
}

/**
 * Issues a cryptographically secure, single-use bootstrap OTP for an administrator.
 * Invalidates any existing unredeemed OTPs for this administrator.
 * Stores only the bcrypt hash. Returns plaintext OTP once for operator out-of-band delivery.
 */
export async function issueBootstrapOtp(
  emailOrAdminId: string,
  options?: { expiresInMinutes?: number; maxAttempts?: number }
): Promise<IssuedBootstrapOtp> {
  const isEmail = emailOrAdminId.includes("@");
  const normalized = isEmail
    ? normalizeAdminEmail(emailOrAdminId)
    : emailOrAdminId;

  const admin = await prisma.adminUser.findFirst({
    where: isEmail
      ? { email: normalized }
      : { id: normalized },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
    },
  });

  if (!admin) {
    throw new Error("Administrator account does not exist.");
  }

  if (!admin.active) {
    throw new Error("Administrator account is inactive. Activate account before issuing bootstrap OTP.");
  }

  // SEC-007: Restrict bootstrap OTP issuance strictly to IT_ADMIN accounts
  if (admin.role !== AdminRole.IT_ADMIN) {
    throw new Error("Bootstrap OTP issuance is strictly restricted to IT_ADMIN accounts.");
  }

  const { raw, formatted } = generateBootstrapOtp();
  const otpHash = await bcrypt.hash(raw, BCRYPT_SALT_ROUNDS);

  const expiresInMinutes = options?.expiresInMinutes ?? DEFAULT_EXPIRATION_MINUTES;
  const maxAttempts = options?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

  await prisma.$transaction(async (tx) => {
    // Invalidate/delete any existing unredeemed bootstrap OTPs for this admin
    await tx.adminBootstrapOtp.deleteMany({
      where: {
        adminId: admin.id,
        purpose: "INITIAL_BOOTSTRAP",
      },
    });

    await tx.adminBootstrapOtp.create({
      data: {
        adminId: admin.id,
        otpHash,
        purpose: "INITIAL_BOOTSTRAP",
        attempts: 0,
        maxAttempts,
        expiresAt,
      },
    });
  });

  return {
    formattedOtp: formatted,
    expiresAt,
    adminId: admin.id,
    adminEmail: admin.email,
  };
}

export interface BootstrapVerificationResult {
  success: boolean;
  admin?: {
    id: string;
    email: string;
    name: string;
    role: AdminUser["role"];
    active: boolean;
  };
  error?: string;
  locked?: boolean;
}

/**
 * Verifies and atomically redeems an initial bootstrap OTP.
 * - Protects against timing attacks via constant-time dummy comparisons.
 * - Enforces per-OTP attempt limits and expiration.
 * - Atomically marks OTP redeemed to eliminate concurrent reuse.
 */
export async function verifyAndRedeemBootstrapOtp(
  email: string,
  candidateOtp: string
): Promise<BootstrapVerificationResult> {
  if (!email || !candidateOtp) {
    await bcrypt.compare("dummy", DUMMY_BCRYPT_HASH);
    return { success: false, error: "Email and bootstrap OTP are required." };
  }

  const normalizedEmail = normalizeAdminEmail(email);
  const normalizedOtp = normalizeBootstrapOtp(candidateOtp);

  if (normalizedOtp.length === 0) {
    await bcrypt.compare("dummy", DUMMY_BCRYPT_HASH);
    return { success: false, error: "Invalid bootstrap OTP format." };
  }

  // 1. Fetch admin
  const admin = await prisma.adminUser.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
    },
  });

  if (!admin || !admin.active) {
    // Timing mitigation
    await bcrypt.compare(normalizedOtp, DUMMY_BCRYPT_HASH);
    return { success: false, error: "Invalid credentials or unauthorized account." };
  }

  // 2. Fetch active OTP record
  const otpRecord = await prisma.adminBootstrapOtp.findFirst({
    where: {
      adminId: admin.id,
      purpose: "INITIAL_BOOTSTRAP",
      redeemedAt: null,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!otpRecord) {
    await bcrypt.compare(normalizedOtp, DUMMY_BCRYPT_HASH);
    return {
      success: false,
      error: "No active bootstrap OTP found. Please request an OTP from your administrator.",
    };
  }

  // 3. Check expiration
  if (otpRecord.expiresAt.getTime() < Date.now()) {
    await bcrypt.compare(normalizedOtp, DUMMY_BCRYPT_HASH);
    return {
      success: false,
      error: "Bootstrap OTP has expired. Please request a new OTP from your administrator.",
    };
  }

  // 4. Atomically reserve an attempt slot in the database before running bcrypt
  // This guarantees that across all concurrent requests, at most maxAttempts
  // verifications can ever be processed, eliminating race conditions and CPU exhaustion.
  const slotReserved = await prisma.adminBootstrapOtp.updateMany({
    where: {
      id: otpRecord.id,
      attempts: { lt: otpRecord.maxAttempts },
      redeemedAt: null,
      expiresAt: { gt: new Date() },
    },
    data: {
      attempts: { increment: 1 },
    },
  });

  if (slotReserved.count === 0) {
    await bcrypt.compare(normalizedOtp, DUMMY_BCRYPT_HASH);
    return {
      success: false,
      error: "Maximum verification attempts exceeded. This OTP has been invalidated.",
      locked: true,
    };
  }

  // 5. Compare bcrypt hash
  const isMatch = await bcrypt.compare(normalizedOtp, otpRecord.otpHash);

  if (!isMatch) {
    // Fetch authoritative current attempt count to display remaining attempts
    const currentRecord = await prisma.adminBootstrapOtp.findUnique({
      where: { id: otpRecord.id },
      select: { attempts: true, maxAttempts: true },
    });

    const attemptsUsed = currentRecord?.attempts ?? (otpRecord.attempts + 1);
    const remaining = Math.max(0, otpRecord.maxAttempts - attemptsUsed);

    if (remaining <= 0) {
      return {
        success: false,
        error: "Maximum verification attempts exceeded. This OTP has been invalidated.",
        locked: true,
      };
    }

    return {
      success: false,
      error: `Invalid bootstrap OTP. ${remaining} attempt(s) remaining before invalidation.`,
    };
  }

  // 6. Atomically redeem OTP using conditional update to eliminate race conditions.
  // In PostgreSQL, only one concurrent request can successfully update a row where redeemedAt is null.
  const redemption = await prisma.adminBootstrapOtp.updateMany({
    where: {
      id: otpRecord.id,
      adminId: admin.id,
      purpose: "INITIAL_BOOTSTRAP",
      redeemedAt: null,
      expiresAt: { gt: new Date() },
    },
    data: {
      redeemedAt: new Date(),
    },
  });

  if (redemption.count === 0) {
    return {
      success: false,
      error: "Bootstrap OTP was already consumed or is no longer valid.",
    };
  }

  return {
    success: true,
    admin: {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      active: admin.active,
    },
  };
}
