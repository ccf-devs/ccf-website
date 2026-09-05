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
  title: "Recruitment — CCF Admin",
  description: "Recruitment applications management for Crescent Club of Finance.",
};

export default async function AdminRecruitmentPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.active === false) {
    redirect("/admin/auth/login");
  }

  return (
    <AdminShell user={session.user}>
      <AdminPageHeader
        eyebrow="Operations"
        title="Recruitment"
        description="Oversee student recruitment applications across CCF operational departments."
      />

      <AdminEmptyState
        moduleTitle="Recruitment"
        description="The Recruitment management interface will be connected in a later implementation stage."
        iconName="UserPlus"
      />
    </AdminShell>
  );
}
