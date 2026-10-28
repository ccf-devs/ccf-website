import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST as setupTotpPost } from "@/app/api/admin/auth/totp/setup/route";
import { POST as verifyTotpPost } from "@/app/api/admin/auth/totp/verify-setup/route";
import { POST as recoveryGeneratePost } from "@/app/api/admin/auth/recovery/generate/route";
import { GET as notificationsGet } from "@/app/api/admin/notifications/route";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/db/client";
import { AdminRole } from "@prisma/client";
import { NextRequest } from "next/server";

vi.mock("next-auth/next", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth/config", () => ({
  authOptions: {},
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    adminUser: {
      findUnique: vi.fn(),
    },
    adminTotpSecret: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    adminRecoveryCode: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
      count: vi.fn(),
    },
    notification: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn((fn) =>
      fn({
        adminRecoveryCode: {
          deleteMany: vi.fn(),
          createMany: vi.fn(),
        },
      })
    ),
  },
}));

vi.mock("@/lib/auth/totp", () => ({
  generateTotpSecret: vi.fn().mockReturnValue("JBSWY3DPEHPK3PXP"),
  encryptTotpSecret: vi.fn().mockReturnValue("encrypted.secret.mock"),
  generateOtpauthUri: vi.fn().mockReturnValue("otpauth://totp/CCF:test@ccf.org?secret=JBSWY3DPEHPK3PXP"),
  generateQrCodeDataUrl: vi.fn().mockResolvedValue("data:image/png;base64,mockqr"),
  decryptTotpSecret: vi.fn().mockReturnValue("JBSWY3DPEHPK3PXP"),
  verifyTotpToken: vi.fn((code: string) => code === "123456"),
}));

