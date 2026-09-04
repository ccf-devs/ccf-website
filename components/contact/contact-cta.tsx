import React from "react";
import Link from "next/link";
import { Mail, ArrowRight } from "lucide-react";
import { Container } from "@/components/site/container";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FadeIn } from "@/components/motion/fade-in";
import { CONTACT_CTA } from "@/lib/data/contact";

export function ContactCta() {
  return (
    <section className="py-12 md:py-20">
      <Container>
        <FadeIn>
          <Card className="relative overflow-hidden bg-gradient-to-br from-ccf-surface via-ccf-surface to-ccf-surface-elevated border-ccf-gold/30 p-8 md:p-12 text-center shadow-lg">
            <div className="mx-auto max-w-2xl space-y-6">
              <div className="space-y-2">
                <span className="type-eyebrow text-ccf-gold">
                  {CONTACT_CTA.eyebrow}
                </span>
                <h2 className="type-h2 text-2xl md:text-3xl font-bold text-ccf-offwhite tracking-tight">
                  {CONTACT_CTA.heading}
                </h2>
                <p className="type-body text-sm md:text-base text-ccf-muted leading-relaxed">
                  {CONTACT_CTA.description}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
                <Button asChild variant="gold" size="lg">
                  <a
                    href={CONTACT_CTA.primaryActionHref}
                    className="inline-flex items-center gap-2"
                  >
                    <Mail className="h-4 w-4" aria-hidden="true" />
                    <span>{CONTACT_CTA.primaryActionLabel}</span>
                  </a>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link
                    href={CONTACT_CTA.secondaryActionHref}
                    className="inline-flex items-center gap-2"
                  >
                    <span>{CONTACT_CTA.secondaryActionLabel}</span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </div>
          </Card>
        </FadeIn>
      </Container>
    </section>
  );
}
