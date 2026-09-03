import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  normalizeRecoveryCode,
  generateAndStoreRecoveryCodes,
  verifyAndConsumeRecoveryCode,
} from "@/lib/auth/recovery";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/client";

// Mock Prisma client for isolation
vi.mock("@/lib/db/client", () => {
  return {
    prisma: {
      $transaction: vi.fn(),
      adminRecoveryCode: {
        deleteMany: vi.fn(),
        createMany: vi.fn(),
        findMany: vi.fn(),
        delete: vi.fn(),
      },
    },
  };
});

describe("Recovery Codes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("normalizes recovery codes by removing hyphens, spaces, and uppercasing", () => {
    expect(normalizeRecoveryCode("a1b2c-d3e4f")).toBe("A1B2CD3E4F");
    expect(normalizeRecoveryCode("  a1 b2-c3 d4  ")).toBe("A1B2C3D4");
    expect(normalizeRecoveryCode("1234567890")).toBe("1234567890");
  });

  it("generates exactly 8 formatted recovery codes and stores bcrypt hashes", async () => {
    let createdRecords: { adminId: string; codeHash: string }[] = [];

    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
      return callback({
        adminRecoveryCode: {
          deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
          createMany: vi.fn().mockImplementation(({ data }) => {
            createdRecords = data;
            return Promise.resolve({ count: data.length });
          }),
        },
      } as any);
    });

    const adminId = "mock-admin-uuid-1";
    const result = await generateAndStoreRecoveryCodes(adminId);

    expect(result.plaintextCodes).toHaveLength(8);
    for (const code of result.plaintextCodes) {
      expect(code).toMatch(/^[0-9A-F]{5}-[0-9A-F]{5}$/);
    }

    expect(createdRecords).toHaveLength(8);
    for (const record of createdRecords) {
      expect(record.adminId).toBe(adminId);
      // Bcrypt hash signature
      expect(record.codeHash.startsWith("$2")).toBe(true);
      // Plaintext code is NOT stored
      expect(result.plaintextCodes).not.toContain(record.codeHash);
    }
  });

  it("successfully verifies and atomically consumes a valid recovery code", async () => {
    const adminId = "mock-admin-uuid-2";
    const rawCode = "ABCDE12345";
    const hashed = await bcrypt.hash(rawCode, 10);

    vi.mocked(prisma.adminRecoveryCode.findMany).mockResolvedValue([
      { id: "code-record-1", adminId, codeHash: hashed, createdAt: new Date() },
    ]);
    vi.mocked(prisma.adminRecoveryCode.delete).mockResolvedValue({
      id: "code-record-1",
      adminId,
      codeHash: hashed,
      createdAt: new Date(),
    });

    const success = await verifyAndConsumeRecoveryCode(adminId, "ABCDE-12345");
    expect(success).toBe(true);
    expect(prisma.adminRecoveryCode.delete).toHaveBeenCalledWith({
      where: { id: "code-record-1" },
    });
  });

  it("rejects an invalid recovery code", async () => {
    const adminId = "mock-admin-uuid-3";
    const hashed = await bcrypt.hash("VALID12345", 10);

    vi.mocked(prisma.adminRecoveryCode.findMany).mockResolvedValue([
      { id: "code-record-2", adminId, codeHash: hashed, createdAt: new Date() },
    ]);

    const success = await verifyAndConsumeRecoveryCode(adminId, "WRONG-99999");
    expect(success).toBe(false);
    expect(prisma.adminRecoveryCode.delete).not.toHaveBeenCalled();
  });

  it("fails when no recovery codes exist for admin", async () => {
    vi.mocked(prisma.adminRecoveryCode.findMany).mockResolvedValue([]);

    const success = await verifyAndConsumeRecoveryCode("admin-none", "ABCDE-12345");
    expect(success).toBe(false);
  });
});
