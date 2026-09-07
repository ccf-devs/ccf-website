import { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { AdminShell, AdminPageHeader } from "@/components/admin";
import { RegistrationListTable, AdminRegistrationItem } from "@/components/admin/registrations/registration-list-table";
import { prisma } from "@/lib/db/client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Registrations — CCF Admin",
  description: "Event registrations management for Crescent Club of Finance.",
};

export default async function AdminRegistrationsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.active === false) {
    redirect("/admin/auth/login");
  }

  let registrations: AdminRegistrationItem[] = [];
  let events: Array<{ id: string; name: string }> = [];

  try {
    const [dbEvents, dbRegistrations] = await Promise.all([
      prisma.event.findMany({
        select: { id: true, name: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.registration.findMany({
        take: 100,
        orderBy: { createdAt: "desc" },
        include: {
          event: {
            select: { id: true, name: true, slug: true },
          },
          payment: {
            select: {
              id: true,
              status: true,
              amount: true,
              currency: true,
              upiId: true,
              payeeName: true,
              paymentUri: true,
              userReference: true,
              verifiedAt: true,
              verifiedBy: true,
              verifiedByAdmin: {
                select: { id: true, name: true },
              },
              createdAt: true,
            },
          },
          team: {
            include: {
              members: {
                orderBy: { isLeader: "desc" },
              },
            },
          },
        },
      }),
    ]);

    events = dbEvents;
    registrations = dbRegistrations.map((r) => ({
      id: r.id,
      eventId: r.eventId,
      eventName: r.event.name,
      eventSlug: r.event.slug,
      registrationCode: r.registrationCode,
      status: r.status,
      registrationType: r.registrationType,
      participantType: r.participantType,
      participantName: r.participantName,
      collegeNormalized: r.collegeNormalized,
      identifierNormalized: r.identifierNormalized,
      createdAt: r.createdAt.toISOString(),
      paymentStatus: r.payment?.status || null,
      paymentAmount: r.payment?.amount ? String(r.payment.amount) : null,
      payment: r.payment
        ? {
            id: r.payment.id,
            status: r.payment.status,
            amount: String(r.payment.amount),
            currency: r.payment.currency,
            upiId: r.payment.upiId,
            payeeName: r.payment.payeeName,
            paymentUri: r.payment.paymentUri,
            userReference: r.payment.userReference,
            verifiedBy: r.payment.verifiedBy,
            verifierName: r.payment.verifiedByAdmin?.name || null,
            verifiedAt: r.payment.verifiedAt?.toISOString() || null,
            createdAt: r.payment.createdAt.toISOString(),
          }
        : null,
      team: r.team
        ? {
            id: r.team.id,
            name: r.team.name,
            members: r.team.members.map((m) => ({
              id: m.id,
              name: m.name,
              participantType: m.participantType,
              identifierNormalized: m.identifierNormalized,
              collegeNormalized: m.collegeNormalized,
              phone: m.phone,
              academicDepartment: m.academicDepartment,
              year: m.year,
              position: m.position,
              isLeader: m.isLeader,
            })),
          }
        : null,
    }));
  } catch (error) {
    console.error("[AdminRegistrationsPage] Failed to fetch registrations:", error);
  }

  return (
    <AdminShell user={session.user}>
      <AdminPageHeader
        eyebrow="Operations"
        title="Registrations"
        description="Review participant registrations, track payment statuses, and manage event capacity."
      />

      <RegistrationListTable registrations={registrations} events={events} />
    </AdminShell>
  );
}