describe("Bootstrap Enrollment Authorization Boundaries", () => {
  const restrictedAdmin = {
    id: "admin-uuid-bootstrap",
    email: "arshad.ahamed7139@gmail.com",
    name: "Arshad Ahamed",
    role: AdminRole.IT_ADMIN,
    active: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Enrollment APIs with Restricted Session", () => {
    beforeEach(() => {
      // Mock session as restricted enrollment
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          id: restrictedAdmin.id,
          email: restrictedAdmin.email,
          name: restrictedAdmin.name,
          role: restrictedAdmin.role,
          active: true,
          isRestrictedEnrollment: true,
        },
        expires: "2099-01-01",
      });

      vi.mocked(prisma.adminUser.findUnique).mockResolvedValue(restrictedAdmin as any);
    });

    it("allows restricted enrollment session to call /api/admin/auth/totp/setup when unverified", async () => {
      vi.mocked(prisma.adminTotpSecret.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.adminTotpSecret.upsert).mockResolvedValue({
        id: "totp-id-1",
        adminId: restrictedAdmin.id,
        secret: "encrypted.secret.mock",
        verified: false,
      } as any);

      const res = await setupTotpPost();
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.qrCodeDataUrl).toBe("data:image/png;base64,mockqr");
      expect(data.otpauthUri).toContain("otpauth://");

      expect(prisma.adminTotpSecret.upsert).toHaveBeenCalledWith({
        where: { adminId: restrictedAdmin.id },
        create: expect.objectContaining({ adminId: restrictedAdmin.id, verified: false }),
        update: expect.objectContaining({ verified: false }),
      });
    });

    it("SEC-002: rejects /api/admin/auth/totp/setup with 409 if admin already has verified TOTP secret", async () => {
      // Existing verified secret
      vi.mocked(prisma.adminTotpSecret.findUnique).mockResolvedValue({
        id: "totp-id-verified",
        adminId: restrictedAdmin.id,
        secret: "existing.encrypted.secret",
        verified: true,
      } as any);

      const res = await setupTotpPost();
      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.error).toContain("already configured and verified");
      // Must NOT overwrite or upsert the active secret
      expect(prisma.adminTotpSecret.upsert).not.toHaveBeenCalled();
    });

    it("allows restricted enrollment session to verify TOTP code", async () => {
      vi.mocked(prisma.adminTotpSecret.findUnique).mockResolvedValue({
        id: "totp-id-1",
        adminId: restrictedAdmin.id,
        secret: "encrypted.secret.mock",
        verified: false,
      } as any);

      vi.mocked(prisma.adminTotpSecret.update).mockResolvedValue({
        id: "totp-id-1",
        verified: true,
      } as any);

      const req = new NextRequest("http://localhost/api/admin/auth/totp/verify-setup", {
        method: "POST",
        body: JSON.stringify({ code: "123456" }),
      });

      const res = await verifyTotpPost(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(prisma.adminTotpSecret.update).toHaveBeenCalledWith({
        where: { adminId: restrictedAdmin.id },
        data: { verified: true },
      });
    });

    it("SEC-002: rejects /api/admin/auth/totp/verify-setup with 409 if already verified", async () => {
      vi.mocked(prisma.adminTotpSecret.findUnique).mockResolvedValue({
        id: "totp-id-1",
        adminId: restrictedAdmin.id,
        secret: "encrypted.secret.mock",
        verified: true,
      } as any);

      const req = new NextRequest("http://localhost/api/admin/auth/totp/verify-setup", {
        method: "POST",
        body: JSON.stringify({ code: "123456" }),
      });

      const res = await verifyTotpPost(req);
      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.error).toContain("already verified");
      expect(prisma.adminTotpSecret.update).not.toHaveBeenCalled();
    });

    it("SEC-001: REJECTS recovery code generation with 403 if TOTP is unverified", async () => {
      // TOTP secret is not yet verified
      vi.mocked(prisma.adminTotpSecret.findUnique).mockResolvedValue({
        id: "totp-id-1",
        adminId: restrictedAdmin.id,
        secret: "encrypted.secret.mock",
        verified: false,
      } as any);

      const res = await recoveryGeneratePost();
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain("TOTP enrollment must be verified");
    });

    it("SEC-001: REJECTS recovery code generation with 403 if TOTP secret does not exist", async () => {
      vi.mocked(prisma.adminTotpSecret.findUnique).mockResolvedValue(null);

      const res = await recoveryGeneratePost();
      expect(res.status).toBe(403);
    });

    it("SEC-001: allows initial recovery code generation for restricted session when no existing codes exist", async () => {
      // TOTP secret is confirmed verified
      vi.mocked(prisma.adminTotpSecret.findUnique).mockResolvedValue({
        id: "totp-id-1",
        adminId: restrictedAdmin.id,
        secret: "encrypted.secret.mock",
        verified: true,
      } as any);

      // No existing recovery codes exist
      vi.mocked(prisma.adminRecoveryCode.count).mockResolvedValue(0);

      const res = await recoveryGeneratePost();
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.codes)).toBe(true);
      expect(data.codes).toHaveLength(8);
    });

    it("SEC-001: REJECTS recovery code regeneration with 409 for restricted session if recovery codes already exist", async () => {
      // TOTP secret is confirmed verified
      vi.mocked(prisma.adminTotpSecret.findUnique).mockResolvedValue({
        id: "totp-id-1",
        adminId: restrictedAdmin.id,
        secret: "encrypted.secret.mock",
        verified: true,
      } as any);

      // Recovery codes already exist (e.g. from previous generation in onboarding)
      vi.mocked(prisma.adminRecoveryCode.count).mockResolvedValue(8);

      const res = await recoveryGeneratePost();
      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.error).toContain("Recovery codes have already been generated");
      // Transaction to create new codes must NOT be called
      expect(prisma.adminRecoveryCode.createMany).not.toHaveBeenCalled();
    });

    it("allows recovery code regeneration for standard full administrator session even if codes already exist", async () => {
      // Mock standard session (not restricted)
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          id: restrictedAdmin.id,
          email: restrictedAdmin.email,
          name: restrictedAdmin.name,
          role: restrictedAdmin.role,
          active: true,
          isRestrictedEnrollment: false, // Normal session!
        },
        expires: "2099-01-01",
      });

      vi.mocked(prisma.adminTotpSecret.findUnique).mockResolvedValue({
        id: "totp-id-1",
        adminId: restrictedAdmin.id,
        secret: "encrypted.secret.mock",
        verified: true,
      } as any);

      // Codes already exist
      vi.mocked(prisma.adminRecoveryCode.count).mockResolvedValue(8);

      const res = await recoveryGeneratePost();
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.codes)).toBe(true);
      expect(data.codes).toHaveLength(8);
    });

    it("STRONGLY BLOCKS restricted enrollment session from accessing protected admin APIs (e.g. notifications)", async () => {
      const req = new NextRequest("http://localhost/api/admin/notifications");
      const res = await notificationsGet(req);

      // Must be rejected with 401 Unauthorized because getCurrentAdmin() rejects restricted sessions
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe("Authentication required.");
    });
  });

  describe("2. Unauthenticated Access Protection", () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(null);
    });

    it("rejects unauthenticated user calling /api/admin/auth/totp/setup", async () => {
      const res = await setupTotpPost();
      expect(res.status).toBe(401);
    });

    it("rejects unauthenticated user calling /api/admin/auth/totp/verify-setup", async () => {
      const req = new NextRequest("http://localhost/api/admin/auth/totp/verify-setup", {
        method: "POST",
        body: JSON.stringify({ code: "123456" }),
      });
      const res = await verifyTotpPost(req);
      expect(res.status).toBe(401);
    });

    it("rejects unauthenticated user calling /api/admin/auth/recovery/generate", async () => {
      const res = await recoveryGeneratePost();
      expect(res.status).toBe(401);
    });
  });

  describe("3. Inactive Admin Protection", () => {
    it("rejects enrollment session if administrator account is marked inactive in DB", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          id: restrictedAdmin.id,
          email: restrictedAdmin.email,
          name: restrictedAdmin.name,
          role: restrictedAdmin.role,
          active: true,
          isRestrictedEnrollment: true,
        },
        expires: "2099-01-01",
      });

      // DB says inactive
      vi.mocked(prisma.adminUser.findUnique).mockResolvedValue({
        ...restrictedAdmin,
        active: false,
      } as any);

      const res = await setupTotpPost();
      expect(res.status).toBe(401);
    });
  });
});
