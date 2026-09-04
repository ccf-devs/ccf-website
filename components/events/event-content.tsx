import React from "react";
import { Info, CheckCircle2, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { FadeIn } from "@/components/motion/fade-in";
import { type CcfEvent } from "@/lib/data/events";
import { type CcfEventContent, EVENT_NOTICES } from "@/lib/data/event-content";

interface EventContentProps {
  event: CcfEvent;
  content?: CcfEventContent;
}

export function EventContent({ event, content }: EventContentProps) {
  const isUpcoming = event.status === "UPCOMING";
  const aboutText = content?.about || event.description;
  const highlights = content?.highlights;
  const noticeText = content?.notes || (isUpcoming ? EVENT_NOTICES.upcoming : EVENT_NOTICES.past);

  return (
    <section className="py-10 md:py-14 space-y-8 border-b border-border/30">
      {/* Notice Banner */}
      <FadeIn>
        <div
          className={`flex items-start gap-3 rounded-lg border p-4 text-xs md:text-sm ${
            isUpcoming
              ? "border-ccf-gold/30 bg-ccf-gold/5 text-ccf-gold-light"
              : "border-border/50 bg-ccf-surface/80 text-ccf-muted"
          }`}
          role="status"
        >
          {isUpcoming ? (
            <Clock className="h-5 w-5 text-ccf-gold shrink-0 mt-0.5" aria-hidden="true" />
          ) : (
            <Info className="h-5 w-5 text-ccf-muted shrink-0 mt-0.5" aria-hidden="true" />
          )}
          <p className="leading-relaxed">{noticeText}</p>
        </div>
      </FadeIn>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* About Section */}
        <FadeIn delay={0.1}>
          <div className="space-y-4">
            <h2 className="type-h3 text-xl md:text-2xl font-bold text-ccf-offwhite tracking-tight">
              About the Event
            </h2>
            <p className="type-body text-ccf-muted text-sm md:text-base leading-relaxed">
              {aboutText}
            </p>
          </div>
        </FadeIn>

        {/* Highlights Section */}
        <FadeIn delay={0.2}>
          <div className="space-y-4">
            <h2 className="type-h3 text-xl md:text-2xl font-bold text-ccf-offwhite tracking-tight">
              Event Highlights
            </h2>
            {highlights && highlights.length > 0 ? (
              <ul className="space-y-2.5 text-sm text-ccf-muted">
                {highlights.map((highlight, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-ccf-gold shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <Card className="bg-ccf-surface/50 border-border/40 p-5">
                <p className="text-xs md:text-sm text-ccf-muted italic">
                  {EVENT_NOTICES.emptyHighlights}
                </p>
              </Card>
            )}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
