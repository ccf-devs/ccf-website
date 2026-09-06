import React from "react";
import { ImageIcon } from "lucide-react";
import { FadeIn } from "@/components/motion/fade-in";
import { StaggerContainer, StaggerItem } from "@/components/motion/stagger";
import { Card } from "@/components/ui/card";
import { SmoothImage } from "@/components/ui/smooth-image";
import { CCF_EYEBROW } from "@/components/site/navigation-data";
import { type CcfEventMedia, EVENT_NOTICES, getEventMediaUrl } from "@/lib/data/event-content";

interface EventGalleryProps {
  media?: readonly CcfEventMedia[];
}

export function EventGallery({ media = [] }: EventGalleryProps) {
  const sortedMedia = [...media].sort((a, b) => a.displayOrder - b.displayOrder);
  const hasMedia = sortedMedia.length > 0;

  return (
    <section className="py-10 md:py-16 border-b border-border/30 space-y-6">
      <FadeIn>
        <div className="space-y-2">
          <p className="type-eyebrow text-ccf-gold">{CCF_EYEBROW}</p>
          <h2 className="type-h2 text-2xl md:text-3xl font-bold text-ccf-offwhite tracking-tight">
            Event Gallery
          </h2>
          <p className="type-body text-sm md:text-base text-ccf-muted">
            Photographs and visual highlights from CCF activities.
          </p>
        </div>
      </FadeIn>

      {hasMedia ? (
        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 pt-4">
          {sortedMedia.map((item) => {
            const resolvedUrl = getEventMediaUrl(item.objectKey);
            if (!resolvedUrl) return null;

            return (
              <StaggerItem key={item.id}>
                <Card className="group overflow-hidden rounded-lg bg-ccf-surface border-border/50 transition-colors hover:border-ccf-gold/40">
                  <SmoothImage
                    src={resolvedUrl}
                    alt={item.altText}
                    loading="lazy"
                    containerClassName="aspect-[4/3] w-full"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {item.caption && (
                    <div className="p-3 border-t border-border/30 bg-ccf-surface/80">
                      <p className="text-xs text-ccf-muted truncate">{item.caption}</p>
                    </div>
                  )}
                </Card>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      ) : (
        <FadeIn delay={0.1}>
          <Card className="flex flex-col items-center justify-center p-12 text-center bg-ccf-surface/40 border-dashed border-border/60 rounded-xl space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ccf-surface-elevated border border-border/50 text-ccf-muted">
              <ImageIcon className="h-6 w-6" aria-hidden="true" />
            </div>
            <p className="type-body text-sm md:text-base text-ccf-muted font-medium">
              {EVENT_NOTICES.emptyGallery}
            </p>
          </Card>
        </FadeIn>
      )}
    </section>
  );
}
