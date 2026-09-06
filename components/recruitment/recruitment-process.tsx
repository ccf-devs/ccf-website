import React from "react";
import { Container } from "@/components/site/container";
import { Card } from "@/components/ui/card";
import { CardReveal } from "@/components/ui/card-reveal";
import { FadeIn } from "@/components/motion/fade-in";
import { StaggerContainer, StaggerItem } from "@/components/motion/stagger";
import { RECRUITMENT_PROCESS, RecruitmentProcessStep } from "@/lib/data/recruitment";

export function RecruitmentProcess() {
  return (
    <section className="py-16 md:py-24 border-b border-border/30">
      <Container className="space-y-12">
        <FadeIn>
          <div className="space-y-2 text-center max-w-2xl mx-auto">
            <span className="type-eyebrow text-ccf-gold">
              {RECRUITMENT_PROCESS.eyebrow}
            </span>
            <h2 className="type-h2 text-2xl md:text-3xl font-bold text-ccf-offwhite tracking-tight">
              {RECRUITMENT_PROCESS.heading}
            </h2>
            <p className="type-body text-sm md:text-base text-ccf-muted leading-relaxed">
              {RECRUITMENT_PROCESS.description}
            </p>
          </div>
        </FadeIn>

        {/* 4 Process Steps */}
        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {RECRUITMENT_PROCESS.steps.map((stepItem: RecruitmentProcessStep) => (
            <StaggerItem key={stepItem.step}>
              <CardReveal delay={Number(stepItem.step.replace(/\D/g, "") || 1) * 0.05} className="h-full rounded-xl">
                <Card className="h-full bg-ccf-surface border-border/60 p-6 flex flex-col justify-between space-y-4 shadow-sm relative overflow-hidden rounded-[inherit]">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-ccf-gold/30 bg-ccf-surface-elevated font-mono text-sm font-bold text-ccf-gold">
                        {stepItem.step}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="text-base font-semibold text-ccf-offwhite">
                        {stepItem.title}
                      </h3>
                      <p className="type-body text-xs md:text-sm text-ccf-muted leading-relaxed">
                        {stepItem.description}
                      </p>
                    </div>
                  </div>
                </Card>
              </CardReveal>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </Container>
    </section>
  );
}
