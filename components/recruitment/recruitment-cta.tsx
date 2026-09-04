import React from "react";
import Link from "next/link";
import { ArrowRight, ClipboardList, Layers } from "lucide-react";
import { Container } from "@/components/site/container";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FadeIn } from "@/components/motion/fade-in";
import { RECRUITMENT_CTA, RECRUITMENT_STATUS, RecruitmentStatus } from "@/lib/data/recruitment";

interface RecruitmentCtaProps {
  status?: RecruitmentStatus;
}

export function RecruitmentCta({ status = RECRUITMENT_STATUS }: RecruitmentCtaProps) {
  const isOpen = status === "OPEN";

  return (
    <section className="py-16 md:py-24">
      <Container>
        <FadeIn>
          <Card className="relative overflow-hidden bg-gradient-to-br from-ccf-surface via-ccf-surface to-ccf-surface-elevated border-ccf-gold/30 p-8 md:p-12 text-center shadow-lg">
            <div className="mx-auto max-w-2xl space-y-6">
              <div className="space-y-2">
                <span className="type-eyebrow text-ccf-gold">
                  {RECRUITMENT_CTA.eyebrow}
                </span>
                <h2 className="type-h2 text-2xl md:text-3xl font-bold text-ccf-offwhite tracking-tight">
                  {isOpen ? RECRUITMENT_CTA.heading : RECRUITMENT_CTA.closedHeading}
                </h2>
                <p className="type-body text-sm md:text-base text-ccf-muted leading-relaxed">
                  {isOpen
                    ? RECRUITMENT_CTA.description
                    : RECRUITMENT_CTA.closedDescription}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
                {isOpen ? (
                  <>
                    <Button asChild variant="gold" size="lg">
                      <a
                        href={RECRUITMENT_CTA.primaryActionHref}
                        className="inline-flex items-center gap-2"
                      >
                        <ClipboardList className="h-4 w-4" aria-hidden="true" />
                        <span>{RECRUITMENT_CTA.primaryActionLabel}</span>
                      </a>
                    </Button>
                    <Button asChild variant="outline" size="lg">
                      <Link
                        href={RECRUITMENT_CTA.secondaryActionHref}
                        className="inline-flex items-center gap-2"
                      >
                        <span>{RECRUITMENT_CTA.secondaryActionLabel}</span>
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    </Button>
                  </>
                ) : (
                  <Button asChild variant="outline" size="lg">
                    <Link
                      href={RECRUITMENT_CTA.secondaryActionHref}
                      className="inline-flex items-center gap-2"
                    >
                      <Layers className="h-4 w-4" aria-hidden="true" />
                      <span>{RECRUITMENT_CTA.secondaryActionLabel}</span>
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </FadeIn>
      </Container>
    </section>
  );
}
