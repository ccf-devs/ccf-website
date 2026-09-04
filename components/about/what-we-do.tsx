import React from "react";
import Link from "next/link";
import {
  Presentation,
  TrendingUp,
  Trophy,
  GraduationCap,
  ArrowRight,
} from "lucide-react";
import { Container } from "@/components/site/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StaggerContainer, StaggerItem } from "@/components/motion/stagger";
import { FadeIn } from "@/components/motion/fade-in";
import { ABOUT_ACTIVITIES, AboutActivity } from "@/lib/data/about";

const ACTIVITY_ICONS: Record<AboutActivity["iconName"], React.ElementType> = {
  Presentation,
  TrendingUp,
  Trophy,
  GraduationCap,
};

export function WhatCCFDoes() {
  return (
    <section className="py-16 md:py-24 bg-ccf-navy-secondary/30 border-b border-border/30">
      <Container className="space-y-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <FadeIn direction="up">
            <SectionHeading
              eyebrow="Initiatives & Programs"
              title="What We Do"
              description="Structured events, learning sessions, and competitions organized by CCF."
            />
          </FadeIn>

          <FadeIn direction="up" delay={0.1}>
            <Button asChild variant="outline" className="shrink-0">
              <Link href="/events" className="inline-flex items-center gap-2">
                <span>View Event Calendar</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </FadeIn>
        </div>

        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {ABOUT_ACTIVITIES.map((activity) => {
            const IconComponent = ACTIVITY_ICONS[activity.iconName];

            return (
              <StaggerItem key={activity.id}>
                <Card hoverable className="h-full bg-ccf-surface border-border/40 p-6 space-y-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-ccf-gold/30 bg-ccf-surface text-ccf-gold shadow-xs">
                    <IconComponent className="h-6 w-6" aria-hidden="true" />
                  </div>

                  <CardHeader className="p-0 space-y-2">
                    <CardTitle className="text-lg font-semibold text-ccf-offwhite">
                      {activity.title}
                    </CardTitle>
                    <CardDescription className="text-sm leading-relaxed text-ccf-muted">
                      {activity.description}
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
