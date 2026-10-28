import { describe, it, expect, vi, beforeEach } from "vitest";
import { authOptions } from "@/lib/auth/config";
import { prisma } from "@/lib/db/client";
import { AdminRole } from "@prisma/client";
import { sendMagicLinkEmail } from "@/lib/auth/email";

vi.mock("@/lib/db/client", () => ({
  prisma: {
    adminUser: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth/email", () => ({
  sendMagicLinkEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/auth/recovery", () => ({
  verifyAndConsumeRecoveryCode: vi.fn(),
}));

describe("Authentication Policy & Boundary Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("SEC-004: Magic-Link Role Policy", () => {
    it("allows CCF_ADMIN to sign in via email magic-link provider", async () => {
      const signInCallback = authOptions.callbacks?.signIn;
      expect(signInCallback).toBeDefined();

      const user = {
        id: "admin-ccf-1",
        email: "developers.ccf@gmail.com",
        name: "CCF Admin",
        role: AdminRole.CCF_ADMIN,
        active: true,
      };

      const allowed = await signInCallback!({
        user: user as any,
        account: { provider: "email" } as any,
        profile: undefined,
        email: undefined,
        credentials: undefined,
      });

      expect(allowed).toBe(true);
    });

    it("REJECTS IT_ADMIN from signing in via email magic-link provider", async () => {
      const signInCallback = authOptions.callbacks?.signIn;
      expect(signInCallback).toBeDefined();

      const itUser = {
        id: "admin-it-1",
        email: "cyberrohith07@gmail.com",
        name: "Rohith Y",
        role: AdminRole.IT_ADMIN,
        active: true,
      };

      const allowed = await signInCallback!({
        user: itUser as any,
        account: { provider: "email" } as any,
        profile: undefined,
        email: undefined,
        credentials: undefined,
      });

      expect(allowed).toBe(false);
    });

    it("rejects inactive user even if role is CCF_ADMIN", async () => {
      const signInCallback = authOptions.callbacks?.signIn;
      expect(signInCallback).toBeDefined();

      const inactiveUser = {
        id: "admin-inactive-1",
        email: "developers.ccf@gmail.com",
        name: "CCF Admin",
        role: AdminRole.CCF_ADMIN,
        active: false,
      };

      const allowed = await signInCallback!({
        user: inactiveUser as any,
        account: { provider: "email" } as any,
        profile: undefined,
        email: undefined,
        credentials: undefined,
      });

      expect(allowed).toBe(false);
    });

    it("sendVerificationRequest sends email for CCF_ADMIN", async () => {
      const emailProvider: any = authOptions.providers.find(
        (p: any) => p.id === "email"
      );
      expect(emailProvider).toBeDefined();

      vi.mocked(prisma.adminUser.findUnique).mockResolvedValue({
        role: AdminRole.CCF_ADMIN,
        active: true,
      } as any);

      await emailProvider.sendVerificationRequest({
        identifier: "developers.ccf@gmail.com",
        url: "http://localhost/magic-token",
        expires: new Date(),
      });

      expect(sendMagicLinkEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          identifier: "developers.ccf@gmail.com",
        })
      );
    });

    it("sendVerificationRequest SILENTLY DROPS email delivery for IT_ADMIN", async () => {
      const emailProvider: any = authOptions.providers.find(
        (p: any) => p.id === "email"
      );
      expect(emailProvider).toBeDefined();

      vi.mocked(prisma.adminUser.findUnique).mockResolvedValue({
        role: AdminRole.IT_ADMIN,
        active: true,
      } as any);

      await emailProvider.sendVerificationRequest({
        identifier: "cyberrohith07@gmail.com",
        url: "http://localhost/magic-token",
        expires: new Date(),
      });

      expect(sendMagicLinkEmail).not.toHaveBeenCalled();
    });
  });

  describe("SEC-001: Recovery Provider TOTP Enrollment Enforcement", () => {
    it("rejects recovery login if administrator has not enrolled or verified TOTP", async () => {
      const recoveryProvider: any = authOptions.providers.find(
        (p: any) => p.id === "recovery" || p.options?.id === "recovery"
      );
      expect(recoveryProvider).toBeDefined();
      const authorize = recoveryProvider.authorize ?? recoveryProvider.options?.authorize;

      // Admin exists, but totpSecret is not verified
      vi.mocked(prisma.adminUser.findUnique).mockResolvedValue({
        id: "admin-it-2",
        email: "cyberkaleem@gmail.com",
        name: "Kaleem",
        role: AdminRole.IT_ADMIN,
        active: true,
        totpSecret: { verified: false },
      } as any);

      const user = await authorize({
        email: "cyberkaleem@gmail.com",
        code: "12345-67890",
      });

      expect(user).toBeNull();
    });

    it("rejects recovery login if administrator has no totpSecret record at all", async () => {
      const recoveryProvider: any = authOptions.providers.find(
        (p: any) => p.id === "recovery" || p.options?.id === "recovery"
      );
      expect(recoveryProvider).toBeDefined();
      const authorize = recoveryProvider.authorize ?? recoveryProvider.options?.authorize;

      vi.mocked(prisma.adminUser.findUnique).mockResolvedValue({
        id: "admin-it-3",
        email: "arshad.ahamed7139@gmail.com",
        name: "Arshad",
        role: AdminRole.IT_ADMIN,
        active: true,
        totpSecret: null,
      } as any);

      const user = await authorize({
        email: "arshad.ahamed7139@gmail.com",
        code: "12345-67890",
      });

      expect(user).toBeNull();
    });
  });
});
