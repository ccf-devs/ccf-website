import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Calendar, ShieldCheck, Ticket } from "lucide-react";
import { Container } from "@/components/site/container";
import { Badge } from "@/components/ui/badge";
import { FadeIn } from "@/components/motion/fade-in";
import { prisma } from "@/lib/db/client";
import { toEventFieldDomain, EventFieldDomain } from "@/lib/forms/types";
import {
  RegistrationMode,
  RegistrationMethod,
  EventCapacityMode,
  RegistrationStatus,
  EventStatus,
  PaymentMode,
} from "@prisma/client";
import {
  RegistrationForm,
  RegistrationStatusNotice,
} from "@/components/registration";
import { getEventBySlug } from "@/lib/data/events";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  let eventName: string | undefined;

  try {
    const event = await prisma.event.findUnique({
      where: { slug },
      select: { name: true },
    });
    eventName = event?.name;
  } catch {
    eventName = getEventBySlug(slug)?.name;
  }

  if (!eventName) {
    return {
      title: "Registration Not Found — Crescent Club of Finance",
    };
  }

  return {
    title: `Register: ${eventName} — Crescent Club of Finance`,
    description: `Official registration portal for ${eventName}.`,
  };
}

export default async function EventRegistrationPage({ params }: PageProps) {
  const { slug } = await params;

  let event: any = null;
  let dbError = false;
  try {
    event = await prisma.event.findUnique({
      where: { slug },
      include: {
        activeFormVersion: {
          include: {
            eventFields: {
              orderBy: { displayOrder: "asc" },
            },
          },
        },
      },
    });
  } catch (error) {
    console.error(`[EventRegistrationPage] Database query failed for event slug "${slug}":`, error);
    dbError = true;
  }

  if (dbError) {
    return (
      <Container className="py-12 md:py-20">
        <RegistrationStatusNotice
          reason="UNAVAILABLE"
          eventName={getEventBySlug(slug)?.name || "this event"}
          eventSlug={slug}
        />
      </Container>
    );
  }

  if (!event) {
    notFound();
  }

  // If event uses external registration or no registration
  if (event.registrationMode === RegistrationMode.EXTERNAL) {
    return (
      <Container className="py-12 md:py-20">
        <RegistrationStatusNotice
          reason="EXTERNAL_MODE"
          eventName={event.name}
          eventSlug={event.slug}
        />
      </Container>
    );
  }

  if (
    event.registrationMode !== RegistrationMode.INTERNAL ||
    event.registrationMethod !== RegistrationMethod.BUILT_IN ||
    event.status !== EventStatus.PUBLISHED
  ) {
    return (
      <Container className="py-12 md:py-20">
        <RegistrationStatusNotice
          reason="NOT_INTERNAL"
          eventName={event.name}
          eventSlug={event.slug}
        />
      </Container>
    );
  }

  const now = new Date();

  // Registration window checks
  if (event.registrationOpensAt && now < event.registrationOpensAt) {
    return (
      <Container className="py-12 md:py-20">
        <RegistrationStatusNotice
          reason="NOT_OPEN_YET"
          eventName={event.name}
          eventSlug={event.slug}
          opensAt={event.registrationOpensAt.toISOString()}
        />
      </Container>
    );
  }

  if (event.registrationClosesAt && now > event.registrationClosesAt) {
    return (
      <Container className="py-12 md:py-20">
        <RegistrationStatusNotice
          reason="CLOSED"
          eventName={event.name}
          eventSlug={event.slug}
          closesAt={event.registrationClosesAt.toISOString()}
        />
      </Container>
    );
  }

  // Capacity checks
  let isFull = false;
  try {
    if (
      event.capacityMode === EventCapacityMode.PARTICIPANTS &&
      event.capacity !== null
    ) {
      const activeCount = await prisma.eventParticipant.count({
        where: {
          eventId: event.id,
          registration: { status: RegistrationStatus.ACTIVE },
        },
      });

      if (activeCount >= event.capacity) {
        isFull = true;
      }
    } else if (
      event.capacityMode === EventCapacityMode.TEAMS &&
      event.capacity !== null
    ) {
      const activeTeams = await prisma.registration.count({
        where: {
          eventId: event.id,
          status: RegistrationStatus.ACTIVE,
        },
      });

      if (activeTeams >= event.capacity) {
        isFull = true;
      }
    }
  } catch (error) {
    console.error(`[EventRegistrationPage] Failed to evaluate event capacity for "${event.slug}":`, error);
    return (
      <Container className="py-12 md:py-20">
        <RegistrationStatusNotice
          reason="UNAVAILABLE"
          eventName={event.name}
          eventSlug={event.slug}
        />
      </Container>
    );
  }

  if (isFull) {
    return (
      <Container className="py-12 md:py-20">
        <RegistrationStatusNotice
          reason="FULL"
          eventName={event.name}
          eventSlug={event.slug}
        />
      </Container>
    );
  }

  // Verify active FormVersion exists
  if (!event.activeFormVersion || !event.activeFormVersion.eventFields) {
    return (
      <Container className="py-12 md:py-20">
        <RegistrationStatusNotice
          reason="NOT_INTERNAL"
          eventName={event.name}
          eventSlug={event.slug}
        />
      </Container>
    );
  }

  const domainFields: EventFieldDomain[] =
    event.activeFormVersion.eventFields.map(toEventFieldDomain);

  // Determine team configuration from active form version semantics
  const teamRosterField = domainFields.find(
    (f) =>
      f.fieldScope === "TEAM_MEMBER" ||
      (f.config?.isSystem && f.config.systemKey === "team_membership") ||
      f.key === "team_members" ||
      f.key === "team_membership"
  );

  const teamNameField = domainFields.find(
    (f) =>
      f.fieldScope === "TEAM" ||
      (f.config?.isSystem && f.config.systemKey === "team_name") ||
      f.key === "team_name"
  );

  const regTypeChoiceField = domainFields.find(
    (f) =>
      f.key === "registration_type" ||
      (f.config?.isSystem && (f.config as any).systemKey === "registration_type")
  );

  const isTeamRegistration = Boolean(teamNameField || teamRosterField);
  const allowModeChoice = Boolean(regTypeChoiceField);

  const minTeamSize =
    teamRosterField?.validation?.min ??
    (teamRosterField?.config as any)?.minTeamSize;
  const maxTeamSize =
    teamRosterField?.validation?.max ??
    (teamRosterField?.config as any)?.maxTeamSize;

  const teamConfig = {
    isTeamRegistration,
    allowModeChoice,
    teamNameRequired: teamNameField ? teamNameField.required : true,
    minTeamSize: typeof minTeamSize === "number" ? minTeamSize : undefined,
    maxTeamSize: typeof maxTeamSize === "number" ? maxTeamSize : undefined,
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-ccf-navy-dark via-ccf-navy to-ccf-navy py-10 md:py-14 border-b border-border/40">
        <Container className="space-y-4">
          <FadeIn direction="down" duration={0.3}>
            <Link
              href={`/events/${event.slug}`}
              className="inline-flex items-center gap-2 text-xs md:text-sm font-medium text-ccf-muted hover:text-ccf-gold transition-colors group"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              <span>Back to Event Overview</span>
            </Link>
          </FadeIn>

          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="editorial-tag text-ccf-gold">
                {isTeamRegistration ? "TEAM EVENT REGISTRATION" : "OFFICIAL REGISTRATION"}
              </span>
              <span className="text-border/60">•</span>
              <Badge variant="success" dot className="text-xs">
                Registration Open
              </Badge>
              {isTeamRegistration && (
                <Badge variant="gold" className="text-xs font-mono">
                  Team Format
                </Badge>
              )}
              {event.paymentMode === "PAID" && event.feeAmount ? (
                <Badge variant="gold" className="text-xs font-mono">
                  Fee: ₹{String(event.feeAmount)}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs font-mono text-emerald-400 border-emerald-500/30">
                  Free Event
                </Badge>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-ccf-offwhite tracking-tight">
              {event.name}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-ccf-muted pt-1">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-ccf-gold" />
                <span>
                  Eligible:{" "}
                  {event.eligibilityCrescent && event.eligibilityExternal
                    ? "Crescent & External Institutions"
                    : event.eligibilityCrescent
                    ? "Crescent Students Only"
                    : "External Participants Only"}
                </span>
              </div>
              {event.startsAt && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-ccf-gold" />
                  <span>
                    Event Date:{" "}
                    {new Date(event.startsAt).toLocaleDateString("en-IN", {
                      dateStyle: "medium",
                      timeZone: "Asia/Kolkata",
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>
        </Container>
      </section>

      {/* Main Registration Form Body */}
      <main className="py-10 md:py-16 flex-1 bg-ccf-navy">
        <Container>
          <RegistrationForm
            event={{
              id: event.id,
              slug: event.slug,
              name: event.name,
              eligibilityCrescent: event.eligibilityCrescent,
              eligibilityExternal: event.eligibilityExternal,
              paymentMode: event.paymentMode,
              feeAmount: event.feeAmount ? String(event.feeAmount) : null,
              capacityMode: event.capacityMode,
            }}
            fields={domainFields}
            teamConfig={teamConfig}
          />
        </Container>
      </main>
    </div>
  );
}
