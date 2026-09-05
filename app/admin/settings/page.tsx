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
  title: "Settings — CCF Admin",
  description: "System settings for Crescent Club of Finance.",
};

export default async function AdminSettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.active === false) {
    redirect("/admin/auth/login");
  }

  return (
    <AdminShell user={session.user}>
      <AdminPageHeader
        eyebrow="System"
        title="Settings"
        description="Platform configuration and administrative preferences."
      />

      <AdminEmptyState
        moduleTitle="Settings"
        description="The Settings management interface will be connected in a later implementation stage."
        iconName="Settings"
      />
    </AdminShell>
  );
}
