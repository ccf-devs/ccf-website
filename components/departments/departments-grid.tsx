import React from "react";
import Link from "next/link";
import {
  TrendingUp,
  Monitor,
  Megaphone,
  FolderKanban,
  CalendarDays,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { Container } from "@/components/site/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FadeIn } from "@/components/motion/fade-in";
import { StaggerContainer, StaggerItem } from "@/components/motion/stagger";
import { CCF_DEPARTMENTS, CcfDepartment } from "@/lib/data/departments";

const DEPT_ICONS: Record<CcfDepartment["iconName"], React.ElementType> = {
  TrendingUp,
  Monitor,
  Megaphone,
  FolderKanban,
  CalendarDays,
};

export function DepartmentsGrid() {
  return (
    <section id="directory" className="py-16 md:py-24 border-b border-border/30 bg-ccf-surface-sunken/40">
      <Container className="space-y-12">
        <FadeIn direction="up">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <SectionHeading
              eyebrow="Directory"
              title="Operational Departments"
              description="Explore the five departments that support CCF's activities and initiatives."
            />
            <Badge variant="default" className="self-start md:self-auto shrink-0">
              5 Departments
            </Badge>
          </div>
        </FadeIn>

        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {CCF_DEPARTMENTS.map((dept, index) => {
            const IconComp = DEPT_ICONS[dept.iconName];
            const stepNum = String(index + 1).padStart(2, "0");

            return (
              <StaggerItem
                key={dept.id}
                className={index === 4 ? "md:col-span-2 lg:col-span-1" : undefined}
              >
                <Card
                  hoverable
                  className="h-full border-border/60 bg-ccf-surface p-6 flex flex-col justify-between space-y-6"
                >
                  <div className="space-y-4">
                    {/* Header with Icon and Order Index */}
                    <div className="flex items-center justify-between">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-ccf-gold/30 bg-ccf-surface-elevated text-ccf-gold shadow-xs">
                        <IconComp className="h-6 w-6" aria-hidden="true" />
                      </div>
                      <span className="font-mono text-xs font-semibold text-ccf-gold/70 tracking-widest">
                        {stepNum}
                      </span>
                    </div>

                    {/* Department Name & Main Description */}
                    <CardHeader className="p-0 space-y-2">
                      <CardTitle className="text-xl font-semibold text-ccf-offwhite">
                        {dept.name}
                      </CardTitle>
                      <CardDescription className="text-sm text-ccf-muted leading-relaxed">
                        {dept.description}
                      </CardDescription>
                    </CardHeader>

                    {/* Verified Focus Areas */}
                    <CardContent className="p-0 pt-2 space-y-2.5">
                      <p className="type-metadata text-ccf-offwhite/90 font-medium">
                        Core Focus Areas
                      </p>
                      <ul className="space-y-2 text-xs text-ccf-muted">
                        {dept.focusAreas.map((area) => (
                          <li key={area} className="flex items-start gap-2">
                            <CheckCircle2
                              className="h-3.5 w-3.5 text-ccf-gold shrink-0 mt-0.5"
                              aria-hidden="true"
                            />
                            <span>{area}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </div>

                  {/* CTA link to recruitment */}
                  <div className="pt-4 border-t border-border/40">
                    <Link
                      href="/join-us"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-ccf-gold hover:text-ccf-gold-light transition-colors group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded"
                    >
                      <span>Apply for {dept.name}</span>
                      <ArrowRight
                        className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
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
