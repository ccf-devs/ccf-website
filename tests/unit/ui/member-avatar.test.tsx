import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemberAvatar } from "@/components/members/member-avatar";

describe("MemberAvatar Component with Coin Reveal", () => {
  it("renders monogram initials fallback when photo is absent", () => {
    const html = renderToStaticMarkup(
      <MemberAvatar name="John Doe" initials="JD" />
    );

    expect(html).toContain("JD");
    expect(html).toContain('aria-label="John Doe initials"');
  });

  it("renders photo element with accessible alt text when photo is present", () => {
    const html = renderToStaticMarkup(
      <MemberAvatar
        name="Jane Smith"
        initials="JS"
        photoObjectKey="/members/jane_smith.jpg"
      />
    );

    expect(html).toContain('alt="Jane Smith"');
    // Verify initials base layer exists to prevent blank face during load
    expect(html).toContain("JS");
  });

  it("renders gold coin front face with canonical CCF emblem", () => {
    const html = renderToStaticMarkup(
      <MemberAvatar name="Jane Smith" initials="JS" />
    );

    expect(html).toContain("ccf_logo_edited.png");
  });

  it("renders gold coin with darker CCF gold styling", () => {
    const html = renderToStaticMarkup(
      <MemberAvatar name="Jane Smith" initials="JS" />
    );

    expect(html).toContain("border-ccf-gold-dark");
    expect(html).toContain("rgba(198, 144, 45, 1)");
  });
});
