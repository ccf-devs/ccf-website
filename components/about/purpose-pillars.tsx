import React from "react";
import { BookOpen, LineChart, Lightbulb, Users } from "lucide-react";
import { Container } from "@/components/site/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StaggerContainer, StaggerItem } from "@/components/motion/stagger";
import { FadeIn } from "@/components/motion/fade-in";
import { ABOUT_PILLARS, AboutPillar } from "@/lib/data/about";

const ICON_MAP: Record<AboutPillar["iconName"], React.ElementType> = {
  BookOpen,
  LineChart,
  Lightbulb,
  Users,
};

export function PurposePillars() {
  return (
    <section className="py-16 md:py-24 bg-background border-b border-border/30">
      <Container className="space-y-12">
        <FadeIn direction="up">
          <SectionHeading
            eyebrow="Core Purpose"
            title="Pillars of the Society"
            description="Four foundational focus areas guiding our activities, discussions, and initiatives."
            align="center"
            withRule
          />
        </FadeIn>

        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {ABOUT_PILLARS.map((pillar) => {
            const IconComponent = ICON_MAP[pillar.iconName];

            return (
              <StaggerItem key={pillar.id}>
                <Card hoverable className="h-full bg-ccf-surface/60 border-border/40 p-6 space-y-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-ccf-gold/30 bg-ccf-surface text-ccf-gold shadow-xs">
                    <IconComponent className="h-6 w-6" aria-hidden="true" />
                  </div>

                  <CardHeader className="p-0 space-y-2">
                    <CardTitle className="text-lg font-semibold text-ccf-offwhite">
                      {pillar.title}
                    </CardTitle>
                    <CardDescription className="text-sm leading-relaxed text-ccf-muted">
                      {pillar.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      </Container>
    </section>
  );
}
