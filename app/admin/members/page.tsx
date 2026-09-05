import { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import {
  AdminShell,
  AdminPageHeader,
  AdminEmptyState,
} from "@/components/admin";

export const metadata: Metadata = {
  title: "Members — CCF Admin",
  description: "Members directory management for Crescent Club of Finance.",
};

export default async function AdminMembersPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.active === false) {
    redirect("/admin/auth/login");
  }

  return (
    <AdminShell user={session.user}>
      <AdminPageHeader
        eyebrow="Content"
        title="Members"
        description="Manage student executive directory, hierarchy ordering, and department assignments."
      />

      <AdminEmptyState
        moduleTitle="Members"
        description="The Members management interface will be connected in a later implementation stage."
        iconName="Users"
      />
    </AdminShell>
  );
}
