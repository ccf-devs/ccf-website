import React from "react";
import Link from "next/link";
import { ArrowRight, ClipboardList, Layers } from "lucide-react";
import { Container } from "@/components/site/container";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/motion/fade-in";
import { RECRUITMENT_HERO, RECRUITMENT_STATUS, RecruitmentStatus } from "@/lib/data/recruitment";
import { RecruitmentStatusBadge } from "./recruitment-status";

interface RecruitmentHeroProps {
  status?: RecruitmentStatus;
}

export function RecruitmentHero({ status = RECRUITMENT_STATUS }: RecruitmentHeroProps) {
  const isOpen = status === "OPEN";

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-ccf-navy-dark via-ccf-navy to-ccf-navy py-16 md:py-24 border-b border-border/40">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(#c5a059 1px, transparent 1px)`,
          backgroundSize: "24px 24px",
        }}
        aria-hidden="true"
      />
      <Container className="relative space-y-6 max-w-3xl">
        <FadeIn>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <span className="type-eyebrow text-ccf-gold">
              {RECRUITMENT_HERO.eyebrow}
            </span>
            <RecruitmentStatusBadge status={status} />
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <h1 className="type-h1 text-ccf-offwhite tracking-tight text-3xl sm:text-4xl md:text-5xl font-bold">
            {RECRUITMENT_HERO.title}
          </h1>
        </FadeIn>

        <FadeIn delay={0.2}>
          <p className="type-body-lg text-ccf-muted leading-relaxed max-w-2xl">
            {RECRUITMENT_HERO.subtitle}
          </p>
        </FadeIn>

        <FadeIn delay={0.3}>
          <div className="flex flex-wrap items-center gap-4 pt-2">
            {isOpen ? (
              <>
                <Button asChild variant="gold" size="lg">
                  <a href="#requirements" className="inline-flex items-center gap-2">
                    <ClipboardList className="h-4 w-4" aria-hidden="true" />
                    <span>View Requirements</span>
                  </a>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <a href="#departments" className="inline-flex items-center gap-2">
                    <span>Explore Departments</span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </a>
                </Button>
              </>
            ) : (
              <Button asChild variant="outline" size="lg">
                <Link href="/departments" className="inline-flex items-center gap-2">
                  <Layers className="h-4 w-4" aria-hidden="true" />
                  <span>Explore CCF Departments</span>
                </Link>
              </Button>
            )}
          </div>
        </FadeIn>
      </Container>
    </section>
  );
}
