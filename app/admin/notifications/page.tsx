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
  title: "Notifications — CCF Admin",
  description: "Notifications management for Crescent Club of Finance.",
};

export default async function AdminNotificationsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.active === false) {
    redirect("/admin/auth/login");
  }

  return (
    <AdminShell user={session.user}>
      <AdminPageHeader
        eyebrow="System"
        title="Notifications"
        description="Manage administrative alerts and communication broadcasts."
      />

      <AdminEmptyState
        moduleTitle="Notifications"
        description="The Notifications management interface will be connected in a later implementation stage."
        iconName="Bell"
      />
    </AdminShell>
  );
}
