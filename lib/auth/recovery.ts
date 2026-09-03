import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/client";

const RECOVERY_CODE_COUNT = 8;
const BCRYPT_SALT_ROUNDS = 10;

export interface GeneratedRecoveryCodes {
  plaintextCodes: string[];
}

/**
 * Normalizes a recovery code by stripping spaces, hyphens, and converting to uppercase.
 */
export function normalizeRecoveryCode(code: string): string {
  return code.replace(/[\s-]/g, "").toUpperCase();
}

/**
 * Generates a single cryptographically random recovery code formatted as XXXX-XXXX.
 */
function generateSingleCode(): { raw: string; formatted: string } {
  // 5 bytes = 10 hex characters, formatted as 5-5 uppercase
  const rawHex = crypto.randomBytes(5).toString("hex").toUpperCase();
  const formatted = `${rawHex.slice(0, 5)}-${rawHex.slice(5)}`;
  return { raw: rawHex, formatted };
}

/**
 * Generates a fresh set of 8 recovery codes for an admin.
 * Invalidates and deletes all existing recovery codes for this admin.
 * Plaintext codes are returned ONCE and never stored.
 */
export async function generateAndStoreRecoveryCodes(adminId: string): Promise<GeneratedRecoveryCodes> {
  const codes: { raw: string; formatted: string }[] = [];
  for (let i = 0; i < RECOVERY_CODE_COUNT; i++) {
    codes.push(generateSingleCode());
  }

  // Hash each code with bcrypt
  const hashes = await Promise.all(
    codes.map((c) => bcrypt.hash(c.raw, BCRYPT_SALT_ROUNDS))
  );

  // In a transaction, delete old codes and insert new ones
  await prisma.$transaction(async (tx) => {
    await tx.adminRecoveryCode.deleteMany({
      where: { adminId },
    });

    await tx.adminRecoveryCode.createMany({
      data: hashes.map((hash) => ({
        adminId,
        codeHash: hash,
      })),
    });
  });

  return {
    plaintextCodes: codes.map((c) => c.formatted),
  };
}

/**
 * Verifies and consumes a recovery code for an admin.
 * If valid, the matching code is atomically deleted so it can NEVER be reused.
 * Returns true if valid and consumed; false otherwise.
 */
export async function verifyAndConsumeRecoveryCode(adminId: string, candidateCode: string): Promise<boolean> {
  if (!candidateCode || typeof candidateCode !== "string") return false;
  const normalizedCandidate = normalizeRecoveryCode(candidateCode);
  if (normalizedCandidate.length === 0) return false;

  // Retrieve all stored hashes for this admin
  const storedCodes = await prisma.adminRecoveryCode.findMany({
    where: { adminId },
    select: { id: true, codeHash: true },
  });

  if (storedCodes.length === 0) return false;

  // Compare against each stored code
  let matchedId: string | null = null;
  for (const stored of storedCodes) {
    const isMatch = await bcrypt.compare(normalizedCandidate, stored.codeHash);
    if (isMatch) {
      matchedId = stored.id;
      break;
    }
  }

  if (!matchedId) return false;

  // Atomically delete the consumed code
  try {
    await prisma.adminRecoveryCode.delete({
      where: { id: matchedId },
    });
    return true;
  } catch {
    // If already deleted by concurrent request, consumption fails
    return false;
  }
}
