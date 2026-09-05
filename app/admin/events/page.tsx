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
  title: "Events — CCF Admin",
  description: "Events management for Crescent Club of Finance.",
};

export default async function AdminEventsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.active === false) {
    redirect("/admin/auth/login");
  }

  return (
    <AdminShell user={session.user}>
      <AdminPageHeader
        eyebrow="Content"
        title="Events"
        description="Configure upcoming and past symposiums, workshops, and student initiatives."
      />

      <AdminEmptyState
        moduleTitle="Events"
        description="The Events management interface will be connected in a later implementation stage."
        iconName="Calendar"
      />
    </AdminShell>
  );
}
