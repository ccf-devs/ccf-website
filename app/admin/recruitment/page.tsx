import { Metadata } from "next";
import { getCurrentAdmin } from "@/lib/auth/session";
import { AdminRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { AdminShell, AdminPageHeader } from "@/components/admin";
import { RecruitmentManager } from "@/components/admin/recruitment";
import {
  getRecruitmentSettings,
  getAdminRecruitmentApplications,
} from "@/lib/recruitment/service";
import { prisma } from "@/lib/db/client";
import {
  RecruitmentSettings,
  AdminRecruitmentApplicationItem,
} from "@/lib/recruitment/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Recruitment — CCF Admin",
  description: "Recruitment applications management for Crescent Club of Finance.",
};

export default async function AdminRecruitmentPage() {
  const admin = await getCurrentAdmin();

  if (!admin || (admin.role !== AdminRole.CCF_ADMIN && admin.role !== AdminRole.IT_ADMIN)) {
    redirect("/admin/auth/login");
  }


  let settings: RecruitmentSettings = {
    isOpen: false,
    whatsappGroupUrl: null,
  };
  let applications: AdminRecruitmentApplicationItem[] = [];
  let departments: Array<{ id: string; name: string }> = [];

  try {
    const [settingsRes, appsRes, deptsRes] = await Promise.all([
      getRecruitmentSettings(),
      getAdminRecruitmentApplications(),
      prisma.department.findMany({
        where: { active: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);
    settings = settingsRes;
    applications = appsRes;
    departments = deptsRes;
  } catch (error) {
    console.error("[AdminRecruitmentPage] Error loading initial recruitment data:", error);
  }

  return (
    <AdminShell user={admin}>
      <AdminPageHeader
        eyebrow="Operations"
        title="Recruitment"
        description="Oversee student recruitment applications across CCF operational departments."
      />

      <RecruitmentManager
        initialSettings={settings}
        initialApplications={applications}
        departments={departments}
      />
    </AdminShell>
  );
}
