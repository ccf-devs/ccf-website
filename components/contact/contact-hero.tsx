import React from "react";
import { Container } from "@/components/site/container";
import { FadeIn } from "@/components/motion/fade-in";
import { CONTACT_HERO } from "@/lib/data/contact";

export function ContactHero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-ccf-navy-dark via-ccf-navy to-ccf-navy py-16 md:py-24 border-b border-border/40">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(#c5a059 1px, transparent 1px)`,
          backgroundSize: "24px 24px",
        }}
        aria-hidden="true"
      />
      <Container className="relative space-y-4 max-w-3xl">
        <FadeIn>
          <span className="type-eyebrow text-ccf-gold">
            {CONTACT_HERO.eyebrow}
          </span>
        </FadeIn>

        <FadeIn delay={0.1}>
          <h1 className="type-h1 text-ccf-offwhite tracking-tight text-3xl sm:text-4xl md:text-5xl font-bold">
            {CONTACT_HERO.title}
          </h1>
        </FadeIn>

        <FadeIn delay={0.2}>
          <p className="type-body-lg text-ccf-muted leading-relaxed max-w-2xl">
            {CONTACT_HERO.subtitle}
          </p>
        </FadeIn>
      </Container>
    </section>
  );
}
