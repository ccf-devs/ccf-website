import React from "react";
import Link from "next/link";
import { Calendar, MapPin, ArrowRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { type CcfEvent } from "@/lib/data/events";

interface EventCardProps {
  event: CcfEvent;
}

export function EventCard({ event }: EventCardProps) {
  const isUpcoming = event.status === "UPCOMING";

  return (
    <Card
      hoverable
      className="flex flex-col h-full bg-ccf-surface border-border/60 p-6 md:p-8 space-y-6 hover:border-ccf-gold/40 transition-colors shadow-sm"
    >
      <CardHeader className="p-0 space-y-3">
        {/* Category & Status Badges */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {event.category && (
            <span className="type-metadata text-ccf-gold font-medium text-xs">
              {event.category}
            </span>
          )}

          <Badge variant={event.statusVariant} dot className="font-mono text-xs">
            {event.status}
          </Badge>
        </div>

        {/* Event Title */}
        <div className="space-y-1 pt-1">
          <CardTitle className="text-xl md:text-2xl font-bold text-ccf-offwhite leading-snug">
            {event.name}
          </CardTitle>
          {event.edition && (
            <p className="text-xs text-ccf-gold/70 font-mono tracking-wide">
              Edition: {event.edition}
            </p>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0 space-y-4 flex-1">
        {/* Date & Venue Metadata */}
        <div className="space-y-2 text-xs text-ccf-muted border-y border-border/30 py-3">
          <div className="flex items-center gap-2.5">
            <Calendar className="h-4 w-4 text-ccf-gold shrink-0" aria-hidden="true" />
            <span className="font-medium text-ccf-offwhite/90">{event.dateText}</span>
          </div>

          {(event.venueText || event.venue) && (
            <div className="flex items-center gap-2.5">
              <MapPin className="h-4 w-4 text-ccf-gold shrink-0" aria-hidden="true" />
              <span className="truncate">{event.venueText || event.venue}</span>
            </div>
          )}
        </div>

        {/* Description */}
        <CardDescription className="type-body text-ccf-muted text-sm leading-relaxed">
          {event.description}
        </CardDescription>
      </CardContent>

      <CardFooter className="p-0 pt-4 border-t border-border/20 flex items-center justify-between">
        <Link
          href={`/events/${event.slug}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-ccf-gold hover:text-ccf-gold-light transition-colors group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ccf-gold rounded"
        >
          <span>{isUpcoming ? "View Details" : "View Event"}</span>
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      </CardFooter>
    </Card>
  );
}
