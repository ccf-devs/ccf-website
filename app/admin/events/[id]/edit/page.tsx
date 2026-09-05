import { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AdminShell, AdminPageHeader } from "@/components/admin";
import { EventForm, EventFormInitialData } from "@/components/admin/events";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { AlertCircle, ArrowLeft } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const event = await prisma.event.findUnique({
      where: { id },
      select: { name: true },
    });
    return {
      title: event ? `Edit ${event.name} — CCF Admin` : "Edit Event — CCF Admin",
    };
  } catch {
    return {
      title: "Edit Event — CCF Admin",
    };
  }
}

export default async function AdminEditEventPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.active === false) {
    redirect("/admin/auth/login");
  }

  const { id } = await params;

  let initialData: EventFormInitialData | null = null;
  let errorMessage: string | null = null;

  try {
    const rawEvent = await prisma.event.findUnique({
      where: { id },
      include: {
        content: true,
      },
    });

    if (!rawEvent) {
      errorMessage = "Event record not found in database.";
    } else {
      initialData = {
        id: rawEvent.id,
        name: rawEvent.name,
        slug: rawEvent.slug,
        status: rawEvent.status,
        startsAt: rawEvent.startsAt,
        endsAt: rawEvent.endsAt,
        venue: rawEvent.venue,
        capacityMode: rawEvent.capacityMode,
        capacity: rawEvent.capacity,
        registrationMode: rawEvent.registrationMode,
        registrationMethod: rawEvent.registrationMethod,
        eligibilityCrescent: rawEvent.eligibilityCrescent,
        eligibilityExternal: rawEvent.eligibilityExternal,
        registrationOpensAt: rawEvent.registrationOpensAt,
        registrationClosesAt: rawEvent.registrationClosesAt,
        paymentMode: rawEvent.paymentMode,
        paymentMethod: rawEvent.paymentMethod,
        feeAmount: rawEvent.feeAmount ? Number(rawEvent.feeAmount) : null,
        upiId: rawEvent.upiId,
        payeeName: rawEvent.payeeName,

        // Canonical EventContent
        descriptionRich: rawEvent.content?.descriptionRich ?? null,
        rulesRich: rawEvent.content?.rulesRich ?? null,
        instructionsRich: rawEvent.content?.instructionsRich ?? null,
        eligibilityRich: rawEvent.content?.eligibilityRich ?? null,
        notesRich: rawEvent.content?.notesRich ?? null,
      };
    }
  } catch (error) {
    errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to connect to database to retrieve event.";
  }

  return (
    <AdminShell user={session.user}>
      <AdminPageHeader
        eyebrow="Events"
        title={initialData ? `Edit ${initialData.name}` : "Edit Event"}
        description={
          initialData
            ? `Modify configuration for ${initialData.name} (/${initialData.slug})`
            : "Update event settings and lifecycle state."
        }
      />

      {errorMessage || !initialData ? (
        <Card className="rounded-xl border border-red-500/30 bg-red-950/20 p-8 shadow-sm space-y-4 max-w-2xl">
          <div className="flex items-start gap-4">
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-2.5 text-red-400 shrink-0">
              <AlertCircle className="h-6 w-6" aria-hidden="true" />
            </div>
            <div className="space-y-1.5 flex-1">
              <h3 className="text-base font-semibold text-red-200">
                Unable to Load Event for Editing
              </h3>
              <p className="text-sm text-red-300/80 leading-relaxed">
                {errorMessage || "The requested event could not be found."}
              </p>
            </div>
          </div>

          <div className="border-t border-red-500/20 pt-4">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="border-red-500/30 text-red-200 hover:bg-red-500/10"
            >
              <Link href="/admin/events">
                <ArrowLeft className="h-4 w-4 mr-1.5" aria-hidden="true" />
                <span>Return to Events List</span>
              </Link>
            </Button>
          </div>
        </Card>
      ) : (
        <div className="max-w-4xl">
          <EventForm mode="edit" initialData={initialData} eventId={id} />
        </div>
      )}
    </AdminShell>
  );
}
