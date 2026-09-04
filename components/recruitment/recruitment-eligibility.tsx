import React from "react";
import { GraduationCap, BookOpen, Calendar, CheckCircle2, AlertCircle } from "lucide-react";
import { Container } from "@/components/site/container";
import { Card } from "@/components/ui/card";
import { FadeIn } from "@/components/motion/fade-in";
import { StaggerContainer, StaggerItem } from "@/components/motion/stagger";
import { RECRUITMENT_ELIGIBILITY, RecruitmentEligibilityItem } from "@/lib/data/recruitment";

const ELIGIBILITY_ICONS: Record<
  RecruitmentEligibilityItem["iconName"],
  React.ElementType
> = {
  GraduationCap,
  BookOpen,
  Calendar,
  CheckCircle2,
};

export function RecruitmentEligibility() {
  return (
    <section className="py-16 md:py-24 border-b border-border/30 bg-ccf-surface-sunken/40">
      <Container className="space-y-12">
        <FadeIn>
          <div className="space-y-2 text-center max-w-2xl mx-auto">
            <span className="type-eyebrow text-ccf-gold">
              {RECRUITMENT_ELIGIBILITY.eyebrow}
            </span>
            <h2 className="type-h2 text-2xl md:text-3xl font-bold text-ccf-offwhite tracking-tight">
              {RECRUITMENT_ELIGIBILITY.heading}
            </h2>
            <p className="type-body text-sm md:text-base text-ccf-muted leading-relaxed">
              {RECRUITMENT_ELIGIBILITY.description}
            </p>
          </div>
        </FadeIn>

        {/* 4 Eligibility Pillars */}
        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {RECRUITMENT_ELIGIBILITY.items.map((item) => {
            const Icon = ELIGIBILITY_ICONS[item.iconName];
            return (
              <StaggerItem key={item.id}>
                <Card className="h-full bg-ccf-surface border-border/60 p-6 flex flex-col space-y-4 shadow-sm">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-ccf-gold/30 bg-ccf-surface-elevated text-ccf-gold">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <h3 className="text-base font-semibold text-ccf-offwhite">
                      {item.title}
                    </h3>
                    <p className="type-body text-xs md:text-sm text-ccf-muted leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </Card>
              </StaggerItem>
            );
          })}
        </StaggerContainer>

        {/* Single Department Selection Rule Notice */}
        <FadeIn delay={0.2}>
          <div className="max-w-3xl mx-auto rounded-xl border border-ccf-gold/30 bg-ccf-surface p-4 sm:p-5 flex items-start gap-3.5 shadow-sm">
            <AlertCircle
              className="h-5 w-5 text-ccf-gold shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <div className="space-y-0.5 text-xs sm:text-sm">
              <p className="font-semibold text-ccf-offwhite">
                Application Rule
              </p>
              <p className="text-ccf-muted leading-relaxed">
                {RECRUITMENT_ELIGIBILITY.ruleNotice}
              </p>
            </div>
          </div>
        </FadeIn>
      </Container>
    </section>
  );
}
