import { Metadata } from "next";
import { getCurrentAdmin } from "@/lib/auth/session";
import { AdminRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { AdminShell, AdminPageHeader, DashboardErrorState } from "@/components/admin";
import { DepartmentListTable, DepartmentItem } from "@/components/admin/departments";
import { prisma } from "@/lib/db/client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Departments — CCF Admin",
  description: "Operational management of the five CCF departments.",
};

export default async function AdminDepartmentsPage() {
  const admin = await getCurrentAdmin();

  if (!admin || (admin.role !== AdminRole.CCF_ADMIN && admin.role !== AdminRole.IT_ADMIN)) {
    redirect("/admin/auth/login?callbackUrl=/admin/departments");
    return null;
  }

  let departments: DepartmentItem[] = [];
  let isError = false;

  try {
    const rawDepts = await prisma.department.findMany({
      include: {
        _count: {
          select: {
            members: true,
            recruitmentApplications: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    departments = rawDepts;
  } catch (error) {
    console.error("[AdminDepartmentsPage] Failed to fetch departments:", error);
    isError = true;
  }

  return (
    <AdminShell user={admin}>
      <AdminPageHeader
        eyebrow="Content"
        title="Departments"
        description="Operational management of the five canonical CCF departments, active status, and member allocation."
      />

      {isError ? (
        <DashboardErrorState
          error="Live operational data is temporarily unavailable."
          retryUrl="/admin/departments"
          backUrl="/admin/dashboard"
          backLabel="Return to Dashboard"
        />
      ) : (
        <DepartmentListTable initialDepartments={departments} />
      )}
    </AdminShell>
  );
}
