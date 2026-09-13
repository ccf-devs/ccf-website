import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { EventGallery } from "@/components/events/event-gallery";
import { type CcfEventMedia } from "@/lib/data/event-content";

describe("EventGallery Lightbox Interaction Tests", () => {
  const sampleMedia: CcfEventMedia[] = [
    {
      id: "med-1",
      objectKey: "events/symposium/opening.jpg",
      altText: "Symposium Opening Ceremony",
      displayOrder: 1,
      caption: "Opening ceremony keynotes",
    },
    {
      id: "med-2",
      objectKey: "events/symposium/panel.jpg",
      altText: "Panel Discussion",
      displayOrder: 2,
      caption: "Distinguished guests and panelists",
    },
    {
      id: "med-3",
      objectKey: "events/symposium/awards.jpg",
      altText: "Valedictory Awards",
      displayOrder: 3,
      caption: "Award distribution to winners",
    },
  ];

  it("renders gallery thumbnails wrapped with accessible interactive buttons", () => {
    const html = renderToStaticMarkup(<EventGallery media={sampleMedia} />);

    expect(html).toContain("Event Gallery");
    expect(html).toContain("Symposium Opening Ceremony");
    expect(html).toContain("Panel Discussion");
    expect(html).toContain("Valedictory Awards");
    expect(html).toContain('aria-label="View Symposium Opening Ceremony"');
    expect(html).toContain('aria-label="View Panel Discussion"');
  });

  it("uses the application media proxy URL for image sources", () => {
    const html = renderToStaticMarkup(<EventGallery media={sampleMedia} />);

    expect(html).toContain("/api/media/events/symposium/opening.jpg");
    expect(html).toContain("/api/media/events/symposium/panel.jpg");
    expect(html).toContain("/api/media/events/symposium/awards.jpg");
  });

  it("renders friendly empty state when no media items exist", () => {
    const html = renderToStaticMarkup(<EventGallery media={[]} />);

    expect(html).toContain("Event media will be added here.");
    expect(html).not.toContain("role=\"dialog\"");
  });
});
