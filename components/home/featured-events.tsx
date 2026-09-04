import React from "react";
import Link from "next/link";
import { Calendar, MapPin, ArrowRight } from "lucide-react";
import { Container } from "@/components/site/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StaggerContainer, StaggerItem } from "@/components/motion/stagger";
import { FadeIn } from "@/components/motion/fade-in";
import { HOMEPAGE_FEATURED_EVENTS } from "@/lib/data/homepage";

export function FeaturedEvents() {
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

        {/* Event Cards Grid */}
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {HOMEPAGE_FEATURED_EVENTS.map((event) => (
            <StaggerItem key={event.id}>
              <Card hoverable className="flex flex-col h-full bg-ccf-surface border-border/60">
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
                    <Link href={`/events`}>
                      <span>Explore Details</span>
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </Container>
    </section>
  );
}
