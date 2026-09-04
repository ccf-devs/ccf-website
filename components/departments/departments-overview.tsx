import React from "react";
import { Layers, Users, BookOpen } from "lucide-react";
import { Container } from "@/components/site/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FadeIn } from "@/components/motion/fade-in";
import { StaggerContainer, StaggerItem } from "@/components/motion/stagger";
import { DEPARTMENTS_OVERVIEW } from "@/lib/data/departments";

const PILLAR_ICONS = [Layers, Users, BookOpen];

export function DepartmentsOverview() {
  return (
    <section className="py-16 md:py-24 border-b border-border/30 bg-background">
      <Container className="space-y-12">
        <FadeIn direction="up">
          <SectionHeading
            eyebrow={DEPARTMENTS_OVERVIEW.eyebrow}
            title={DEPARTMENTS_OVERVIEW.heading}
            description={DEPARTMENTS_OVERVIEW.description}
            align="center"
            withRule
          />
        </FadeIn>

        <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {DEPARTMENTS_OVERVIEW.pillars.map((pillar, idx) => {
            const Icon = PILLAR_ICONS[idx % PILLAR_ICONS.length];

            return (
              <StaggerItem key={pillar.title}>
                <Card className="h-full border-border/50 bg-ccf-surface p-6 flex flex-col space-y-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-ccf-gold/30 bg-ccf-surface-elevated text-ccf-gold">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <CardHeader className="p-0 space-y-2">
                    <CardTitle className="text-lg font-semibold text-ccf-offwhite">
                      {pillar.title}
                    </CardTitle>
                    <CardDescription className="text-sm text-ccf-muted leading-relaxed">
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
