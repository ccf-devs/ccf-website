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
  title: "Media — CCF Admin",
  description: "Media gallery assets management for Crescent Club of Finance.",
};

export default async function AdminMediaPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.active === false) {
    redirect("/admin/auth/login");
  }

  return (
    <AdminShell user={session.user}>
      <AdminPageHeader
        eyebrow="Operations"
        title="Media"
        description="Manage photo gallery assets and production media delivery."
      />

      <AdminEmptyState
        moduleTitle="Media"
        description="The Media management interface will be connected in a later implementation stage."
        iconName="Image"
      />
    </AdminShell>
  );
}
