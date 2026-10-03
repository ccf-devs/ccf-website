import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { EventContent } from "@/components/events/event-content";
import { type CcfEvent } from "@/lib/data/events";

describe("Event Content Public Presentation Tests", () => {
  const baseEvent: CcfEvent = {
    id: "evt-123",
    slug: "sample",
    name: "SAMPLE",
    status: "UPCOMING",
    statusVariant: "warning",
    dateText: "15 Oct 2026",
    venue: "Crescent Campus",
    venueText: "Crescent Campus",
    description: "Fallback description",
    shortDescription: "Fallback description",
    content: {
      descriptionRich: "S",
      rulesRich: "A",
      instructionsRich: "M",
      eligibilityRich: "P",
      notesRich: "LE",
    },
  };

  it("renders all five canonical sections with human-facing labels when content exists", () => {
    const html = renderToStaticMarkup(<EventContent event={baseEvent} />);

    // Section 1: About the Event
    expect(html).toContain("About the Event");
    expect(html).toContain("S");

    // Section 2: Competition Rules
    expect(html).toContain("Competition Rules");
    expect(html).toContain("A");

    // Section 3: Participant Instructions
    expect(html).toContain("Participant Instructions");
    expect(html).toContain("M");

    // Section 4: Eligibility
    expect(html).toContain("Eligibility");
    expect(html).toContain("P");

    // Section 5: Additional Information
    expect(html).toContain("Additional Information");
    expect(html).toContain("LE");

    // CRITICAL: Ensure internal database field names are NEVER displayed
    expect(html).not.toContain("description_rich");
    expect(html).not.toContain("rules_rich");
    expect(html).not.toContain("instructions_rich");
    expect(html).not.toContain("eligibility_rich");
    expect(html).not.toContain("notes_rich");
    expect(html).not.toContain("descriptionRich");
    expect(html).not.toContain("rulesRich");
    expect(html).not.toContain("instructionsRich");
    expect(html).not.toContain("eligibilityRich");
    expect(html).not.toContain("notesRich");
  });


  it("renders markdown syntax via RichTextView", () => {
    const markdownEvent: CcfEvent = {
      ...baseEvent,
      content: {
        descriptionRich: "**BoldText** and [Link](http://google.com)",
        rulesRich: "### HeadingRule",
        instructionsRich: "- Bullet1\n- Bullet2",
        eligibilityRich: "1. Num1\n2. Num2",
        notesRich: "*ItalicText*",
      },
    };
    const html = renderToStaticMarkup(<EventContent event={markdownEvent} />);

    // Bold
    expect(html).toContain('<strong class="font-semibold text-ccf-offwhite">BoldText</strong>');
    // Link
    expect(html).toContain('<a href="http://google.com"');
    // Heading 3
    expect(html).toContain('<h3 class="text-base md:text-lg font-semibold text-ccf-offwhite mt-2 mb-1">HeadingRule</h3>');
    // Bullet list
    expect(html).toContain('<ul');
    expect(html).toContain('>Bullet1</li>');
    expect(html).toContain('>Bullet2</li>');
    // Numbered list
    expect(html).toContain('<ol');
    expect(html).toContain('>Num1</li>');
    expect(html).toContain('>Num2</li>');
    // Italic
    expect(html).toContain('<em class="italic">ItalicText</em>');

    // Ensure raw formatting is not visible
    expect(html).not.toContain("**BoldText**");
    expect(html).not.toContain("### HeadingRule");
  });

  it("does not render empty or null supplementary sections", () => {
    const eventWithOnlyDescription: CcfEvent = {
      ...baseEvent,
      content: {
        descriptionRich: "Only overview is provided.",
        rulesRich: null,
        instructionsRich: "",
        eligibilityRich: undefined,
        notesRich: "   ",
      },
    };

    const html = renderToStaticMarkup(<EventContent event={eventWithOnlyDescription} />);

    expect(html).toContain("About the Event");
    expect(html).toContain("Only overview is provided.");

    // Empty sections must NOT be rendered
    expect(html).not.toContain("Competition Rules");
    expect(html).not.toContain("Participant Instructions");
    expect(html).not.toContain("Eligibility");
    expect(html).not.toContain("Additional Information");
    expect(html).not.toContain("Event Highlights");
  });

  it("renders event highlights when non-empty, and skips them when empty", () => {
    const eventWithHighlights: CcfEvent = {
      ...baseEvent,
      content: {
        descriptionRich: "Description text",
      },
    };

    // With highlights
    const htmlWithHighlights = renderToStaticMarkup(
      <EventContent
        event={eventWithHighlights}
        content={{
          slug: "sample",
          about: "About",
          highlights: ["Keynote Session", "Prize Pool 50k"],
        }}
      />
    );
    expect(htmlWithHighlights).toContain("Event Highlights");
    expect(htmlWithHighlights).toContain("Keynote Session");
    expect(htmlWithHighlights).toContain("Prize Pool 50k");

    // Without highlights
    const htmlWithoutHighlights = renderToStaticMarkup(
      <EventContent
        event={eventWithHighlights}
        content={{
          slug: "sample",
          about: "About",
          highlights: [],
        }}
      />
    );
    expect(htmlWithoutHighlights).not.toContain("Event Highlights");
    expect(htmlWithoutHighlights).not.toContain("Event highlights will be added here.");
  });

  it("does not render the misleading 'Additional event details' banner on upcoming events", () => {
    const html = renderToStaticMarkup(<EventContent event={baseEvent} />);
    expect(html).not.toContain(
      "Additional event details will be published as they are confirmed."
    );
  });
});
