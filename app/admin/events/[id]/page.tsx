import { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AdminShell, AdminPageHeader } from "@/components/admin";
import { EventDetailView, EventDetailData } from "@/components/admin/events";
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
      title: event ? `${event.name} — CCF Admin` : "Event Details — CCF Admin",
    };
  } catch {
    return {
      title: "Event Details — CCF Admin",
    };
  }
}

export default async function AdminEventDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.active === false) {
    redirect("/admin/auth/login");
  }

  const { id } = await params;

  let event: EventDetailData | null = null;
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
      event = {
        ...rawEvent,
        feeAmount: rawEvent.feeAmount ? Number(rawEvent.feeAmount) : null,
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
        title={event ? event.name : "Event Details"}
        description={
          event
            ? `Managing configuration for ${event.name} (/${event.slug})`
            : "Review event operational configuration."
        }
      />

      {errorMessage || !event ? (
        <Card className="rounded-xl border border-red-500/30 bg-red-950/20 p-8 shadow-sm space-y-4 max-w-2xl">
          <div className="flex items-start gap-4">
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-2.5 text-red-400 shrink-0">
              <AlertCircle className="h-6 w-6" aria-hidden="true" />
            </div>
            <div className="space-y-1.5 flex-1">
              <h3 className="text-base font-semibold text-red-200">
                Unable to Load Event
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
        <EventDetailView event={event} />
      )}
    </AdminShell>
  );
}
