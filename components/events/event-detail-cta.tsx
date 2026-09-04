import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FadeIn } from "@/components/motion/fade-in";
import { CCF_EYEBROW } from "@/components/site/navigation-data";
import { type CcfEvent } from "@/lib/data/events";

interface EventDetailCtaProps {
  event: CcfEvent;
}

export function EventDetailCta({ event }: EventDetailCtaProps) {
  const isUpcoming = event.status === "UPCOMING";

  return (
    <section className="py-12 md:py-20">
      <FadeIn>
        <Card className="relative overflow-hidden bg-gradient-to-br from-ccf-surface via-ccf-surface to-ccf-surface-elevated border-ccf-gold/30 p-8 md:p-12 text-center shadow-lg">
          <div className="mx-auto max-w-2xl space-y-6">
            <div className="space-y-2">
              <span className="type-eyebrow text-ccf-gold">
                {CCF_EYEBROW}
              </span>
              <h2 className="type-h2 text-2xl md:text-3xl font-bold text-ccf-offwhite tracking-tight">
                {isUpcoming
                  ? "Interested in CCF Initiatives?"
                  : "Explore More CCF Events"}
              </h2>
              <p className="type-body text-sm md:text-base text-ccf-muted leading-relaxed">
                {isUpcoming
                  ? "Connect with Crescent Club of Finance to explore upcoming activities or discover membership opportunities."
                  : "Explore other events and activities organized by Crescent Club of Finance."}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              {isUpcoming ? (
                <>
                  <Button asChild variant="gold" size="lg">
                    <Link href="/join-us" className="inline-flex items-center gap-2">
                      <span>Join CCF</span>
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link href="/events">Explore All Events</Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild variant="gold" size="lg">
                    <Link href="/events" className="inline-flex items-center gap-2">
                      <span>Explore All Events</span>
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link href="/join-us">Join CCF</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </Card>
      </FadeIn>
    </section>
  );
}
