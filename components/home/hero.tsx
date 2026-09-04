import React from "react";
import Link from "next/link";
import { CcfLogo } from "@/components/site/logo";
import { ArrowRight, Calendar, Sparkles } from "lucide-react";
import { Container } from "@/components/site/container";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/motion/fade-in";
import { CCF_EYEBROW } from "@/components/site/navigation-data";

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-32 bg-radial-[at_top] from-ccf-surface/40 via-background to-background">
      {/* Abstract subtle background grid motif */}
      <div className="bg-ccf-grid absolute inset-0 opacity-20 pointer-events-none" aria-hidden="true" />

      <Container className="relative z-10">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto space-y-8">
          {/* Eyebrow badge / Institution tag */}
          <FadeIn direction="down" delay={0.1}>
            <div className="inline-flex items-center gap-2.5 rounded-full border border-ccf-gold/30 bg-ccf-surface px-4 py-1.5 shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-ccf-gold" aria-hidden="true" />
              <span className="type-metadata text-ccf-offwhite font-medium">
                {CCF_EYEBROW}
              </span>
            </div>
          </FadeIn>

          {/* CCF Crest / Logo Presentation */}
          <FadeIn direction="up" delay={0.2}>
            <CcfLogo size="lg" priority />
          </FadeIn>

          {/* Editorial Headline */}
          <FadeIn direction="up" delay={0.3}>
            <h1 className="type-display text-ccf-offwhite leading-tight md:leading-[1.1]">
              Investing in Knowledge,{" "}
              <span className="text-gradient-gold block sm:inline">
                Compounding Success
              </span>
            </h1>
          </FadeIn>

          {/* Concise Supporting Description */}
          <FadeIn direction="up" delay={0.4}>
            <p className="type-body text-ccf-muted max-w-2xl text-base md:text-lg leading-relaxed">
              The student-led finance society of B.S. Abdur Rahman Crescent Institute of Science and Technology. Dedicated to financial literacy, market awareness, and practical learning.
            </p>
          </FadeIn>

          {/* Action CTAs */}
          <FadeIn direction="up" delay={0.5}>
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto pt-2">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href="/events" className="flex items-center justify-center gap-2">
                  <Calendar className="h-4 w-4" aria-hidden="true" />
                  <span>Explore Events</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>

              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
                <Link href="/join-us" className="flex items-center justify-center gap-2">
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
