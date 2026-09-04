import React from "react";
import {
  TrendingUp,
  Monitor,
  Megaphone,
  FolderKanban,
  CalendarDays,
  CheckCircle2,
} from "lucide-react";
import { Container } from "@/components/site/container";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FadeIn } from "@/components/motion/fade-in";
import { StaggerContainer, StaggerItem } from "@/components/motion/stagger";
import { RECRUITMENT_DEPARTMENTS } from "@/lib/data/recruitment";
import { CcfDepartment } from "@/lib/data/departments";

const DEPT_ICONS: Record<CcfDepartment["iconName"], React.ElementType> = {
  TrendingUp,
  Monitor,
  Megaphone,
  FolderKanban,
  CalendarDays,
};

export function RecruitmentDepartments() {
  return (
    <section id="departments" className="py-16 md:py-24 border-b border-border/30">
      <Container className="space-y-12">
        <FadeIn>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <span className="type-eyebrow text-ccf-gold">
                {RECRUITMENT_DEPARTMENTS.eyebrow}
              </span>
              <h2 className="type-h2 text-2xl md:text-3xl font-bold text-ccf-offwhite tracking-tight">
                {RECRUITMENT_DEPARTMENTS.heading}
              </h2>
              <p className="type-body text-sm md:text-base text-ccf-muted leading-relaxed">
                {RECRUITMENT_DEPARTMENTS.description}
              </p>
            </div>
            <Badge variant="default" className="self-start md:self-auto shrink-0">
              5 Departments • Choose 1
            </Badge>
          </div>
        </FadeIn>

        {/* 5 Canonical Department Cards */}
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {RECRUITMENT_DEPARTMENTS.departments.map((dept, index) => {
            const Icon = DEPT_ICONS[dept.iconName];
            const numStr = String(index + 1).padStart(2, "0");

            return (
              <StaggerItem
                key={dept.id}
                className={index === 4 ? "md:col-span-2 lg:col-span-1" : undefined}
              >
                <Card
                  hoverable
                  className="h-full border-border/60 bg-ccf-surface p-6 flex flex-col justify-between space-y-6 shadow-sm"
                >
                  <div className="space-y-4">
                    {/* Icon and Number */}
                    <div className="flex items-center justify-between">
                      <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-ccf-gold/30 bg-ccf-surface-elevated text-ccf-gold">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <span className="font-mono text-xs font-semibold text-ccf-gold/70 tracking-widest">
                        {numStr}
                      </span>
                    </div>

                    {/* Department Name & Short Description */}
                    <CardHeader className="p-0 space-y-1.5">
                      <CardTitle className="text-lg font-semibold text-ccf-offwhite">
                        {dept.name}
                      </CardTitle>
                      <CardDescription className="text-xs md:text-sm text-ccf-muted leading-relaxed">
                        {dept.shortDescription}
                      </CardDescription>
                    </CardHeader>

                    {/* Verified Core Focus Areas */}
                    <CardContent className="p-0 pt-2 space-y-2">
                      <p className="type-metadata text-ccf-offwhite/90 text-xs font-medium">
                        Core Focus Areas
                      </p>
                      <ul className="space-y-1.5 text-xs text-ccf-muted">
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

                  <div className="pt-3 border-t border-border/40">
                    <span className="text-xs text-ccf-gold font-medium">
                      Selectable in application
                    </span>
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
