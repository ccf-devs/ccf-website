import React from "react";
import Link from "next/link";
import { ArrowRight, ExternalLink, Calendar, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FadeIn } from "@/components/motion/fade-in";
import { type CcfEvent } from "@/lib/data/events";

interface EventRegistrationCtaProps {
  event: CcfEvent;
}

export function EventRegistrationCta({ event }: EventRegistrationCtaProps) {
  const now = new Date();
  const opensAt = event.registrationOpensAt ? new Date(event.registrationOpensAt) : null;
  const closesAt = event.registrationClosesAt ? new Date(event.registrationClosesAt) : null;

  // Determine which registration case applies
  const isExternal = event.registrationMode === "EXTERNAL";
  const isInternal = event.registrationMode === "INTERNAL";

  // Check timing for internal registrations
  const isClosed = isInternal && (
    (closesAt !== null && now > closesAt) ||
    event.status === "PREVIOUS EVENT"
  );
  const isOpensSoon = isInternal && !isClosed && (
    opensAt !== null && now < opensAt
  );
  const isOpen = isInternal && !isClosed && !isOpensSoon;

  // Format opening date/time if available
  const formattedOpensAt = opensAt && !isNaN(opensAt.getTime())
    ? opensAt.toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    : null;

  // CASE A: INTERNAL + REGISTRATION OPEN
  if (isOpen) {
    return (
      <section aria-label="Event Registration" className="py-6 md:py-8 border-b border-border/30">
        <FadeIn>
          <Card className="relative overflow-hidden bg-gradient-to-br from-ccf-surface via-ccf-surface to-ccf-surface-elevated border-ccf-gold/40 p-6 md:p-8 shadow-lg">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-xl">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true" />
                  <span className="type-eyebrow text-xs text-ccf-gold uppercase tracking-wider font-semibold">
                    Official Registration
                  </span>
                </div>
                <h2 className="type-h2 text-xl md:text-2xl font-bold text-ccf-offwhite tracking-tight">
                  Registration is Open
                </h2>
                <p className="type-body text-xs md:text-sm text-ccf-muted leading-relaxed">
                  Secure your participation for {event.name}. Online registration is currently active through the official CCF registration engine.
                </p>
              </div>

              <div className="shrink-0 w-full sm:w-auto">
                <Button asChild variant="gold" size="lg" className="w-full sm:w-auto font-semibold shadow-md">
                  <Link
                    href={`/events/${event.slug}/register`}
                    className="inline-flex items-center justify-center gap-2"
                  >
                    <span>Register Now</span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </div>
          </Card>
        </FadeIn>
      </section>
    );
  }

  // CASE B: INTERNAL + OPENS SOON
  if (isOpensSoon) {
    return (
      <section aria-label="Event Registration" className="py-6 md:py-8 border-b border-border/30">
        <FadeIn>
          <Card className="relative overflow-hidden bg-ccf-surface border-ccf-gold/30 p-6 md:p-8 shadow-sm">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-xl">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-ccf-gold" aria-hidden="true" />
                  <span className="type-eyebrow text-xs text-ccf-gold uppercase tracking-wider font-semibold">
                    Upcoming Registration
                  </span>
                </div>
                <h2 className="type-h2 text-xl md:text-2xl font-bold text-ccf-offwhite tracking-tight">
                  Registration Opens Soon
                </h2>
                <p className="type-body text-xs md:text-sm text-ccf-muted leading-relaxed">
                  {formattedOpensAt
                    ? `Registration will officially open on ${formattedOpensAt}. Please check back once the registration window opens.`
                    : "Registration for this event will open shortly. Please check back soon for official access."}
                </p>
              </div>

              <div className="shrink-0">
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border/60 bg-ccf-surface-sunken text-xs font-medium text-ccf-muted">
                  <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{formattedOpensAt ? `Opens ${formattedOpensAt}` : "Opening Soon"}</span>
                </span>
              </div>
            </div>
          </Card>
        </FadeIn>
      </section>
    );
  }

  // CASE C: INTERNAL + REGISTRATION CLOSED
  if (isClosed) {
    return (
      <section aria-label="Event Registration" className="py-6 md:py-8 border-b border-border/30">
        <FadeIn>
          <Card className="relative overflow-hidden bg-ccf-surface/80 border-border/50 p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-1.5 max-w-xl">
                <span className="type-eyebrow text-xs text-ccf-muted uppercase tracking-wider font-semibold">
                  Registration Window
                </span>
                <h2 className="type-h2 text-xl md:text-2xl font-bold text-ccf-offwhite tracking-tight">
                  Registration Closed
                </h2>
                <p className="type-body text-xs md:text-sm text-ccf-muted leading-relaxed">
                  Registration for {event.name} has concluded. No new registrations are being accepted at this time.
                </p>
              </div>

              <div className="shrink-0">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border/50 bg-ccf-surface-sunken text-xs font-medium text-ccf-muted">
                  Concluded
                </span>
              </div>
            </div>
          </Card>
        </FadeIn>
      </section>
    );
  }

  // CASE D: EXTERNAL REGISTRATION
  if (isExternal) {
    const externalUrl = event.externalRegistrationUrl || "";
    return (
      <section aria-label="Event Registration" className="py-6 md:py-8 border-b border-border/30">
        <FadeIn>
          <Card className="relative overflow-hidden bg-gradient-to-br from-ccf-surface via-ccf-surface to-ccf-surface-elevated border-ccf-gold/30 p-6 md:p-8 shadow-sm">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-xl">
                <span className="type-eyebrow text-xs text-ccf-gold uppercase tracking-wider font-semibold">
                  External Registration
                </span>
                <h2 className="type-h2 text-xl md:text-2xl font-bold text-ccf-offwhite tracking-tight">
                  Registration
                </h2>
                <p className="type-body text-xs md:text-sm text-ccf-muted leading-relaxed">
                  Registration is handled through the official registration link.
                </p>
              </div>

              {externalUrl ? (
                <div className="shrink-0 w-full sm:w-auto">
                  <Button asChild variant="gold" size="lg" className="w-full sm:w-auto font-semibold shadow-md">
                    <a
                      href={externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2"
                    >
                      <span>Register Now</span>
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    </a>
                  </Button>
                </div>
              ) : null}
            </div>
          </Card>
        </FadeIn>
      </section>
    );
  }

  // CASE E: NO REGISTRATION REQUIRED / NOT CONFIGURED
  return (
    <section aria-label="Event Registration" className="py-6 md:py-8 border-b border-border/30">
      <FadeIn>
        <Card className="bg-ccf-surface/60 border-border/40 p-5 md:p-6">
          <div className="flex items-start sm:items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-ccf-gold shrink-0 mt-0.5 sm:mt-0" aria-hidden="true" />
            <div>
              <h2 className="text-sm font-semibold text-ccf-offwhite">
                No registration is required for this event.
              </h2>
              <p className="text-xs text-ccf-muted mt-0.5">
                This event is open to attendees without prior registration or credentials.
              </p>
            </div>
          </div>
        </Card>
      </FadeIn>
    </section>
  );
}
