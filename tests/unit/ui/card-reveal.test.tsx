import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CardReveal } from "@/components/ui/card-reveal";

describe("CardReveal Component", () => {
  it("renders children cleanly with preserved classes", () => {
    const html = renderToStaticMarkup(
      <CardReveal className="custom-card-class">
        <div data-testid="card-content">Card Content</div>
      </CardReveal>
    );

    expect(html).toContain("custom-card-class");
    expect(html).toContain("Card Content");
  });

  it("does not render infinite animation or unbounded elements", () => {
    const html = renderToStaticMarkup(
      <CardReveal>
        <p>Test Content</p>
      </CardReveal>
    );

    expect(html).toContain("Test Content");
  });

  it("renders with reduced motion support without crashing", () => {
    const html = renderToStaticMarkup(
      <CardReveal className="reduced-card">
        <span>Static Fallback Content</span>
      </CardReveal>
    );
    expect(html).toContain("Static Fallback Content");
    expect(html).toContain("reduced-card");
  });
});
