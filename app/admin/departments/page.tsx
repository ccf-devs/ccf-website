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
  title: "Departments — CCF Admin",
  description: "Departments management for Crescent Club of Finance.",
};

export default async function AdminDepartmentsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.active === false) {
    redirect("/admin/auth/login");
  }

  return (
    <AdminShell user={session.user}>
      <AdminPageHeader
        eyebrow="Content"
        title="Departments"
        description="Operational management of the five CCF departments."
      />

      <AdminEmptyState
        moduleTitle="Departments"
        description="The Departments management interface will be connected in a later implementation stage."
        iconName="Layers"
      />
    </AdminShell>
  );
}
