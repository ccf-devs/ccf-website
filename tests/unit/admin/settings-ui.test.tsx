import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AdminRole } from "@prisma/client";
import AdminSettingsPage from "@/app/admin/settings/page";
import {
  SettingsView,
  SecuritySettings,
  GeneralSettings,
} from "@/components/admin/settings";
import * as authSession from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import * as recruitmentService from "@/lib/recruitment/service";

// Mock next/navigation
const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/settings",
  redirect: (url: string) => mockRedirect(url),
}));

// Mock auth session
vi.mock("@/lib/auth/session", () => ({
  getCurrentAdmin: vi.fn(),
}));

// Mock prisma client
vi.mock("@/lib/db/client", () => ({
  prisma: {
    adminTotpSecret: {
      findUnique: vi.fn(),
    },
    adminRecoveryCode: {
      count: vi.fn(),
    },
  },
}));

// Mock recruitment service
vi.mock("@/lib/recruitment/service", () => ({
  getRecruitmentSettings: vi.fn(),
}));

describe("Phase 14 — Admin Settings & Security UI Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockAdminUser = {
    id: "admin-uuid-1",
    email: "developers.ccf@gmail.com",
    name: "CCF Devs",
    role: AdminRole.CCF_ADMIN,
  };

  const mockPlatform = {
    appName: "Crescent Club of Finance Platform",
    appVersion: "v0.1.0",
    appUrl: "https://ccf-crescent.com",
    environment: "test",
    databaseEngine: "PostgreSQL on Neon (Singapore)",
    storageProvider: "Backblaze B2 (CA East)",
    emailProvider: "Resend Transactional API",
    recruitmentStatus: "Open" as const,
    whatsappGroupConfigured: true,
  };

  /* -------------------------------------------------------------------------- */
  /* 1. AdminSettingsPage Server Component Authorization & Redirection          */
  /* -------------------------------------------------------------------------- */
  describe("1. AdminSettingsPage Server Component Authorization", () => {
    it("redirects unauthenticated visitor to admin login with callbackUrl", async () => {
      vi.mocked(authSession.getCurrentAdmin).mockResolvedValue(null);

      await AdminSettingsPage();

      expect(mockRedirect).toHaveBeenCalledWith(
        "/admin/auth/login?callbackUrl=/admin/settings"
      );
    });

    it("redirects unauthorized roles (non-admin) to login", async () => {
      // Simulate an unexpected role if any non-admin role exists
      vi.mocked(authSession.getCurrentAdmin).mockResolvedValue({
        id: "user-uuid-99",
        email: "unauthorized@example.com",
        name: "Unauthorized User",
        role: "MEMBER" as unknown as AdminRole,
      });

      await AdminSettingsPage();

      expect(mockRedirect).toHaveBeenCalledWith(
        "/admin/auth/login?callbackUrl=/admin/settings"
      );
    });

    it("allows CCF_ADMIN and queries Prisma for TOTP and recovery count", async () => {
      vi.mocked(authSession.getCurrentAdmin).mockResolvedValue(mockAdminUser);
      vi.mocked(prisma.adminTotpSecret.findUnique).mockResolvedValue({
        id: "totp-1",
        adminId: mockAdminUser.id,
        secret: "ENCRYPTED_SECRET",
        verified: true,
        createdAt: new Date(),
        updatedAt: new Date("2026-09-08T10:00:00Z"),
      } as any);
      vi.mocked(prisma.adminRecoveryCode.count).mockResolvedValue(8);
      vi.mocked(recruitmentService.getRecruitmentSettings).mockResolvedValue({
        isOpen: true,
        whatsappGroupUrl: "https://chat.whatsapp.com/test",
      });

      const element = await AdminSettingsPage();
      expect(element).not.toBeNull();
      const html = renderToStaticMarkup(element!);

      expect(mockRedirect).not.toHaveBeenCalled();
      expect(prisma.adminTotpSecret.findUnique).toHaveBeenCalledWith({
        where: { adminId: mockAdminUser.id },
        select: { verified: true, updatedAt: true },
      });
      expect(prisma.adminRecoveryCode.count).toHaveBeenCalledWith({
        where: { adminId: mockAdminUser.id },
      });
      expect(html).toContain("Settings");
      expect(html).toContain("CCF Devs");
      expect(html).toContain("developers.ccf@gmail.com");
    });

    it("allows IT_ADMIN to access settings", async () => {
      vi.mocked(authSession.getCurrentAdmin).mockResolvedValue({
        ...mockAdminUser,
        role: AdminRole.IT_ADMIN,
        name: "Rohith IT",
      });
      vi.mocked(prisma.adminTotpSecret.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.adminRecoveryCode.count).mockResolvedValue(0);
      vi.mocked(recruitmentService.getRecruitmentSettings).mockResolvedValue({
        isOpen: false,
        whatsappGroupUrl: null,
      });

      const element = await AdminSettingsPage();
      expect(element).not.toBeNull();
      const html = renderToStaticMarkup(element!);

      expect(mockRedirect).not.toHaveBeenCalled();
      expect(html).toContain("Rohith IT");
      expect(html).toContain("IT Admin");
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 2. SettingsView Component (Tabbed Shell)                                   */
  /* -------------------------------------------------------------------------- */
  describe("2. SettingsView Component", () => {
    it("renders tab navigation with Security & Authentication active by default", () => {
      const html = renderToStaticMarkup(
        <SettingsView
          admin={mockAdminUser}
          initialIsTotpEnabled={false}
          initialTotpUpdatedAt={null}
          initialRecoveryCodesCount={0}
          platform={mockPlatform}
        />
      );

      // Both tabs exist
      expect(html).toContain("Security &amp; Authentication");
      expect(html).toContain("Platform Overview");

      // Default panel rendered is Security
      expect(html).toContain("Authenticator App (TOTP)");
      expect(html).toContain("Break-Glass Access");
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 3. SecuritySettings Component                                              */
  /* -------------------------------------------------------------------------- */
  describe("3. SecuritySettings Component", () => {
    it("renders admin identity with name, email, and formatted role badge", () => {
      const html = renderToStaticMarkup(
        <SecuritySettings
          admin={mockAdminUser}
          initialIsTotpEnabled={false}
          initialTotpUpdatedAt={null}
          initialRecoveryCodesCount={0}
        />
      );

      expect(html).toContain("CCF Devs");
      expect(html).toContain("developers.ccf@gmail.com");
      expect(html).toContain("CCF Admin"); // formatAdminRole(CCF_ADMIN)
      expect(html).toContain("Active Session");
      expect(html).toContain("Auth.js Verified");
    });

    it("renders unconfigured state when TOTP is not enabled", () => {
      const html = renderToStaticMarkup(
        <SecuritySettings
          admin={mockAdminUser}
          initialIsTotpEnabled={false}
          initialTotpUpdatedAt={null}
          initialRecoveryCodesCount={0}
        />
      );

      expect(html).toContain("Not Configured");
      expect(html).toContain("Secondary fallback not configured");
      expect(html).toContain("Set up Authenticator");
    });

    it("renders verified active state when TOTP is enabled", () => {
      const html = renderToStaticMarkup(
        <SecuritySettings
          admin={mockAdminUser}
          initialIsTotpEnabled={true}
          initialTotpUpdatedAt="2026-09-08T14:30:00.000Z"
          initialRecoveryCodesCount={0}
        />
      );

      expect(html).toContain("Enabled");
      expect(html).toContain("Authenticator actively protects your account");
      expect(html).toContain("Reconfigure Authenticator");
    });

    it("renders empty recovery codes count when 0 codes exist", () => {
      const html = renderToStaticMarkup(
        <SecuritySettings
          admin={mockAdminUser}
          initialIsTotpEnabled={true}
          initialTotpUpdatedAt={null}
          initialRecoveryCodesCount={0}
        />
      );

      expect(html).toContain("None Generated");
      expect(html).toContain("Generate 8 Codes");
      expect(html).toContain("Instant creation");
    });

    it("renders active recovery codes count and regenerate button when codes exist", () => {
      const html = renderToStaticMarkup(
        <SecuritySettings
          admin={mockAdminUser}
          initialIsTotpEnabled={true}
          initialTotpUpdatedAt={null}
          initialRecoveryCodesCount={6}
        />
      );

      expect(html).toContain("6 Active Codes");
      expect(html).toContain("Regenerate Codes");
      expect(html).toContain("Invalidates old codes");
    });

    it("explains cryptographic single-use bcrypt protection", () => {
      const html = renderToStaticMarkup(
        <SecuritySettings
          admin={mockAdminUser}
          initialIsTotpEnabled={false}
          initialTotpUpdatedAt={null}
          initialRecoveryCodesCount={0}
        />
      );

      expect(html).toContain("Cryptographic Single-Use Storage");
      expect(html).toContain("bcrypt (10 rounds)");
    });

    it("never renders raw TOTP secrets or recovery codes in initial HTML markup", () => {
      const html = renderToStaticMarkup(
        <SecuritySettings
          admin={mockAdminUser}
          initialIsTotpEnabled={true}
          initialTotpUpdatedAt={null}
          initialRecoveryCodesCount={8}
        />
      );

      // Ensure secret formats (like otpauth:// or XXXXX-XXXXX recovery codes) are absent
      expect(html).not.toContain("otpauth://");
      expect(html).not.toContain("secret=");
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 4. GeneralSettings Component (Platform Overview)                           */
  /* -------------------------------------------------------------------------- */
  describe("4. GeneralSettings Component", () => {
    it("renders platform core specifications accurately", () => {
      const html = renderToStaticMarkup(
        <GeneralSettings platform={mockPlatform} />
      );

      // Core Specs
      expect(html).toContain("Crescent Club of Finance Platform");
      expect(html).toContain("v0.1.0");
      expect(html).toContain("test");
      expect(html).toContain("https://ccf-crescent.com");

      // Connected Services
      expect(html).toContain("PostgreSQL on Neon (Singapore)");
      expect(html).toContain("Backblaze B2 (CA East)");
      expect(html).toContain("Resend Transactional API");
      expect(html).toContain("Auth.js + Resend Magic Link");
    });

    it("renders recruitment intake status and link to recruitment console", () => {
      const html = renderToStaticMarkup(
        <GeneralSettings platform={mockPlatform} />
      );

      expect(html).toContain("Student Recruitment Intake");
      expect(html).toContain("Intake Open");
      expect(html).toContain("WhatsApp Community Link");
      expect(html).toContain("Configured");
      expect(html).toContain('href="/admin/recruitment"');
      expect(html).toContain("Manage in Recruitment");
    });

    it("renders closed intake badge when recruitment is closed", () => {
      const html = renderToStaticMarkup(
        <GeneralSettings
          platform={{
            ...mockPlatform,
            recruitmentStatus: "Closed",
            whatsappGroupConfigured: false,
          }}
        />
      );

      expect(html).toContain("Intake Closed");
      expect(html).toContain("None");
    });
  });
});
