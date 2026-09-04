import React from "react";
import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

// Mock motion/react so that useReducedMotion returns true
vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return {
    ...actual,
    useReducedMotion: () => true,
  };
});

import { FadeIn } from "@/components/motion/fade-in";
import { StaggerContainer, StaggerItem } from "@/components/motion/stagger";

describe("Motion Reduced-Motion Fallback Prop Forwarding", () => {
  it("FadeIn preserves forwarded HTML, ARIA, data, and style attributes in reduced-motion mode", () => {
    const html = renderToStaticMarkup(
      <FadeIn
        id="fade-section"
        role="region"
        aria-label="Executive Committee"
        data-testid="fade-in-fallback"
        className="custom-fade-class"
        style={{ marginTop: "24px" }}
      >
        <p>Section Content</p>
      </FadeIn>
    );

    // Verify fallback rendered as <div> with children
    expect(html).toContain("<div");
    expect(html).toContain("Section Content");

    // Verify forwarded attributes are NOT dropped
    expect(html).toContain('id="fade-section"');
    expect(html).toContain('role="region"');
    expect(html).toContain('aria-label="Executive Committee"');
    expect(html).toContain('data-testid="fade-in-fallback"');
    expect(html).toContain("custom-fade-class");
    expect(html).toContain("margin-top:24px");
  });

  it("StaggerContainer preserves forwarded HTML, ARIA, data, and style attributes in reduced-motion mode", () => {
    const html = renderToStaticMarkup(
      <StaggerContainer
        id="departments-list"
        role="feed"
        aria-label="CCF Departments"
        data-testid="stagger-container-fallback"
        className="custom-stagger-class"
        style={{ display: "grid" }}
      >
        <p>Container Content</p>
      </StaggerContainer>
    );

    expect(html).toContain("<div");
    expect(html).toContain("Container Content");
    expect(html).toContain('id="departments-list"');
    expect(html).toContain('role="feed"');
    expect(html).toContain('aria-label="CCF Departments"');
    expect(html).toContain('data-testid="stagger-container-fallback"');
    expect(html).toContain("custom-stagger-class");
    expect(html).toContain("display:grid");
  });

  it("StaggerItem preserves forwarded HTML, ARIA, data, and style attributes in reduced-motion mode", () => {
    const html = renderToStaticMarkup(
      <StaggerItem
        id="item-card-1"
        role="article"
        aria-roledescription="card"
        data-testid="stagger-item-fallback"
        className="custom-item-class"
        style={{ opacity: 1 }}
      >
        <p>Item Content</p>
      </StaggerItem>
    );

    expect(html).toContain("<div");
    expect(html).toContain("Item Content");
    expect(html).toContain('id="item-card-1"');
    expect(html).toContain('role="article"');
    expect(html).toContain('aria-roledescription="card"');
    expect(html).toContain('data-testid="stagger-item-fallback"');
    expect(html).toContain("custom-item-class");
  });
});
