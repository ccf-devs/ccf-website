import { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AdminShell,
  AdminPageHeader,
} from "@/components/admin";
import { EventListTable, EventListItem } from "@/components/admin/events";
import { prisma } from "@/lib/db/client";

export const metadata: Metadata = {
  title: "Events — CCF Admin",
  description: "Configure and manage symposiums, workshops, and competitions.",
};

export default async function AdminEventsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.active === false) {
    redirect("/admin/auth/login");
  }

  let events: EventListItem[] = [];
  let dbError: string | null = null;

  try {
    const rawEvents = await prisma.event.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        slug: true,
        name: true,
        status: true,
        startsAt: true,
        endsAt: true,
        venue: true,
        capacity: true,
        capacityMode: true,
        registrationMode: true,
        paymentMode: true,
        createdAt: true,
      },
    });

    events = rawEvents.map((e) => ({
      ...e,
      status: e.status,
      capacityMode: e.capacityMode,
      registrationMode: e.registrationMode,
      paymentMode: e.paymentMode,
    }));
  } catch (error) {
    // Correction 4: Capture database errors explicitly so the UI
    // renders an explicit error state and NEVER falsely pretends that 0 events exist.
    dbError =
      error instanceof Error ? error.message : "Database connection unavailable";
  }

  return (
    <AdminShell user={session.user}>
      <AdminPageHeader
        eyebrow="Content"
        title="Events"
        description="Configure upcoming and past symposiums, workshops, and student initiatives."
      >
        <Button
          asChild
          className="bg-ccf-gold text-ccf-navy hover:bg-ccf-gold-light font-semibold shadow-sm text-xs h-9 px-3.5"
        >
          <Link href="/admin/events/new">
            <Plus className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
            <span>Create Event</span>
          </Link>
        </Button>
      </AdminPageHeader>

      <EventListTable events={events} dbError={dbError} />
    </AdminShell>
  );
}
