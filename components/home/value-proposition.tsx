import React from "react";
import { BookOpen, LineChart, Trophy, Users } from "lucide-react";
import { Container } from "@/components/site/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StaggerContainer, StaggerItem } from "@/components/motion/stagger";
import { FadeIn } from "@/components/motion/fade-in";
import { HOMEPAGE_VALUE_PROPS, ValueProposition } from "@/lib/data/homepage";

const ICON_MAP: Record<ValueProposition["iconName"], React.ElementType> = {
  BookOpen,
  LineChart,
  Trophy,
  Users,
};

export function ValuePropositionSection() {
  return (
    <section className="py-16 md:py-24 bg-ccf-surface-sunken/40 border-y border-border/30">
      <Container className="space-y-12">
        <FadeIn direction="up">
          <SectionHeading
            eyebrow="Experience"
            title="Why Join the Crescent Club of Finance"
            description="Four pillars that define the student experience and cultivate leadership within CCF."
            align="center"
            withRule
          />
        </FadeIn>

        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {HOMEPAGE_VALUE_PROPS.map((prop) => {
            const IconComponent = ICON_MAP[prop.iconName];

            return (
              <StaggerItem key={prop.id}>
                <Card hoverable className="h-full bg-ccf-surface/60 border-border/40 p-6 space-y-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-ccf-gold/30 bg-ccf-surface text-ccf-gold shadow-xs">
                    <IconComponent className="h-6 w-6" aria-hidden="true" />
                  </div>

                  <CardHeader className="p-0 space-y-2">
                    <CardTitle className="text-lg md:text-xl font-semibold">
                      {prop.title}
                    </CardTitle>
                    <CardDescription className="text-sm leading-relaxed">
                      {prop.description}
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
