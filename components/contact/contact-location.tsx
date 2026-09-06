import React from "react";
import { MapPin, Landmark } from "lucide-react";
import { Container } from "@/components/site/container";
import { Card } from "@/components/ui/card";
import { CardReveal } from "@/components/ui/card-reveal";
import { FadeIn } from "@/components/motion/fade-in";
import { CONTACT_LOCATION } from "@/lib/data/contact";

export function ContactLocation() {
  return (
    <section className="py-12 md:py-20 border-b border-border/30">
      <Container className="space-y-8">
        <FadeIn>
          <div className="space-y-2 text-center max-w-2xl mx-auto">
            <div>
              <span className="editorial-tag">CAMPUS LIAISON // VANDALUR PRESENCE</span>
            </div>
            <span className="type-eyebrow text-ccf-gold">
              {CONTACT_LOCATION.eyebrow}
            </span>
            <h2 className="type-h2 text-2xl md:text-3xl font-bold text-ccf-offwhite tracking-tight">
              {CONTACT_LOCATION.heading}
            </h2>
            <p className="type-body text-sm md:text-base text-ccf-muted">
              {CONTACT_LOCATION.description}
            </p>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Campus Information Details */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <CardReveal className="flex-1 rounded-xl">
                <Card className="bg-ccf-surface border-border/60 p-6 h-full shadow-sm flex items-start gap-4 rounded-[inherit]">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-ccf-gold/30 bg-ccf-surface-elevated text-ccf-gold">
                    <Landmark className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="space-y-1 min-w-0 flex-1">
                    <p className="type-metadata text-ccf-muted text-xs uppercase tracking-wider font-semibold">
                      Academic Institution
                    </p>
                    <p className="type-body text-sm md:text-base font-semibold text-ccf-offwhite">
                      {CONTACT_LOCATION.institution}
                    </p>
                  </div>
                </Card>
              </CardReveal>

              <CardReveal delay={0.1} className="flex-1 rounded-xl">
                <Card className="bg-ccf-surface border-border/60 p-6 h-full shadow-sm flex items-start gap-4 rounded-[inherit]">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-ccf-gold/30 bg-ccf-surface-elevated text-ccf-gold">
                    <MapPin className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <p className="type-metadata text-ccf-muted text-xs uppercase tracking-wider font-semibold">
                      Campus Location
                    </p>
                    <p className="type-body text-sm md:text-base font-semibold text-ccf-offwhite">
                      {CONTACT_LOCATION.campus}
                    </p>
                    <div className="type-body text-xs text-ccf-muted leading-relaxed space-y-0.5 pt-1">
                      <p>GST Road, Vandalur</p>
                      <p>Chennai – 600 048</p>
                      <p>Tamil Nadu, India</p>
                    </div>
                  </div>
                </Card>
              </CardReveal>
            </div>

            {/* Google Maps Campus Location Embed */}
            <div className="lg:col-span-7">
              <Card className="h-full min-h-[280px] md:min-h-[320px] overflow-hidden bg-ccf-surface border-border/60 shadow-sm rounded-xl relative">
                <iframe
                  title={CONTACT_LOCATION.mapTitle}
                  src={CONTACT_LOCATION.mapEmbedUrl}
                  className="w-full h-full min-h-[280px] md:min-h-[320px] border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen={false}
                />
              </Card>
            </div>
          </div>
        </FadeIn>
      </Container>
    </section>
  );
}
