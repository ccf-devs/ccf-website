import React from "react";
import Link from "next/link";
import { TrendingUp, Monitor, Megaphone, FolderKanban, CalendarDays, ArrowRight } from "lucide-react";
import { Container } from "@/components/site/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StaggerContainer, StaggerItem } from "@/components/motion/stagger";
import { FadeIn } from "@/components/motion/fade-in";
import { HOMEPAGE_DEPARTMENTS, HomepageDepartment } from "@/lib/data/homepage";

const DEPT_ICONS: Record<HomepageDepartment["iconName"], React.ElementType> = {
  TrendingUp,
  Monitor,
  Megaphone,
  FolderKanban,
  CalendarDays,
};

export function DepartmentsPreview() {
  return (
    <section className="py-16 md:py-24">
      <Container className="space-y-12">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <FadeIn direction="up">
            <SectionHeading
              eyebrow="Structure"
              title="Operational Departments"
              description="Specialized divisions driving events, financial literacy, technology, and outreach across campus."
            />
          </FadeIn>

          <FadeIn direction="up" delay={0.1}>
            <Button asChild variant="outline" className="shrink-0">
              <Link href="/departments" className="inline-flex items-center gap-2">
                <span>All Departments</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </FadeIn>
        </div>

        {/* 5 Departments Grid */}
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {HOMEPAGE_DEPARTMENTS.map((dept) => {
            const IconComp = DEPT_ICONS[dept.iconName];

            return (
              <StaggerItem key={dept.id}>
                <Card hoverable className="h-full bg-ccf-surface border-border/60 p-6 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-ccf-gold/30 bg-ccf-surface-elevated text-ccf-gold">
                      <IconComp className="h-5 w-5" aria-hidden="true" />
                    </div>

                    <CardHeader className="p-0 space-y-1.5">
                      <CardTitle className="text-xl font-semibold text-ccf-offwhite">
                        {dept.name}
                      </CardTitle>
                      <CardDescription className="text-sm leading-relaxed line-clamp-3">
                        {dept.shortDescription}
                      </CardDescription>
                    </CardHeader>
                  </div>

                  <div className="pt-2">
                    <Link
                      href="/departments"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-ccf-gold hover:text-ccf-gold-light transition-colors group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded"
                    >
                      <span>Explore Department</span>
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                    </Link>
                  </div>
                </Card>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      </Container>
    </section>
  );
}
