import React from "react";
import Link from "next/link";
import { Sparkles, ArrowDown, Users } from "lucide-react";
import { Container } from "@/components/site/container";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/motion/fade-in";
import { MEMBERS_HERO } from "@/lib/data/members";

export function MembersHero() {
  return (
    <section className="relative overflow-hidden py-16 md:py-24 border-b border-border/30 bg-gradient-to-b from-ccf-surface-sunken/60 via-background to-background">
      {/* Subtle background radial glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-ccf-gold/5 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      <Container className="relative z-10">
        <div className="flex flex-col items-center text-center space-y-6 max-w-4xl mx-auto">
          {/* Institutional Eyebrow Badge */}
          <FadeIn direction="up">
            <div className="inline-flex items-center gap-2 rounded-full border border-ccf-gold/30 bg-ccf-surface-elevated/80 px-4 py-1.5 shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-ccf-gold" aria-hidden="true" />
              <span className="type-metadata text-ccf-offwhite font-medium tracking-wide">
                {MEMBERS_HERO.eyebrow}
              </span>
            </div>
          </FadeIn>

          {/* Editorial Display Heading */}
          <FadeIn direction="up" delay={0.1}>
            <h1 className="type-display text-ccf-offwhite leading-tight md:leading-[1.15]">
              {MEMBERS_HERO.title}
            </h1>
          </FadeIn>

          {/* Supporting Subtitle */}
          <FadeIn direction="up" delay={0.2}>
            <p className="type-body text-ccf-muted max-w-2xl text-base md:text-lg leading-relaxed">
              {MEMBERS_HERO.subtitle}
            </p>
          </FadeIn>

          {/* Action CTAs */}
          <FadeIn direction="up" delay={0.3}>
            <div className="flex flex-col sm:flex-row items-center gap-4 pt-2 w-full sm:w-auto">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <a href="#directory" className="inline-flex items-center justify-center gap-2">
                  <span>Explore Members</span>
                  <ArrowDown className="h-4 w-4" aria-hidden="true" />
                </a>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
                <Link href="/join-us" className="inline-flex items-center justify-center gap-2">
                  <Users className="h-4 w-4" aria-hidden="true" />
                  <span>Join CCF</span>
                </Link>
              </Button>
            </div>
          </FadeIn>
        </div>
      </Container>
    </section>
  );
}
