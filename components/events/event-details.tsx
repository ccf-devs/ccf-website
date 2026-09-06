import React from "react";
import { Calendar, MapPin, Tag, Layers } from "lucide-react";
import { Card } from "@/components/ui/card";
import { FadeIn } from "@/components/motion/fade-in";
import { StaggerContainer, StaggerItem } from "@/components/motion/stagger";
import { type CcfEvent } from "@/lib/data/events";

interface EventDetailsProps {
  event: CcfEvent;
}

export function EventDetails({ event }: EventDetailsProps) {
  const items = [
    {
      label: "Date",
      value: event.dateText,
      icon: Calendar,
    },
    {
      label: "Location",
      value: event.venueText || event.venue,
      icon: MapPin,
    },
    {
      label: "Category",
      value: event.category,
      icon: Tag,
    },
    {
      label: "Edition",
      value: event.edition,
      icon: Layers,
    },
  ].filter(
    (item): item is { label: string; value: string; icon: typeof Calendar } =>
      Boolean(item.value && item.value.trim().length > 0)
  );

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="py-8 md:py-12 border-b border-border/30">
      <FadeIn>
        <div className="mb-4">
          <span className="editorial-tag">EVENT BRIEF // SPECIFICATION</span>
        </div>
        <h2 className="sr-only">Event Information</h2>
      </FadeIn>
      <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {items.map((item, idx) => {
          const Icon = item.icon;
          return (
            <StaggerItem key={idx}>
              <Card className="bg-ccf-surface border-border/50 p-5 flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-ccf-gold/30 bg-ccf-surface-elevated text-ccf-gold">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="space-y-1 min-w-0 flex-1">
                  <p className="type-metadata text-ccf-muted text-xs uppercase tracking-wider font-semibold">
                    {item.label}
                  </p>
                  <p className="type-body text-sm font-medium text-ccf-offwhite truncate">
                    {item.value}
                  </p>
                </div>
              </Card>
            </StaggerItem>
          );
        })}
      </StaggerContainer>
    </section>
  );
}
