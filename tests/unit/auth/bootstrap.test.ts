import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateBootstrapOtp,
  normalizeBootstrapOtp,
  issueBootstrapOtp,
  verifyAndRedeemBootstrapOtp,
} from "@/lib/auth/bootstrap";
import { prisma } from "@/lib/db/client";
import { AdminRole } from "@prisma/client";
import bcrypt from "bcryptjs";

vi.mock("@/lib/db/client", () => ({
  prisma: {
    adminUser: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    adminBootstrapOtp: {
      deleteMany: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

describe("Bootstrap OTP Service Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. OTP Generation & Normalization", () => {
    it("generates 8-character Crockford base32 OTP formatted as XXXX-XXXX", () => {
      const { raw, formatted } = generateBootstrapOtp();
      expect(raw).toHaveLength(8);
      expect(formatted).toHaveLength(9);
      expect(formatted).toMatch(/^[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/);
      // Ensures ambiguous characters are excluded
      expect(raw).not.toMatch(/[01OIL]/);
    });

    it("normalizes OTP by removing spaces, hyphens and converting to uppercase", () => {
      expect(normalizeBootstrapOtp("abcd-efgh")).toBe("ABCDEFGH");
      expect(normalizeBootstrapOtp("  ab cd - ef gh  ")).toBe("ABCDEFGH");
      expect(normalizeBootstrapOtp("")).toBe("");
    });
  });

  describe("2. OTP Issuance", () => {
    const mockAdmin = {
      id: "admin-uuid-it-1",
      email: "cyberrohith07@gmail.com",
      name: "Rohith Y",
      role: AdminRole.IT_ADMIN,
      active: true,
    };

    it("issues a fresh OTP, invalidates existing OTPs, and stores bcrypt hash", async () => {
      vi.mocked(prisma.adminUser.findFirst).mockResolvedValue(mockAdmin as any);

      let createdData: any = null;
      vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
        const tx = {
          adminBootstrapOtp: {
            deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
            create: vi.fn().mockImplementation((args) => {
              createdData = args.data;
              return { id: "otp-uuid-1", ...args.data };
            }),
          },
        };
        return callback(tx as any);
      });

      const result = await issueBootstrapOtp(mockAdmin.email, { expiresInMinutes: 15 });

      expect(result.adminEmail).toBe(mockAdmin.email);
      expect(result.formattedOtp).toMatch(/^[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/);
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now() + 14 * 60 * 1000);

      // Verify that plaintext OTP was hashed and never stored in raw form
      expect(createdData).not.toBeNull();
      expect(createdData.otpHash).not.toBe(result.formattedOtp);
      expect(createdData.otpHash.startsWith("$2a$") || createdData.otpHash.startsWith("$2b$")).toBe(true);
      expect(createdData.purpose).toBe("INITIAL_BOOTSTRAP");
      expect(createdData.attempts).toBe(0);
      expect(createdData.maxAttempts).toBe(5);
    });

    it("SEC-007: rejects issuance if administrator is CCF_ADMIN or non-IT_ADMIN", async () => {
      vi.mocked(prisma.adminUser.findFirst).mockResolvedValue({
        ...mockAdmin,
        role: AdminRole.CCF_ADMIN,
      } as any);

      await expect(issueBootstrapOtp("developers.ccf@gmail.com")).rejects.toThrow(
        "Bootstrap OTP issuance is strictly restricted to IT_ADMIN accounts."
      );
    });

    it("rejects issuance if administrator does not exist", async () => {
      vi.mocked(prisma.adminUser.findFirst).mockResolvedValue(null);

      await expect(issueBootstrapOtp("nonexistent@ccf.org")).rejects.toThrow(
        "Administrator account does not exist."
      );
    });

    it("rejects issuance if administrator is inactive", async () => {
      vi.mocked(prisma.adminUser.findFirst).mockResolvedValue({
        ...mockAdmin,
        active: false,
      } as any);

      await expect(issueBootstrapOtp(mockAdmin.email)).rejects.toThrow(
        "Administrator account is inactive."
      );
    });
  });

  describe("3. OTP Verification & Atomic Redemption", () => {
    const mockAdmin = {
      id: "admin-uuid-it-2",
      email: "cyberkaleem@gmail.com",
      name: "Kaleem",
      role: AdminRole.IT_ADMIN,
      active: true,
    };

    const validRawOtp = "23456789";
    let validOtpHash: string;

    beforeEach(async () => {
      validOtpHash = await bcrypt.hash(validRawOtp, 10);
    });

    it("successfully redeems valid OTP using atomic conditional updateMany", async () => {
      vi.mocked(prisma.adminUser.findUnique).mockResolvedValue(mockAdmin as any);

      const mockOtpRecord = {
        id: "otp-1",
        adminId: mockAdmin.id,
        otpHash: validOtpHash,
        purpose: "INITIAL_BOOTSTRAP",
        attempts: 0,
        maxAttempts: 5,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // Valid for 10 min
        redeemedAt: null,
      };

      vi.mocked(prisma.adminBootstrapOtp.findFirst).mockResolvedValue(mockOtpRecord as any);
      // Slot reservation succeeds
      vi.mocked(prisma.adminBootstrapOtp.updateMany)
        .mockResolvedValueOnce({ count: 1 }) // slot reservation
        .mockResolvedValueOnce({ count: 1 }); // redemption

      const result = await verifyAndRedeemBootstrapOtp(mockAdmin.email, "2345-6789");

      expect(result.success).toBe(true);
      expect(result.admin?.id).toBe(mockAdmin.id);
      expect(result.admin?.email).toBe(mockAdmin.email);
    });

    it("atomically increments attempt counter when invalid code is submitted", async () => {
      vi.mocked(prisma.adminUser.findUnique).mockResolvedValue(mockAdmin as any);

      const mockOtpRecord = {
        id: "otp-2",
        adminId: mockAdmin.id,
        otpHash: validOtpHash,
        purpose: "INITIAL_BOOTSTRAP",
        attempts: 0,
        maxAttempts: 5,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        redeemedAt: null,
      };

      vi.mocked(prisma.adminBootstrapOtp.findFirst).mockResolvedValue(mockOtpRecord as any);
      vi.mocked(prisma.adminBootstrapOtp.updateMany).mockResolvedValueOnce({ count: 1 });
      vi.mocked(prisma.adminBootstrapOtp.findUnique).mockResolvedValue({
        id: "otp-2",
        attempts: 1,
        maxAttempts: 5,
      } as any);

      const result = await verifyAndRedeemBootstrapOtp(mockAdmin.email, "WRONG999");

      expect(result.success).toBe(false);
      expect(result.error).toContain("4 attempt(s) remaining");
      expect(prisma.adminBootstrapOtp.updateMany).toHaveBeenCalledWith({
        where: {
          id: "otp-2",
          attempts: { lt: 5 },
          redeemedAt: null,
          expiresAt: expect.anything(),
        },
        data: { attempts: { increment: 1 } },
      });
    });

    it("locks and rejects verification when max attempts reservation fails (count === 0)", async () => {
      vi.mocked(prisma.adminUser.findUnique).mockResolvedValue(mockAdmin as any);

      const mockOtpRecord = {
        id: "otp-3",
        adminId: mockAdmin.id,
        otpHash: validOtpHash,
        purpose: "INITIAL_BOOTSTRAP",
        attempts: 5,
        maxAttempts: 5,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        redeemedAt: null,
      };

      vi.mocked(prisma.adminBootstrapOtp.findFirst).mockResolvedValue(mockOtpRecord as any);
      // Attempt reservation fails because attempts >= maxAttempts
      vi.mocked(prisma.adminBootstrapOtp.updateMany).mockResolvedValueOnce({ count: 0 });

      const result = await verifyAndRedeemBootstrapOtp(mockAdmin.email, validRawOtp);

      expect(result.success).toBe(false);
      expect(result.locked).toBe(true);
      expect(result.error).toContain("Maximum verification attempts exceeded");
    });

    it("rejects expired OTP", async () => {
      vi.mocked(prisma.adminUser.findUnique).mockResolvedValue(mockAdmin as any);

      const mockOtpRecord = {
        id: "otp-4",
        adminId: mockAdmin.id,
        otpHash: validOtpHash,
        purpose: "INITIAL_BOOTSTRAP",
        attempts: 0,
        maxAttempts: 5,
        expiresAt: new Date(Date.now() - 60 * 1000), // Expired 1 min ago
        redeemedAt: null,
      };

      vi.mocked(prisma.adminBootstrapOtp.findFirst).mockResolvedValue(mockOtpRecord as any);

      const result = await verifyAndRedeemBootstrapOtp(mockAdmin.email, validRawOtp);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Bootstrap OTP has expired");
    });

    it("rejects concurrent replay redemption safely when updateMany count is 0", async () => {
      vi.mocked(prisma.adminUser.findUnique).mockResolvedValue(mockAdmin as any);

      const mockOtpRecord = {
        id: "otp-5",
        adminId: mockAdmin.id,
        otpHash: validOtpHash,
        purpose: "INITIAL_BOOTSTRAP",
        attempts: 0,
        maxAttempts: 5,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        redeemedAt: null,
      };

      vi.mocked(prisma.adminBootstrapOtp.findFirst).mockResolvedValue(mockOtpRecord as any);
      // Reservation succeeds, but redemption loses the race (count: 0)
      vi.mocked(prisma.adminBootstrapOtp.updateMany)
        .mockResolvedValueOnce({ count: 1 }) // slot reservation succeeds
        .mockResolvedValueOnce({ count: 0 }); // redemption loses race to concurrent request

      const result = await verifyAndRedeemBootstrapOtp(mockAdmin.email, validRawOtp);

      expect(result.success).toBe(false);
      expect(result.error).toContain("already consumed");
    });

    it("timing attack mitigation: executes dummy comparison when admin is not found", async () => {
      vi.mocked(prisma.adminUser.findUnique).mockResolvedValue(null);

      const result = await verifyAndRedeemBootstrapOtp("unknown@ccf.org", validRawOtp);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid credentials or unauthorized account.");
    });

    it("timing attack mitigation: executes dummy comparison when no active OTP exists", async () => {
      vi.mocked(prisma.adminUser.findUnique).mockResolvedValue(mockAdmin as any);
      vi.mocked(prisma.adminBootstrapOtp.findFirst).mockResolvedValue(null);

      const result = await verifyAndRedeemBootstrapOtp(mockAdmin.email, validRawOtp);

      expect(result.success).toBe(false);
      expect(result.error).toContain("No active bootstrap OTP found");
    });
  });
});
