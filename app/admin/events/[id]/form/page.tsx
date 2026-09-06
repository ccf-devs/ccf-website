import { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AdminShell } from "@/components/admin";
import { FormBuilder } from "@/components/admin/forms";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { AlertCircle, ArrowLeft, Info } from "lucide-react";
import { RegistrationMode } from "@prisma/client";

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
      title: event ? `Form Builder: ${event.name} — CCF Admin` : "Form Builder — CCF Admin",
    };
  } catch {
    return {
      title: "Form Builder — CCF Admin",
    };
  }
}

export default async function AdminEventFormPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.active === false) {
    redirect("/admin/auth/login");
  }

  // Verify CCF_ADMIN or IT_ADMIN authorization
  const role = session.user.role;
  if (role !== "CCF_ADMIN" && role !== "IT_ADMIN") {
    redirect("/admin");
  }

  const { id } = await params;

  let event: any = null;
  let errorMessage: string | null = null;

  try {
    event = await prisma.event.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        registrationMode: true,
        activeFormVersionId: true,
        formVersions: {
          orderBy: { versionNumber: "desc" },
          include: {
            _count: {
              select: { eventFields: true },
            },
          },
        },
      },
    });

    if (!event) {
      errorMessage = "Event record not found in database.";
    }
  } catch (err: any) {
    console.error("[AdminEventFormPage] Error loading event:", err);
    errorMessage = "Failed to query event record.";
  }

  const initialVersions =
    event?.formVersions.map((v: any) => ({
      id: v.id,
      eventId: v.eventId,
      versionNumber: v.versionNumber,
      status: v.status,
      publishedAt: v.publishedAt,
      createdAt: v.createdAt,
      updatedAt: v.updatedAt,
      fieldsCount: v._count.eventFields,
    })) || [];

  return (
    <AdminShell user={session.user}>
      <div className="space-y-6">
        {errorMessage ? (
          <Card className="border-red-500/30 bg-red-950/20 p-6 space-y-4">
            <div className="flex items-center gap-2.5 text-red-400">
              <AlertCircle className="h-5 w-5" />
              <h3 className="font-semibold text-sm">Error Loading Event Form</h3>
            </div>
            <p className="text-xs text-ccf-muted">{errorMessage}</p>
            <Button asChild variant="outline" size="sm" className="border-border">
              <Link href="/admin/events">
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Back to Events
              </Link>
            </Button>
          </Card>
        ) : (
          <>
            {event.registrationMode === RegistrationMode.EXTERNAL && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 text-xs text-amber-300 flex items-start gap-3">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-semibold">Notice: External Registration Mode</span>
                  <p className="text-amber-200/80 leading-relaxed">
                    This event is currently set to{" "}
                    <strong className="text-white">RegistrationMode: EXTERNAL</strong>. Public
                    visitors are redirected to an external URL. Internal dynamic registration forms
                    are only served to participants when RegistrationMode is configured as{" "}
                    <strong className="text-white">INTERNAL</strong>. You may still construct and
                    publish form versions here in advance.
                  </p>
                </div>
              </div>
            )}

            <FormBuilder
              eventId={event.id}
              eventName={event.name}
              activeFormVersionId={event.activeFormVersionId}
              initialVersions={initialVersions}
            />
          </>
        )}
      </div>
    </AdminShell>
  );
}
