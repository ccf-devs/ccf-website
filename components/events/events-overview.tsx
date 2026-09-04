import React from "react";
import { Calendar, History, MapPin } from "lucide-react";
import { Container } from "@/components/site/container";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FadeIn } from "@/components/motion/fade-in";
import { StaggerContainer, StaggerItem } from "@/components/motion/stagger";
import { CCF_UPCOMING_EVENTS, CCF_PAST_EVENTS } from "@/lib/data/events";

export function EventsOverview() {
  const stats = [
    {
      icon: Calendar,
      title: `${CCF_UPCOMING_EVENTS.length} Upcoming Event`,
      description: "Magnora’26 finance and business symposium scheduled at Crescent Campus.",
    },
    {
      icon: History,
      title: `${CCF_PAST_EVENTS.length} Concluded Events`,
      description: "FinRise’25 and FinVibe Fiesta Season 02 are past CCF events.",
    },
    {
      icon: MapPin,
      title: "Campus Location",
      description: "B.S. Abdur Rahman Crescent Institute of Science and Technology, Vandalur.",
    },
  ];

  return (
    <section className="py-12 md:py-16 border-b border-border/30 bg-ccf-navy-secondary/20">
      <Container>
        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <StaggerItem key={idx}>
                <Card className="h-full bg-ccf-surface border-border/50 p-6 flex flex-col space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-ccf-gold/30 bg-ccf-surface-elevated text-ccf-gold">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <CardTitle className="text-base font-semibold text-ccf-offwhite">
                      {stat.title}
                    </CardTitle>
                  </div>
                  <CardDescription className="text-xs md:text-sm text-ccf-muted leading-relaxed">
                    {stat.description}
                  </CardDescription>
                </Card>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      </Container>
    </section>
  );
}
