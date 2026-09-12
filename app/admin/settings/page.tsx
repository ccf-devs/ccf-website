import { Metadata } from "next";
import { getCurrentAdmin } from "@/lib/auth/session";
import { AdminRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { AdminShell, AdminPageHeader } from "@/components/admin";
import { SettingsView } from "@/components/admin/settings";
import { prisma } from "@/lib/db/client";
import { getRecruitmentSettings } from "@/lib/recruitment/service";
import { getPublicContactSettings, type PublicContactSettings } from "@/lib/site-settings/service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Settings — CCF Admin",
  description: "Administrator security configuration and platform specifications.",
};

export default async function AdminSettingsPage() {
  const admin = await getCurrentAdmin();

  if (!admin || (admin.role !== AdminRole.CCF_ADMIN && admin.role !== AdminRole.IT_ADMIN)) {
    redirect("/admin/auth/login?callbackUrl=/admin/settings");
    return null;
  }

  let isTotpEnabled = false;
  let totpUpdatedAt: string | null = null;
  let recoveryCodesCount = 0;
  let recruitmentStatus: "Open" | "Closed" = "Closed";
  let whatsappGroupConfigured = false;
  let contactSettings: PublicContactSettings | undefined;

  try {
    const [totpRecord, codesCount, recruitmentSetting, fetchedContactSettings] = await Promise.all([
      prisma.adminTotpSecret.findUnique({
        where: { adminId: admin.id },
        select: { verified: true, updatedAt: true },
      }),
      prisma.adminRecoveryCode.count({
        where: { adminId: admin.id },
      }),
      getRecruitmentSettings(),
      getPublicContactSettings(),
    ]);

    isTotpEnabled = !!totpRecord?.verified;
    totpUpdatedAt = totpRecord?.verified && totpRecord.updatedAt ? totpRecord.updatedAt.toISOString() : null;
    recoveryCodesCount = codesCount;
    recruitmentStatus = recruitmentSetting.isOpen ? "Open" : "Closed";
    whatsappGroupConfigured = !!recruitmentSetting.whatsappGroupUrl;
    contactSettings = fetchedContactSettings;
  } catch (error) {
    console.error("[AdminSettingsPage] Error loading settings data:", error);
  }

  const platform = {
    appName: "Crescent Club of Finance Platform",
    appVersion: "v0.1.0",
    appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    environment: process.env.NODE_ENV || "development",
    databaseEngine: "PostgreSQL on Neon (Singapore)",
    storageProvider: "Backblaze B2 (CA East)",
    emailProvider: "Resend Transactional API",
    recruitmentStatus,
    whatsappGroupConfigured,
  };

  return (
    <AdminShell user={admin}>
      <AdminPageHeader
        eyebrow="System"
        title="Settings"
        description="Configure administrator authentication and platform settings."
      />

      <SettingsView
        admin={admin}
        initialIsTotpEnabled={isTotpEnabled}
        initialTotpUpdatedAt={totpUpdatedAt}
        initialRecoveryCodesCount={recoveryCodesCount}
        platform={platform}
        contactSettings={contactSettings}
      />
    </AdminShell>
  );
}
