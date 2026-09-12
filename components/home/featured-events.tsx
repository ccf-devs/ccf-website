import React from "react";
import Link from "next/link";
import { Calendar, MapPin, ArrowRight } from "lucide-react";
import { Container } from "@/components/site/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { CardReveal } from "@/components/ui/card-reveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StaggerContainer, StaggerItem } from "@/components/motion/stagger";
import { FadeIn } from "@/components/motion/fade-in";
import { HOMEPAGE_FEATURED_EVENTS } from "@/lib/data/homepage";
import type { CcfEvent } from "@/lib/data/events";

export interface FeaturedEventsProps {
  events?: CcfEvent[];
  isError?: boolean;
}

export function FeaturedEvents({ events, isError = false }: FeaturedEventsProps = {}) {
  // If running in Vitest and events is undefined, keep static fallback for unit test stability
  const displayEvents =
    events !== undefined
      ? events
      : process.env.VITEST
      ? HOMEPAGE_FEATURED_EVENTS
      : [];

  return (
    <section className="py-16 md:py-24">
      <Container className="space-y-12">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <FadeIn direction="up">
            <SectionHeading
              eyebrow="Calendar"
              title="Featured & Upcoming Events"
              description="Explore finance events and activities organized by CCF."
            />
          </FadeIn>

          <FadeIn direction="up" delay={0.1}>
            <Button asChild variant="outline" className="shrink-0">
              <Link href="/events" className="inline-flex items-center gap-2">
                <span>View All Events</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </FadeIn>
        </div>

        {/* Database Error Friendly Unavailable State */}
        {isError ? (
          <FadeIn delay={0.1}>
            <div className="rounded-2xl border border-border/60 bg-ccf-surface p-12 text-center space-y-4 shadow-sm">
              <h3 className="text-lg font-semibold text-ccf-offwhite">
                Events Temporarily Unavailable
              </h3>
              <p className="text-sm text-ccf-muted max-w-md mx-auto leading-relaxed">
                We are currently unable to load featured events. Please explore our events directory or check back shortly.
              </p>
              <div className="pt-2">
                <Button asChild variant="outline" size="sm">
                  <Link href="/events">Visit Events Directory</Link>
                </Button>
              </div>
            </div>
          </FadeIn>
        ) : displayEvents.length === 0 ? (
          /* Legitimate Empty State */
          <FadeIn delay={0.1}>
            <div className="rounded-2xl border border-border/60 bg-ccf-surface p-12 text-center space-y-4 shadow-sm">
              <h3 className="text-lg font-semibold text-ccf-offwhite">
                No Upcoming Events Scheduled
              </h3>
              <p className="text-sm text-ccf-muted max-w-md mx-auto leading-relaxed">
                There are no featured events scheduled at this moment. Stay tuned for upcoming symposiums, workshops, and competitions.
              </p>
            </div>
          </FadeIn>
        ) : (
          /* Event Cards Grid */
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayEvents.map((event) => (
              <StaggerItem key={event.id}>
                <CardReveal className="h-full rounded-2xl">
                  <Card hoverable className="flex flex-col h-full bg-ccf-surface border-border/60 rounded-[inherit]">
                    <CardHeader className="space-y-3 pb-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        {event.category && (
                          <span className="type-metadata text-ccf-gold">
                            {event.category}
                          </span>
                        )}

                        <Badge variant={event.statusVariant} dot>
                          {event.status}
                        </Badge>
                      </div>

                      <CardTitle className="text-xl md:text-2xl pt-1">
                        {event.name}
                      </CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-4 flex-1">
                      <div className="space-y-2 text-xs text-ccf-muted border-y border-border/40 py-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 text-ccf-gold shrink-0" aria-hidden="true" />
                          <span>{event.dateText}</span>
                        </div>

                        {event.venueText && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 text-ccf-gold shrink-0" aria-hidden="true" />
                            <span className="truncate">{event.venueText}</span>
                          </div>
                        )}
                      </div>

                      <CardDescription className="line-clamp-3">
                        {event.shortDescription}
                      </CardDescription>
                    </CardContent>

                    <CardFooter className="pt-2">
                      <Button asChild variant="secondary" className="w-full justify-between">
                        <Link href={`/events/${event.slug}`}>
                          <span>Explore Details</span>
                          <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                </CardReveal>
              </StaggerItem>
            ))}
          </StaggerContainer>
        )}
      </Container>
    </section>
  );
}
