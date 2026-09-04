import React from "react";
import { User, Hash, Briefcase, GraduationCap, Calendar, MessageSquare, Info } from "lucide-react";
import { Container } from "@/components/site/container";
import { Card } from "@/components/ui/card";
import { FadeIn } from "@/components/motion/fade-in";
import { StaggerContainer, StaggerItem } from "@/components/motion/stagger";
import { RECRUITMENT_REQUIREMENTS, RecruitmentRequirementField } from "@/lib/data/recruitment";

const FIELD_ICONS: Record<string, React.ElementType> = {
  "req-name": User,
  "req-rrn": Hash,
  "req-dept": Briefcase,
  "req-academic-dept": GraduationCap,
  "req-year": Calendar,
  "req-whatsapp": MessageSquare,
};

export function RecruitmentRequirements() {
  return (
    <section id="requirements" className="py-16 md:py-24 border-b border-border/30 bg-ccf-surface-sunken/40">
      <Container className="space-y-12">
        <FadeIn>
          <div className="space-y-2 text-center max-w-2xl mx-auto">
            <span className="type-eyebrow text-ccf-gold">
              {RECRUITMENT_REQUIREMENTS.eyebrow}
            </span>
            <h2 className="type-h2 text-2xl md:text-3xl font-bold text-ccf-offwhite tracking-tight">
              {RECRUITMENT_REQUIREMENTS.heading}
            </h2>
            <p className="type-body text-sm md:text-base text-ccf-muted leading-relaxed">
              {RECRUITMENT_REQUIREMENTS.description}
            </p>
          </div>
        </FadeIn>

        {/* 6 Required Application Fields */}
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {RECRUITMENT_REQUIREMENTS.fields.map((field: RecruitmentRequirementField, index: number) => {
            const Icon = FIELD_ICONS[field.id] || Info;
            const indexStr = String(index + 1).padStart(2, "0");

            return (
              <StaggerItem key={field.id}>
                <Card className="h-full bg-ccf-surface border-border/60 p-6 flex flex-col justify-between space-y-4 shadow-sm">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-ccf-gold/30 bg-ccf-surface-elevated text-ccf-gold">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <span className="font-mono text-xs font-semibold text-ccf-gold/60">
                        {indexStr}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-base font-semibold text-ccf-offwhite">
                        {field.label}
                      </h3>
                      <p className="type-body text-xs md:text-sm text-ccf-muted leading-relaxed">
                        {field.description}
                      </p>
                    </div>
                  </div>
                </Card>
              </StaggerItem>
            );
          })}
        </StaggerContainer>

        {/* Factual Information Notice */}
        <FadeIn delay={0.2}>
          <div className="max-w-2xl mx-auto text-center">
            <p className="type-body text-xs sm:text-sm text-ccf-muted">
              {RECRUITMENT_REQUIREMENTS.notice}
            </p>
          </div>
        </FadeIn>
      </Container>
    </section>
  );
}
