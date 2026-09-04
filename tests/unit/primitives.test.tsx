import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SectionHeading } from "@/components/ui/section-heading";
import { FadeIn } from "@/components/motion/fade-in";
import { StaggerContainer, StaggerItem } from "@/components/motion/stagger";

describe("Reusable UI & Motion Primitives", () => {
  describe("Button Component", () => {
    it("renders with default gold primary variant classes", () => {
      const html = renderToStaticMarkup(<Button>Register</Button>);
      expect(html).toContain("bg-primary");
      expect(html).toContain("text-primary-foreground");
      expect(html).toContain("Register");
    });

    it("renders secondary, outline, ghost, and destructive variants", () => {
      const secHtml = renderToStaticMarkup(
        <Button variant="secondary">Cancel</Button>
      );
      expect(secHtml).toContain("bg-secondary");

      const outlineHtml = renderToStaticMarkup(
        <Button variant="outline">Details</Button>
      );
      expect(outlineHtml).toContain("border-border");

      const ghostHtml = renderToStaticMarkup(
        <Button variant="ghost">Dismiss</Button>
      );
      expect(ghostHtml).toContain("text-ccf-muted");

      const destHtml = renderToStaticMarkup(
        <Button variant="destructive">Delete</Button>
      );
      expect(destHtml).toContain("bg-destructive");
    });

    it("supports disabled state with proper attributes and opacity styling", () => {
      const html = renderToStaticMarkup(
        <Button disabled>Disabled Action</Button>
      );
      expect(html).toContain("disabled");
      expect(html).toContain("disabled:opacity-50");
      expect(html).toContain("disabled:pointer-events-none");
    });

    it("includes focus-visible rings using design tokens", () => {
      const html = renderToStaticMarkup(<Button>Accessible Focus</Button>);
      expect(html).toContain("focus-visible:ring-2");
      expect(html).toContain("focus-visible:ring-ring");
    });
  });

  describe("Card Component System", () => {
    it("renders standard card architecture with semantic tokens", () => {
      const html = renderToStaticMarkup(
        <Card>
          <CardHeader>
            <CardTitle>Market Analysis</CardTitle>
            <CardDescription>Quarterly report summary</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Body metrics and findings.</p>
          </CardContent>
          <CardFooter>
            <span>Footer info</span>
          </CardFooter>
        </Card>
      );

      expect(html).toContain("bg-card");
      expect(html).toContain("text-card-foreground");
      expect(html).toContain("Market Analysis");
      expect(html).toContain("Quarterly report summary");
      expect(html).toContain("Body metrics and findings.");
      expect(html).toContain("Footer info");
    });

    it("supports hoverable card surface styling", () => {
      const html = renderToStaticMarkup(
        <Card hoverable>
          <CardContent>Interactive Card</CardContent>
        </Card>
      );
      expect(html).toContain("hover:border-ccf-gold/30");
      expect(html).toContain("hover:bg-ccf-surface-elevated/60");
    });

    it("renders CardTitle as an h3 element", () => {
      const html = renderToStaticMarkup(<CardTitle>Heading</CardTitle>);
      expect(html).toContain("<h3");
      expect(html).toContain("Heading");
    });
  });

  describe("Badge & Status Component", () => {
    it("renders semantic status variants", () => {
      const successHtml = renderToStaticMarkup(
        <Badge variant="success">Completed</Badge>
      );
      expect(successHtml).toContain("text-status-success");

      const warningHtml = renderToStaticMarkup(
        <Badge variant="warning">Pending Review</Badge>
      );
      expect(warningHtml).toContain("text-status-warning");

      const errorHtml = renderToStaticMarkup(
        <Badge variant="destructive">Failed</Badge>
      );
      expect(errorHtml).toContain("text-status-error");
    });

    it("renders accessible status dot when dot prop is enabled", () => {
      const html = renderToStaticMarkup(
        <Badge variant="success" dot>
          Active
        </Badge>
      );
      expect(html).toContain("bg-status-success");
      expect(html).toContain("rounded-full");
      expect(html).toContain('aria-hidden="true"');
      expect(html).toContain("Active");
    });

    it("renders info variant using CCF semantic tokens", () => {
      const infoHtml = renderToStaticMarkup(
        <Badge variant="info" dot>
          Neutral Note
        </Badge>
      );
      expect(infoHtml).toContain("text-muted-foreground");
      expect(infoHtml).toContain("bg-muted/60");
      expect(infoHtml).toContain("bg-muted-foreground");
      expect(infoHtml).toContain("Neutral Note");
    });
  });

  describe("Separator Component", () => {
    it("renders gold-rule gradient variant", () => {
      const html = renderToStaticMarkup(<Separator variant="gold" />);
      expect(html).toContain("gold-rule");
    });

    it("exposes semantic role when decorative is false", () => {
      const html = renderToStaticMarkup(
        <Separator decorative={false} orientation="horizontal" />
      );
      expect(html).toContain('role="separator"');
      expect(html).toContain('aria-orientation="horizontal"');
    });

    it("exposes role='none' when decorative is true", () => {
      const html = renderToStaticMarkup(<Separator decorative={true} />);
      expect(html).toContain('role="none"');
    });
  });

  describe("SectionHeading Component", () => {
    it("renders eyebrow, title, and description with correct typography classes", () => {
      const html = renderToStaticMarkup(
        <SectionHeading
          eyebrow="Departments"
          title="Core Divisions"
          description="Explore the specialized committees of CCF."
          withRule
        />
      );

      expect(html).toContain("type-metadata");
      expect(html).toContain("Departments");
      expect(html).toContain("type-h2");
      expect(html).toContain("Core Divisions");
      expect(html).toContain("type-body");
      expect(html).toContain("Explore the specialized committees of CCF.");
      expect(html).toContain("gold-rule");
    });
  });

  describe("Motion Primitives", () => {
    it("renders FadeIn component with children", () => {
      const html = renderToStaticMarkup(
        <FadeIn className="test-motion">
          <p>Animated content</p>
        </FadeIn>
      );
      expect(html).toContain("Animated content");
      expect(html).toContain("test-motion");
    });

    it("renders StaggerContainer and StaggerItem with children", () => {
      const html = renderToStaticMarkup(
        <StaggerContainer className="stagger-grid">
          <StaggerItem>
            <div>Item 1</div>
          </StaggerItem>
          <StaggerItem>
            <div>Item 2</div>
          </StaggerItem>
        </StaggerContainer>
      );
      expect(html).toContain("Item 1");
      expect(html).toContain("Item 2");
      expect(html).toContain("stagger-grid");
    });
  });
});
