import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RichTextView, renderInlineContent } from "@/components/ui/rich-text-view";

describe("Rich Text System Tests", () => {
  it("safely renders inline bold and italic formatting", () => {
    const html = renderToStaticMarkup(
      <RichTextView content="This is **bold text** and this is *italic text*." />
    );
    expect(html).toContain('<strong class="font-semibold text-ccf-offwhite">bold text</strong>');
    expect(html).toContain('<em class="italic">italic text</em>');
  });

  it("safely renders headings at appropriate semantic levels", () => {
    const htmlH1 = renderToStaticMarkup(<RichTextView content="# Main Header" />);
    expect(htmlH1).toContain("<h1");
    expect(htmlH1).toContain("Main Header");

    const htmlH2 = renderToStaticMarkup(<RichTextView content="## Sub Header" />);
    expect(htmlH2).toContain("<h2");
    expect(htmlH2).toContain("Sub Header");

    const htmlH3 = renderToStaticMarkup(<RichTextView content="### Section Header" />);
    expect(htmlH3).toContain("<h3");
    expect(htmlH3).toContain("Section Header");
  });

  it("renders bulleted lists correctly", () => {
    const markdown = "- First bullet point\n- Second bullet point\n- Third bullet point";
    const html = renderToStaticMarkup(<RichTextView content={markdown} />);
    expect(html).toContain("<ul");
    expect(html).toContain(">First bullet point</li>");
    expect(html).toContain(">Second bullet point</li>");
    expect(html).toContain(">Third bullet point</li>");
  });

  it("renders numbered lists correctly", () => {
    const markdown = "1. First step\n2. Second step\n3. Third step";
    const html = renderToStaticMarkup(<RichTextView content={markdown} />);
    expect(html).toContain("<ol");
    expect(html).toContain(">First step</li>");
    expect(html).toContain(">Second step</li>");
    expect(html).toContain(">Third step</li>");
  });

  it("renders safe links with security attributes (target=_blank and rel=noopener)", () => {
    const markdown = "Visit our site at [CCF Portal](https://crescent.education/ccf) for details.";
    const html = renderToStaticMarkup(<RichTextView content={markdown} />);
    expect(html).toContain('href="https://crescent.education/ccf"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain("CCF Portal");
  });

  it("sanitizes unsafe link protocols like javascript: by not rendering clickable anchor", () => {
    const malicious = "[Malicious Link](javascript:alert(document.cookie))";
    const html = renderToStaticMarkup(<RichTextView content={malicious} />);
    expect(html).not.toContain('href="javascript:');
    expect(html).not.toContain("<a");
    expect(html).toContain("Malicious Link");
  });

  it("safely neutralizes raw HTML injections and script tags", () => {
    const injection = "<script>alert('xss')</script><img src='x' onerror='alert(1)'>";
    const html = renderToStaticMarkup(<RichTextView content={injection} />);
    // React server rendering escapes HTML entities
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;script&gt;");
  });

  it("faithfully preserves and renders legacy plain-text content like S\\nA\\nM\\nP\\nLE", () => {
    const legacyText = "S\nA\nM\nP\nLE";
    const html = renderToStaticMarkup(<RichTextView content={legacyText} />);
    expect(html).toContain("S");
    expect(html).toContain("A");
    expect(html).toContain("M");
    expect(html).toContain("P");
    expect(html).toContain("LE");
    expect(html).toContain("<br/>");
  });

  it("returns null when content is empty or whitespace", () => {
    const htmlEmpty = renderToStaticMarkup(<RichTextView content="" />);
    expect(htmlEmpty).toBe("");

    const htmlWhitespace = renderToStaticMarkup(<RichTextView content={"   \t   "} />);
    expect(htmlWhitespace).toBe("");

    const htmlNull = renderToStaticMarkup(<RichTextView content={null} />);
    expect(htmlNull).toBe("");
  });
});
