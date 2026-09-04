import React from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Container } from "@/components/site/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StaggerContainer, StaggerItem } from "@/components/motion/stagger";
import { FadeIn } from "@/components/motion/fade-in";
import { ABOUT_LEADERSHIP } from "@/lib/data/about";

export function AboutLeadership() {
  return (
    <section className="py-16 md:py-24 bg-ccf-navy-secondary/30 border-b border-border/30">
      <Container className="space-y-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <FadeIn direction="up">
            <SectionHeading
              eyebrow="Governance"
              title="Executive Leadership"
              description="The student board directing CCF's initiatives and operations."
            />
          </FadeIn>

          <FadeIn direction="up" delay={0.1}>
            <Button asChild variant="outline" className="shrink-0">
              <Link href="/members" className="inline-flex items-center gap-2">
                <span>View Members Directory</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </FadeIn>
        </div>

        <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {ABOUT_LEADERSHIP.map((leader) => (
            <StaggerItem key={leader.id}>
              <Card
                hoverable
                className="h-full bg-ccf-surface border-border/60 p-8 flex flex-col items-center text-center space-y-4"
              >
                {/* Monogram Avatar */}
                <div className="relative flex h-20 w-20 items-center justify-center rounded-full border-2 border-ccf-gold/40 bg-ccf-surface-elevated text-ccf-gold font-display text-2xl font-bold tracking-wider shadow-sm">
                  <span>{leader.initials}</span>
                </div>

                <CardHeader className="p-0 space-y-1">
                  <CardTitle className="text-xl md:text-2xl font-semibold text-ccf-offwhite">
                    {leader.name}
                  </CardTitle>
                  <CardDescription className="type-metadata text-ccf-gold flex items-center justify-center gap-1.5 pt-1">
                    <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{leader.role}</span>
                  </CardDescription>
                </CardHeader>
              </Card>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </Container>
    </section>
  );
}
