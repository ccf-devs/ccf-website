import React from "react";
import { Container } from "@/components/site/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { FadeIn } from "@/components/motion/fade-in";

export function ClubIntro() {
  return (
    <section className="py-16 md:py-24 border-y border-border/30 bg-ccf-navy-secondary/30">
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left Heading */}
          <div className="lg:col-span-5 space-y-4">
            <FadeIn direction="right">
              <SectionHeading
                eyebrow="Who We Are"
                title="A Community Built on Financial Acumen"
                withRule
              />
            </FadeIn>
          </div>

          {/* Right Editorial Copy */}
          <div className="lg:col-span-7 space-y-6 text-ccf-muted leading-relaxed text-base md:text-lg">
            <FadeIn direction="left" delay={0.1}>
              <p>
                The <strong className="text-ccf-offwhite font-semibold">Crescent Club of Finance (CCF)</strong> is the student finance organization of B.S. Abdur Rahman Crescent Institute of Science and Technology in Vandalur.
              </p>
            </FadeIn>

            <FadeIn direction="left" delay={0.2}>
              <p>
                Founded to bridge the gap between classroom theory and dynamic market realities, CCF brings together ambitious students across all disciplines to explore capital markets, macroeconomic forces, corporate valuation, and personal fiscal management.
              </p>
            </FadeIn>

            <FadeIn direction="left" delay={0.3}>
              <p>
                Through interactive workshops, inter-collegiate challenges, industry symposiums, and collaborative project initiatives, we cultivate a rigorous intellectual environment where curious minds compound their potential.
              </p>
            </FadeIn>
          </div>
        </div>
      </Container>
    </section>
  );
}
