import React from "react";
import { Container } from "@/components/site/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { FadeIn } from "@/components/motion/fade-in";
import { StaggerContainer, StaggerItem } from "@/components/motion/stagger";
import {
  CCF_UPCOMING_EVENTS,
  CCF_PAST_EVENTS,
  EVENTS_DIRECTORY_INFO,
  type CcfEvent,
} from "@/lib/data/events";
import { EventCard } from "./event-card";

interface EventsListProps {
  upcomingEvents?: readonly CcfEvent[];
  pastEvents?: readonly CcfEvent[];
}

export function EventsList({
  upcomingEvents = CCF_UPCOMING_EVENTS,
  pastEvents = CCF_PAST_EVENTS,
}: EventsListProps = {}) {
  return (
    <section id="events-list" className="py-16 md:py-24 border-b border-border/30 bg-background">
      {/* Anchor for directory navigation */}
      <span id="directory" className="sr-only" aria-hidden="true">
        Events Directory
      </span>

      <Container className="space-y-20">
        {/* Section 1: Upcoming Events */}
        <div className="space-y-10">
          <FadeIn direction="up">
            <div className="space-y-1">
              <SectionHeading
                eyebrow={EVENTS_DIRECTORY_INFO.eyebrow}
                title={EVENTS_DIRECTORY_INFO.upcomingHeading}
                description={EVENTS_DIRECTORY_INFO.upcomingDescription}
                align="left"
              />
            </div>
          </FadeIn>

          {upcomingEvents.length > 0 ? (
            <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {upcomingEvents.map((event) => (
                <StaggerItem key={event.id}>
                  <EventCard event={event} />
                </StaggerItem>
              ))}
            </StaggerContainer>
          ) : (
            <p className="text-sm text-ccf-muted py-6">
              No upcoming events at this time. Check back soon.
            </p>
          )}
        </div>

        {/* Section 2: Past Events */}
        <div className="space-y-10 pt-8 border-t border-border/30">
          <FadeIn direction="up">
            <div className="space-y-1">
              <SectionHeading
                eyebrow={EVENTS_DIRECTORY_INFO.eyebrow}
                title={EVENTS_DIRECTORY_INFO.pastHeading}
                description={EVENTS_DIRECTORY_INFO.pastDescription}
                align="left"
              />
            </div>
          </FadeIn>

          {pastEvents.length > 0 ? (
            <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {pastEvents.map((event) => (
                <StaggerItem key={event.id}>
                  <EventCard event={event} />
                </StaggerItem>
              ))}
            </StaggerContainer>
          ) : (
            <p className="text-sm text-ccf-muted py-6">
              No past events recorded.
            </p>
          )}
        </div>
      </Container>
    </section>
  );
}
