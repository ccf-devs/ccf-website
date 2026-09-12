import React from "react";
import { Container } from "@/components/site/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { FadeIn } from "@/components/motion/fade-in";
import { ABOUT_OVERVIEW } from "@/lib/data/about";

export function AboutIntro() {
  return (
    <section className="py-16 md:py-24 border-b border-border/30 bg-background">
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
          {/* Left Column: Heading */}
          <div className="lg:col-span-5 space-y-4">
            <FadeIn direction="right">
              <SectionHeading
                eyebrow="Introduction"
                title="A Student Society Built on Practical Knowledge"
                description={ABOUT_OVERVIEW.summary}
                withRule
              />
            </FadeIn>
          </div>

          {/* Right Column: Editorial Paragraphs */}
          <div className="lg:col-span-7 space-y-6 text-ccf-muted leading-relaxed text-base md:text-lg">
            {ABOUT_OVERVIEW.paragraphs.map((paragraph, index) => (
              <FadeIn key={index} direction="left" delay={0.1 * (index + 1)}>
                <p>{paragraph}</p>
              </FadeIn>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
