import React from "react";
import { Compass, Target, CheckCircle2 } from "lucide-react";
import { Container } from "@/components/site/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { CardReveal } from "@/components/ui/card-reveal";
import { StaggerContainer, StaggerItem } from "@/components/motion/stagger";
import { FadeIn } from "@/components/motion/fade-in";
import { ABOUT_VISION_MISSION } from "@/lib/data/about";

export function VisionMissionSection() {
  return (
    <section className="py-16 md:py-24 bg-ccf-navy-secondary/30 border-b border-border/30">
      <Container className="space-y-16">
        <FadeIn direction="up">
          <div className="text-center space-y-2">
            <span className="editorial-tag">02 / STRATEGIC MANDATE</span>
            <SectionHeading
              eyebrow="Aspiration & Commitment"
              title="Vision, Mission & Objectives"
              description="Our foundational purpose at Crescent College as defined by the CCF constitution."
              align="center"
              withRule
            />
          </div>
        </FadeIn>

        {/* Vision & Mission Highlight Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Vision Card */}
          <FadeIn direction="right">
            <CardReveal className="h-full rounded-2xl">
              <Card hoverable className="h-full bg-ccf-surface border-ccf-gold/30 p-8 flex flex-col justify-between space-y-6 rounded-[inherit]">
                <div className="space-y-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-ccf-gold/30 bg-ccf-surface-elevated text-ccf-gold shadow-xs">
                    <Target className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <div className="space-y-2">
                    <span className="type-metadata text-ccf-gold font-semibold tracking-wider uppercase text-xs">
                      Our Vision
                    </span>
                    <h3 className="type-h2 text-ccf-offwhite">
                      Informed Decision-Making
                    </h3>
                  </div>
                  <p className="type-body text-ccf-muted text-base md:text-lg leading-relaxed italic border-l-2 border-ccf-gold/50 pl-4 py-1">
                    &ldquo;{ABOUT_VISION_MISSION.vision}&rdquo;
                  </p>
                </div>
              </Card>
            </CardReveal>
          </FadeIn>

          {/* Mission Card */}
          <FadeIn direction="left" delay={0.1}>
            <CardReveal delay={0.1} className="h-full rounded-2xl">
              <Card hoverable className="h-full bg-ccf-surface border-ccf-gold/30 p-8 flex flex-col justify-between space-y-6 rounded-[inherit]">
                <div className="space-y-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-ccf-gold/30 bg-ccf-surface-elevated text-ccf-gold shadow-xs">
                    <Compass className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <div className="space-y-2">
                    <span className="type-metadata text-ccf-gold font-semibold tracking-wider uppercase text-xs">
                      Our Mission
                    </span>
                    <h3 className="type-h2 text-ccf-offwhite">
                      Practical Financial Education
                    </h3>
                  </div>
                  <p className="type-body text-ccf-muted text-base md:text-lg leading-relaxed italic border-l-2 border-ccf-gold/50 pl-4 py-1">
                    &ldquo;{ABOUT_VISION_MISSION.mission}&rdquo;
                  </p>
                </div>
              </Card>
            </CardReveal>
          </FadeIn>
        </div>

        {/* Financial Document Divider between Mandate and Objectives */}
        <div className="finance-divider" aria-hidden="true" />

        {/* 3 Core Stated Objectives */}
        <div className="space-y-8 pt-2">
          <FadeIn direction="up">
            <h3 className="type-h2 text-ccf-offwhite text-center">
              Core Strategic Objectives
            </h3>
          </FadeIn>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {ABOUT_VISION_MISSION.objectives.map((obj, idx) => (
              <StaggerItem key={obj.id}>
                <CardReveal delay={idx * 0.1} className="h-full rounded-2xl">
                  <Card hoverable className="h-full bg-ccf-surface/70 border-border/40 p-6 space-y-4 rounded-[inherit]">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold font-display text-ccf-gold">
                        0{idx + 1}
                      </span>
                      <CheckCircle2 className="h-5 w-5 text-ccf-gold/70" aria-hidden="true" />
                    </div>
                    <CardHeader className="p-0 space-y-2">
                      <CardTitle className="text-lg font-semibold text-ccf-offwhite">
                        {obj.title}
                      </CardTitle>
                      <CardDescription className="text-sm leading-relaxed text-ccf-muted">
                        {obj.description}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </CardReveal>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </Container>
    </section>
  );
}
