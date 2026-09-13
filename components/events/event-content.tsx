import React from "react";
import { Info, CheckCircle2, BookOpen, ScrollText, Users, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { FadeIn } from "@/components/motion/fade-in";
import { type CcfEvent } from "@/lib/data/events";
import { type CcfEventContent, EVENT_NOTICES } from "@/lib/data/event-content";
import { RichTextView } from "@/components/ui/rich-text-view";

interface EventContentProps {
  event: CcfEvent;
  content?: CcfEventContent;
}

export function EventContent({ event, content }: EventContentProps) {
  const isUpcoming = event.status === "UPCOMING";
  const aboutText = event.content?.descriptionRich || content?.about || event.description;
  const rulesText = event.content?.rulesRich?.trim();
  const instructionsText = event.content?.instructionsRich?.trim();
  const eligibilityText = event.content?.eligibilityRich?.trim();
  const notesText = event.content?.notesRich?.trim();
  const highlights = content?.highlights;

  // The "Additional event details will be published as they are confirmed" notice was unconditional
  // legacy placeholder copy from early static prototypes. In the production platform, events with rich
  // content or confirmed details should never display this misleading pending banner.
  // Concluded/past events retain the past notice if applicable.
  const noticeText = isUpcoming
    ? null
    : (content?.notes !== EVENT_NOTICES.upcoming ? content?.notes : null) || EVENT_NOTICES.past;

  const hasSupplementaryContent =
    Boolean(rulesText) ||
    Boolean(instructionsText) ||
    Boolean(eligibilityText) ||
    Boolean(notesText) ||
    Boolean(highlights && highlights.length > 0) ||
    Boolean(content && !event.content);

  return (
    <section className="py-10 md:py-14 space-y-8 border-b border-border/30">
      {/* Notice Banner */}
      {noticeText && (
        <FadeIn>
          <div
            className="flex items-start gap-3 rounded-lg border border-border/50 bg-ccf-surface/80 text-ccf-muted p-4 text-xs md:text-sm"
            role="status"
          >
            <Info className="h-5 w-5 text-ccf-muted shrink-0 mt-0.5" aria-hidden="true" />
            <p className="leading-relaxed">{noticeText}</p>
          </div>
        </FadeIn>
      )}

      {/* Main Narrative Sections */}
      <div className="space-y-10">
        {/* 1. About the Event (Always rendered if content exists) */}
        {aboutText && (
          <FadeIn delay={0.1}>
            <div className="space-y-4">
              <h2 className="type-h3 text-xl md:text-2xl font-bold text-ccf-offwhite tracking-tight">
                About the Event
              </h2>
              <div className="type-body text-ccf-muted text-sm md:text-base leading-relaxed">
                <RichTextView content={aboutText} />
              </div>
            </div>
          </FadeIn>
        )}

        {/* 2. Structured Supplementary Sections (Rendered only when non-empty) */}
        {hasSupplementaryContent && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Competition Rules */}
            {rulesText && (
              <FadeIn delay={0.15}>
                <Card className="p-6 bg-ccf-surface/60 border-border/50 rounded-xl space-y-3 h-full">
                  <div className="flex items-center gap-2.5">
                    <ScrollText className="h-5 w-5 text-ccf-gold shrink-0" aria-hidden="true" />
                    <h3 className="text-base md:text-lg font-bold text-ccf-offwhite tracking-tight">
                      Competition Rules
                    </h3>
                  </div>
                  <div className="text-sm text-ccf-muted leading-relaxed">
                    <RichTextView content={rulesText} />
                  </div>
                </Card>
              </FadeIn>
            )}

            {/* Participant Instructions */}
            {instructionsText && (
              <FadeIn delay={0.2}>
                <Card className="p-6 bg-ccf-surface/60 border-border/50 rounded-xl space-y-3 h-full">
                  <div className="flex items-center gap-2.5">
                    <BookOpen className="h-5 w-5 text-ccf-gold shrink-0" aria-hidden="true" />
                    <h3 className="text-base md:text-lg font-bold text-ccf-offwhite tracking-tight">
                      Participant Instructions
                    </h3>
                  </div>
                  <div className="text-sm text-ccf-muted leading-relaxed">
                    <RichTextView content={instructionsText} />
                  </div>
                </Card>
              </FadeIn>
            )}

            {/* Eligibility Details */}
            {eligibilityText && (
              <FadeIn delay={0.25}>
                <Card className="p-6 bg-ccf-surface/60 border-border/50 rounded-xl space-y-3 h-full">
                  <div className="flex items-center gap-2.5">
                    <Users className="h-5 w-5 text-ccf-gold shrink-0" aria-hidden="true" />
                    <h3 className="text-base md:text-lg font-bold text-ccf-offwhite tracking-tight">
                      Eligibility
                    </h3>
                  </div>
                  <div className="text-sm text-ccf-muted leading-relaxed">
                    <RichTextView content={eligibilityText} />
                  </div>
                </Card>
              </FadeIn>
            )}

            {/* Additional Information */}
            {notesText && (
              <FadeIn delay={0.3}>
                <Card className="p-6 bg-ccf-surface/60 border-border/50 rounded-xl space-y-3 h-full">
                  <div className="flex items-center gap-2.5">
                    <AlertCircle className="h-5 w-5 text-ccf-gold shrink-0" aria-hidden="true" />
                    <h3 className="text-base md:text-lg font-bold text-ccf-offwhite tracking-tight">
                      Additional Information
                    </h3>
                  </div>
                  <div className="text-sm text-ccf-muted leading-relaxed">
                    <RichTextView content={notesText} />
                  </div>
                </Card>
              </FadeIn>
            )}

            {/* Event Highlights (Rendered when non-empty, or for mock content) */}
            {highlights && highlights.length > 0 ? (
              <FadeIn delay={0.35}>
                <Card className="p-6 bg-ccf-surface/60 border-border/50 rounded-xl space-y-3 h-full">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-5 w-5 text-ccf-gold shrink-0" aria-hidden="true" />
                    <h3 className="text-base md:text-lg font-bold text-ccf-offwhite tracking-tight">
                      Event Highlights
                    </h3>
                  </div>
                  <ul className="space-y-2.5 text-sm text-ccf-muted">
                    {highlights.map((highlight, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <CheckCircle2 className="h-4 w-4 text-ccf-gold shrink-0 mt-0.5" aria-hidden="true" />
                        <span>{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </FadeIn>
            ) : content && !event.content ? (
              <FadeIn delay={0.35}>
                <Card className="p-6 bg-ccf-surface/50 border-border/40 rounded-xl space-y-3 h-full">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-5 w-5 text-ccf-gold shrink-0" aria-hidden="true" />
                    <h3 className="text-base md:text-lg font-bold text-ccf-offwhite tracking-tight">
                      Event Highlights
                    </h3>
                  </div>
                  <p className="text-xs md:text-sm text-ccf-muted italic">
                    {EVENT_NOTICES.emptyHighlights}
                  </p>
                </Card>
              </FadeIn>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
