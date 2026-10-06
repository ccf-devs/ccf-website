import React from "react";
import { Calendar, History, MapPin } from "lucide-react";
import { Container } from "@/components/site/container";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { StaggerContainer, StaggerItem } from "@/components/motion/stagger";

export interface EventsOverviewProps {
  upcomingCount?: number;
  pastCount?: number;
}

export function EventsOverview({
  upcomingCount = 0,
  pastCount = 0,
}: EventsOverviewProps = {}) {
  const stats = [
    {
      icon: Calendar,
      title: `${upcomingCount} ${upcomingCount === 1 ? "Upcoming Event" : "Upcoming Events"}`,
      description:
        upcomingCount > 0
          ? "Upcoming finance symposiums, workshops, and competitions at Crescent Campus."
          : "No upcoming events currently scheduled at Crescent Campus.",
    },
    {
      icon: History,
      title: `${pastCount} ${pastCount === 1 ? "Concluded Event" : "Concluded Events"}`,
      description:
        pastCount > 0
          ? "Past symposiums, competitions, and educational activities organized by CCF."
          : "No past events recorded in the archive.",
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
