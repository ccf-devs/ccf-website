import React from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, Users } from "lucide-react";
import { Container } from "@/components/site/container";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/motion/fade-in";
import { EVENTS_CTA } from "@/lib/data/events";

export function EventsCta() {
  return (
    <section className="py-20 md:py-28 relative overflow-hidden bg-background">
      <Container>
        <FadeIn direction="up">
          <div className="relative rounded-2xl border border-ccf-gold/30 bg-gradient-to-b from-ccf-surface via-ccf-surface to-ccf-surface-sunken p-8 md:p-14 text-center overflow-hidden shadow-xl">
            {/* Background subtle gold glow */}
            <div
              className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-ccf-gold/10 rounded-full blur-3xl pointer-events-none"
              aria-hidden="true"
            />

            <div className="relative z-10 max-w-3xl mx-auto space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-ccf-gold/30 bg-ccf-surface-elevated/60 px-3.5 py-1 text-xs font-medium text-ccf-gold">
                <Sparkles className="h-3.5 w-3.5 text-ccf-gold" aria-hidden="true" />
                <span>{EVENTS_CTA.eyebrow}</span>
              </div>

              <h2 className="type-h1 text-ccf-offwhite leading-tight">
                {EVENTS_CTA.heading}
              </h2>

              <p className="type-body text-ccf-muted max-w-xl mx-auto text-base md:text-lg leading-relaxed">
                {EVENTS_CTA.description}
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <Button asChild size="lg" className="w-full sm:w-auto">
                  <Link href={EVENTS_CTA.primaryCtaHref} className="inline-flex items-center gap-2 font-semibold">
                    <Users className="h-4 w-4" aria-hidden="true" />
                    <span>{EVENTS_CTA.primaryCtaText}</span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>

                <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
                  <Link href={EVENTS_CTA.secondaryCtaHref} className="inline-flex items-center gap-2">
                    <span>{EVENTS_CTA.secondaryCtaText}</span>
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </FadeIn>
      </Container>
    </section>
  );
}
