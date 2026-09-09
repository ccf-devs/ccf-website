import { Metadata } from "next";
import { getCurrentAdmin } from "@/lib/auth/session";
import { AdminRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { AdminShell, AdminPageHeader, DashboardErrorState } from "@/components/admin";
import { MemberListTable, MemberItem, MemberDepartmentInfo } from "@/components/admin/members";
import { prisma } from "@/lib/db/client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Members — CCF Admin",
  description: "Executive and student leadership directory management for Crescent Club of Finance.",
};

export default async function AdminMembersPage() {
  const admin = await getCurrentAdmin();

  if (!admin || (admin.role !== AdminRole.CCF_ADMIN && admin.role !== AdminRole.IT_ADMIN)) {
    redirect("/admin/auth/login?callbackUrl=/admin/members");
    return null;
  }

  let members: MemberItem[] = [];
  let departments: MemberDepartmentInfo[] = [];
  let isError = false;

  try {
    const [rawMembers, rawDepts] = await Promise.all([
      prisma.member.findMany({
        include: {
          department: {
            select: {
              id: true,
              name: true,
              slug: true,
              active: true,
            },
          },
          photo: {
            select: {
              id: true,
              objectKey: true,
              altText: true,
            },
          },
        },
        orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      }),
      prisma.department.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          active: true,
        },
        orderBy: { name: "asc" },
      }),
    ]);

    members = rawMembers.map((m) => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    }));
    departments = rawDepts;
  } catch (error) {
    console.error("[AdminMembersPage] Failed to fetch members:", error);
    isError = true;
  }

  return (
    <AdminShell user={admin}>
      <AdminPageHeader
        eyebrow="Content"
        title="Members"
        description="Manage the student executive directory, role designations, hierarchy ordering, and department allocations."
      />

      {isError ? (
        <DashboardErrorState
          error="Live operational data is temporarily unavailable."
          retryUrl="/admin/members"
          backUrl="/admin/dashboard"
          backLabel="Return to Dashboard"
        />
      ) : (
        <MemberListTable initialMembers={members} departments={departments} />
      )}
    </AdminShell>
  );
}
