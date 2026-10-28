import { Metadata } from "next";
import { getCurrentAdmin } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { AdminShell, AdminPageHeader } from "@/components/admin";
import { EventForm } from "@/components/admin/events";

export const metadata: Metadata = {
  title: "Create Event — CCF Admin",
  description: "Create a new symposium, workshop, or competition on the CCF platform.",
};

export default async function CreateEventPage() {
  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/admin/auth/login?callbackUrl=/admin/events/new");
  }

  return (
    <AdminShell user={admin}>
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
