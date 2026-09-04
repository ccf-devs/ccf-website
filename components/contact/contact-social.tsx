import React from "react";
import { ExternalLink } from "lucide-react";
import { Container } from "@/components/site/container";
import { Card } from "@/components/ui/card";
import { FadeIn } from "@/components/motion/fade-in";
import { CONTACT_SOCIAL, CONTACT_CHANNELS } from "@/lib/data/contact";
import { InstagramIcon, LinkedinIcon } from "./social-icons";

export function ContactSocial() {
  const socialChannels = CONTACT_CHANNELS.filter((c) => c.isExternal);

  return (
    <section className="py-12 md:py-20 border-b border-border/30 bg-ccf-navy-secondary/20">
      <Container className="space-y-8">
        <FadeIn>
          <div className="space-y-2 max-w-2xl">
            <span className="type-eyebrow text-ccf-gold">
              {CONTACT_SOCIAL.eyebrow}
            </span>
            <h2 className="type-h2 text-2xl md:text-3xl font-bold text-ccf-offwhite tracking-tight">
              {CONTACT_SOCIAL.heading}
            </h2>
            <p className="type-body text-sm md:text-base text-ccf-muted">
              {CONTACT_SOCIAL.description}
            </p>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {socialChannels.map((channel) => {
            const Icon = channel.iconName === "Instagram" ? InstagramIcon : LinkedinIcon;

            return (
              <FadeIn key={channel.id} delay={0.1}>
                <a
                  href={channel.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block h-full rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ccf-gold"
                  aria-label={`${channel.label}: ${channel.value} on ${channel.label} (opens in a new tab)`}
                >
                  <Card className="h-full bg-ccf-surface border-border/60 p-6 md:p-8 flex items-start gap-5 transition-colors hover:border-ccf-gold/40 shadow-sm">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-ccf-gold/30 bg-ccf-surface-elevated text-ccf-gold">
                      <Icon className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="type-h3 text-lg md:text-xl font-bold text-ccf-offwhite group-hover:text-ccf-gold transition-colors truncate">
                          {channel.label}
                        </h3>
                        <ExternalLink className="h-4 w-4 text-ccf-muted shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                      </div>
                      <p className="type-metadata font-mono text-xs text-ccf-gold">
                        {channel.value}
                      </p>
                      <p className="type-body text-xs md:text-sm text-ccf-muted leading-relaxed">
                        {channel.description}
                      </p>
                    </div>
                  </Card>
                </a>
              </FadeIn>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
