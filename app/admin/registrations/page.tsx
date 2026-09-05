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
  title: "Registrations — CCF Admin",
  description: "Event registrations management for Crescent Club of Finance.",
};

export default async function AdminRegistrationsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.active === false) {
    redirect("/admin/auth/login");
  }

  return (
    <AdminShell user={session.user}>
      <AdminPageHeader
        eyebrow="Operations"
        title="Registrations"
        description="Review participant registrations, team allocations, and event capacity limits."
      />

      <AdminEmptyState
        moduleTitle="Registrations"
        description="The Registrations management interface will be connected in a later implementation stage."
        iconName="ClipboardCheck"
      />
    </AdminShell>
  );
}
