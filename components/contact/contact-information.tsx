import React from "react";
import { Mail, MapPin, ExternalLink } from "lucide-react";
import { Container } from "@/components/site/container";
import { Card, CardDescription } from "@/components/ui/card";
import { CardReveal } from "@/components/ui/card-reveal";
import { FadeIn } from "@/components/motion/fade-in";
import { StaggerContainer, StaggerItem } from "@/components/motion/stagger";
import { CONTACT_CHANNELS, type ContactChannel } from "@/lib/data/contact";
import { InstagramIcon, LinkedinIcon } from "./social-icons";

const ICONS = {
  Mail,
  Instagram: InstagramIcon,
  Linkedin: LinkedinIcon,
  MapPin,
};

export function ContactInformation() {
  return (
    <section className="py-12 md:py-20 border-b border-border/30">
      <Container className="space-y-8">
        <FadeIn>
          <div className="space-y-2">
            <h2 className="type-h2 text-2xl md:text-3xl font-bold text-ccf-offwhite tracking-tight">
              Official Contact Details
            </h2>
            <p className="type-body text-sm md:text-base text-ccf-muted max-w-2xl">
              Use the verified communication channels below to connect directly with the Crescent Club of Finance.
            </p>
          </div>
        </FadeIn>

        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {CONTACT_CHANNELS.map((channel: ContactChannel) => {
            const Icon = ICONS[channel.iconName];
            const isClickable = Boolean(channel.href);

            const cardContent = (
              <CardReveal className="h-full rounded-xl">
                <Card
                  hoverable={isClickable}
                  className={`flex flex-col h-full bg-ccf-surface border-border/60 p-6 space-y-4 shadow-sm transition-colors rounded-[inherit] ${
                    isClickable ? "hover:border-ccf-gold/40" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-ccf-gold/30 bg-ccf-surface-elevated text-ccf-gold">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    {channel.isExternal && (
                      <ExternalLink className="h-4 w-4 text-ccf-muted/60" aria-hidden="true" />
                    )}
                  </div>

                  <div className="space-y-1.5 flex-1 min-w-0">
                    <span className="type-metadata text-ccf-gold text-xs font-semibold uppercase tracking-wider">
                      {channel.label}
                    </span>
                    <p className="type-body font-semibold text-ccf-offwhite text-sm md:text-base break-words">
                      {channel.value}
                    </p>
                    <CardDescription className="type-body text-xs text-ccf-muted leading-relaxed pt-1">
                      {channel.description}
                    </CardDescription>
                  </div>

                  {isClickable && (
                    <div className="pt-2 border-t border-border/20 text-xs text-ccf-gold font-medium inline-flex items-center gap-1">
                      <span>{channel.iconName === "Mail" ? "Send Email →" : "Visit Channel →"}</span>
                    </div>
                  )}
                </Card>
              </CardReveal>
            );

            return (
              <StaggerItem key={channel.id}>
                {channel.href ? (
                  <a
                    href={channel.href}
                    target={channel.isExternal ? "_blank" : undefined}
                    rel={channel.isExternal ? "noopener noreferrer" : undefined}
                    className="block h-full rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ccf-gold"
                    aria-label={`${channel.label}: ${channel.value}${channel.isExternal ? " (opens in a new tab)" : ""}`}
                  >
                    {cardContent}
                  </a>
                ) : (
                  cardContent
                )}
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      </Container>
    </section>
  );
}
