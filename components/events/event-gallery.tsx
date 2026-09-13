"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ImageIcon, X, ChevronLeft, ChevronRight } from "lucide-react";
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
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const handleClose = useCallback(() => {
    setSelectedIndex(null);
  }, []);

  const handlePrev = useCallback(() => {
    setSelectedIndex((current) => {
      if (current === null || sortedMedia.length === 0) return null;
      return (current - 1 + sortedMedia.length) % sortedMedia.length;
    });
  }, [sortedMedia.length]);

  const handleNext = useCallback(() => {
    setSelectedIndex((current) => {
      if (current === null || sortedMedia.length === 0) return null;
      return (current + 1) % sortedMedia.length;
    });
  }, [sortedMedia.length]);

  // Keyboard navigation
  useEffect(() => {
    if (selectedIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "ArrowRight") {
        handleNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndex, handleClose, handlePrev, handleNext]);

  const activeMedia = selectedIndex !== null ? sortedMedia[selectedIndex] : null;
  const activeUrl = activeMedia ? getEventMediaUrl(activeMedia.objectKey) : null;

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
          {sortedMedia.map((item, index) => {
            const resolvedUrl = getEventMediaUrl(item.objectKey);
            if (!resolvedUrl) return null;

            return (
              <StaggerItem key={item.id}>
                <button
                  type="button"
                  onClick={() => setSelectedIndex(index)}
                  className="w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ccf-gold rounded-lg block cursor-pointer"
                  aria-label={`View ${item.altText || `gallery image ${index + 1}`}`}
                >
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
                </button>
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

      {/* Lightbox / Carousel Modal */}
      {selectedIndex !== null && activeMedia && activeUrl && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Event image lightbox"
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md p-4 md:p-8"
          onClick={handleClose}
        >
          {/* Top Bar: Counter & Close button */}
          <div
            className="absolute top-4 left-4 right-4 flex items-center justify-between z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-xs md:text-sm font-medium text-ccf-muted bg-black/50 px-3 py-1.5 rounded-full border border-white/10">
              Image {selectedIndex + 1} of {sortedMedia.length}
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="p-2 rounded-full bg-black/50 hover:bg-black/80 border border-white/10 text-ccf-offwhite transition-colors focus:outline-none focus:ring-2 focus:ring-ccf-gold"
              aria-label="Close lightbox"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Main Image Viewport */}
          <div
            className="relative flex items-center justify-center w-full h-full max-h-[85vh] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Previous Button (if multiple images) */}
            {sortedMedia.length > 1 && (
              <button
                type="button"
                onClick={handlePrev}
                className="absolute left-2 md:left-4 z-10 p-2.5 rounded-full bg-black/60 hover:bg-black/90 border border-white/15 text-ccf-offwhite transition-colors focus:outline-none focus:ring-2 focus:ring-ccf-gold"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-6 w-6 md:h-8 md:w-8" />
              </button>
            )}

            {/* Lightbox Image */}
            <div className="flex flex-col items-center max-h-full max-w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeUrl}
                alt={activeMedia.altText || "Gallery photograph"}
                className="max-h-[75vh] max-w-[85vw] object-contain rounded-lg shadow-2xl select-none"
              />

              {/* Caption / Alt Text */}
              {(activeMedia.caption || activeMedia.altText) && (
                <div className="mt-3 max-w-xl text-center px-4 py-2 bg-black/60 rounded-md border border-white/10">
                  <p className="text-xs md:text-sm text-ccf-offwhite">
                    {activeMedia.caption || activeMedia.altText}
                  </p>
                </div>
              )}
            </div>

            {/* Next Button (if multiple images) */}
            {sortedMedia.length > 1 && (
              <button
                type="button"
                onClick={handleNext}
                className="absolute right-2 md:right-4 z-10 p-2.5 rounded-full bg-black/60 hover:bg-black/90 border border-white/15 text-ccf-offwhite transition-colors focus:outline-none focus:ring-2 focus:ring-ccf-gold"
                aria-label="Next image"
              >
                <ChevronRight className="h-6 w-6 md:h-8 md:w-8" />
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
