import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Container } from "@/components/site/container";
import { Badge } from "@/components/ui/badge";
import { FadeIn } from "@/components/motion/fade-in";
import { CCF_EYEBROW } from "@/components/site/navigation-data";
import { type CcfEvent } from "@/lib/data/events";

interface EventDetailHeroProps {
  event: CcfEvent;
}

export function EventDetailHero({ event }: EventDetailHeroProps) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-ccf-navy-dark via-ccf-navy to-ccf-navy py-14 md:py-20 border-b border-border/40">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(#c5a059 1px, transparent 1px)`,
          backgroundSize: "24px 24px",
        }}
        aria-hidden="true"
      />
      <Container className="relative space-y-6">
        {/* Back Link */}
        <FadeIn direction="down" duration={0.4}>
          <Link
            href="/events"
            className="inline-flex items-center gap-2 text-xs md:text-sm font-medium text-ccf-muted hover:text-ccf-gold transition-colors group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ccf-gold rounded py-1"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" aria-hidden="true" />
            <span>Back to Events</span>
          </Link>
        </FadeIn>

        <div className="space-y-4 max-w-3xl">
          {/* Eyebrow & Badges */}
          <FadeIn delay={0.1}>
            <div className="flex flex-wrap items-center gap-3">
              <span className="type-eyebrow text-ccf-gold">
                {CCF_EYEBROW}
              </span>
              <span className="text-border/60" aria-hidden="true">•</span>
              <Badge variant={event.statusVariant} dot className="font-mono text-xs">
                {event.status}
              </Badge>
              {event.category && (
                <Badge variant="outline" className="text-xs font-medium border-border/50 text-ccf-offwhite/80">
                  {event.category}
                </Badge>
              )}
              {event.edition && (
                <Badge variant="outline" className="text-xs font-mono border-ccf-gold/30 text-ccf-gold">
                  Edition: {event.edition}
                </Badge>
              )}
            </div>
          </FadeIn>

          {/* Heading */}
          <FadeIn delay={0.2}>
            <h1 className="type-h1 text-ccf-offwhite tracking-tight text-3xl sm:text-4xl md:text-5xl font-bold">
              {event.name}
            </h1>
          </FadeIn>

          {/* Subtitle / Description */}
          <FadeIn delay={0.3}>
            <p className="type-body-lg text-ccf-muted leading-relaxed max-w-2xl">
              {event.description}
            </p>
          </FadeIn>
        </div>
      </Container>
    </section>
  );
}
