import { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { AdminShell, AdminPageHeader } from "@/components/admin";
import { EventForm } from "@/components/admin/events";

export const metadata: Metadata = {
  title: "Create Event — CCF Admin",
  description: "Create a new symposium, workshop, or competition on the CCF platform.",
};

export default async function CreateEventPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.active === false) {
    redirect("/admin/auth/login");
  }

  return (
    <AdminShell user={session.user}>
      <AdminPageHeader
        eyebrow="Events"
        title="Create Event"
        description="Configure a new finance symposium, competition, or student workshop."
      />

      <div className="max-w-4xl">
        <EventForm mode="create" />
      </div>
    </AdminShell>
  );
}
