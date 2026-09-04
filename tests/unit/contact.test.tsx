import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  CONTACT_HERO,
  CONTACT_CHANNELS,
  CONTACT_SOCIAL,
  CONTACT_LOCATION,
  CONTACT_CTA,
} from "@/lib/data/contact";
import {
  ContactHero,
  ContactInformation,
  ContactSocial,
  ContactLocation,
  ContactCta,
} from "@/components/contact";
import ContactPage, { metadata } from "@/app/(public)/contact/page";

describe("Contact Page Comprehensive Verification (Phase 5 Task 6)", () => {
  const FORBIDDEN_SUPERLATIVES = [
    "premier",
    "leading",
    "flagship",
    "largest",
    "renowned",
    "prestigious",
    "industry-leading",
    "award-winning",
    "globally recognized",
    "revolutionary",
    "world-class",
    "groundbreaking",
  ];

  const UNVERIFIED_CLAIMS = [
    "empowers",
    "transforms",
    "builds careers",
    "creates leaders",
    "industry exposure",
    "real-world opportunities",
    "connects students with professionals",
    "future leaders",
    "elite",
    "best minds",
  ];

  describe("1. Canonical Data Integrity & Verified Information", () => {
    it("contains verified official email with conservative description", () => {
      const emailChannel = CONTACT_CHANNELS.find((c) => c.id === "channel-email");
      expect(emailChannel).toBeDefined();
      expect(emailChannel?.value).toBe("crescentcluboffinance26@gmail.com");
      expect(emailChannel?.href).toBe("mailto:crescentcluboffinance26@gmail.com");
      expect(emailChannel?.description).toBe(
        "Official email channel for contacting Crescent Club of Finance."
      );
    });

    it("contains verified official Instagram link with conservative description", () => {
      const igChannel = CONTACT_CHANNELS.find((c) => c.id === "channel-instagram");
      expect(igChannel).toBeDefined();
      expect(igChannel?.href).toBe(
        "https://www.instagram.com/crescentcluboffinance?igsh=MXIyYXpnMmdnNmMyeA=="
      );
      expect(igChannel?.description).toBe(
        "Official Instagram channel of Crescent Club of Finance."
      );
    });

    it("contains verified official LinkedIn link with conservative description", () => {
      const liChannel = CONTACT_CHANNELS.find((c) => c.id === "channel-linkedin");
      expect(liChannel).toBeDefined();
      expect(liChannel?.href).toBe(
        "https://www.linkedin.com/company/ccf-2024/"
      );
      expect(liChannel?.description).toBe(
        "Official LinkedIn channel of Crescent Club of Finance."
      );
    });

    it("contains verified institution, campus location, and official address without unsupported recognized claim", () => {
      expect(CONTACT_LOCATION.institution).toBe(
        "B.S. Abdur Rahman Crescent Institute of Science and Technology"
      );
      expect(CONTACT_LOCATION.campus).toBe("Crescent College, Vandalur");
      expect(CONTACT_LOCATION.address).toBe(
        "GST Road, Vandalur, Chennai – 600 048, Tamil Nadu, India"
      );
      expect(CONTACT_LOCATION.description).toBe(
        "Crescent Club of Finance is based at B.S. Abdur Rahman Crescent Institute of Science and Technology."
      );
      // Strictly no "recognized" claim
      expect(CONTACT_LOCATION.description).not.toContain("recognized");
    });

    it("configures Google Maps based strictly on verified Crescent campus coordinates without API keys or broad text query", () => {
      expect(CONTACT_LOCATION.mapTitle).toBe("Map showing Crescent College, Vandalur");
      expect(CONTACT_LOCATION.mapEmbedUrl).toContain("maps.google.com/maps");
      expect(CONTACT_LOCATION.mapEmbedUrl).toContain("12.87748");
      expect(CONTACT_LOCATION.mapEmbedUrl).toContain("80.08462");

      // Regression protection: broad text search query must not be used as location target
      expect(CONTACT_LOCATION.mapEmbedUrl).not.toContain(
        "B.S.+Abdur+Rahman+Crescent+Institute+of+Science+and+Technology,+Vandalur"
      );

      // Must not contain hardcoded API key
      expect(CONTACT_LOCATION.mapEmbedUrl).not.toContain("key=");
    });

    it("strictly omits phone numbers, WhatsApp, office hours, and unverified contacts", () => {
      const allText = JSON.stringify({
        CONTACT_HERO,
        CONTACT_CHANNELS,
        CONTACT_SOCIAL,
        CONTACT_LOCATION,
        CONTACT_CTA,
      }).toLowerCase();

      // No phone / tel links
      expect(allText).not.toContain("tel:");
      expect(allText).not.toContain("phone");
      expect(allText).not.toMatch(/\+91[0-9]+/);

      // No WhatsApp
      expect(allText).not.toContain("whatsapp");
      expect(allText).not.toContain("wa.me");

      // No office hours or response guarantees
      expect(allText).not.toContain("office hours");
      expect(allText).not.toContain("24/7");
      expect(allText).not.toContain("response time");
      expect(allText).not.toContain("business hours");

      // No fabricated person / faculty
      expect(allText).not.toContain("faculty advisor");
      expect(allText).not.toContain("staff advisor");
    });

    it("strictly omits forbidden marketing superlatives and unverified claims", () => {
      const allText = JSON.stringify({
        CONTACT_HERO,
        CONTACT_CHANNELS,
        CONTACT_SOCIAL,
        CONTACT_LOCATION,
        CONTACT_CTA,
      }).toLowerCase();

      for (const word of FORBIDDEN_SUPERLATIVES) {
        expect(allText).not.toContain(word);
      }
      for (const claim of UNVERIFIED_CLAIMS) {
        expect(allText).not.toContain(claim);
      }
    });
  });

  describe("2. Component Unit Rendering", () => {
    it("renders ContactHero with canonical eyebrow and h1", () => {
      const html = renderToStaticMarkup(<ContactHero />);
      expect(html).toContain("CRESCENT CLUB OF FINANCE");
      expect(html).not.toContain("CRESCENT COLLEGE • FINANCE CLUB");
      expect(html).toContain("<h1");
      expect(html).toContain("Let’s Connect");
    });

    it("renders ContactInformation with mailto link, verified social channels, and tight descriptions", () => {
      const html = renderToStaticMarkup(<ContactInformation />);
      expect(html).toContain("href=\"mailto:crescentcluboffinance26@gmail.com\"");
      expect(html).toContain(
        "href=\"https://www.instagram.com/crescentcluboffinance?igsh=MXIyYXpnMmdnNmMyeA==\""
      );
      expect(html).toContain(
        "href=\"https://www.linkedin.com/company/ccf-2024/\""
      );
      expect(html).toContain("Crescent College, Vandalur");
      expect(html).toContain("Official email channel for contacting Crescent Club of Finance.");
      expect(html).toContain("Official Instagram channel of Crescent Club of Finance.");
      expect(html).toContain("Official LinkedIn channel of Crescent Club of Finance.");
    });

    it("renders ContactSocial with external social links and conservative copy", () => {
      const html = renderToStaticMarkup(<ContactSocial />);
      expect(html).toContain("Official Social Channels");
      expect(html).toContain("Instagram");
      expect(html).toContain("LinkedIn");
      expect(html).toContain('target="_blank"');
      expect(html).toContain('rel="noopener noreferrer"');
    });

    it("renders ContactLocation with confirmed campus, coordinate-based Google Maps embed, and no visiting instruction", () => {
      const html = renderToStaticMarkup(<ContactLocation />);
      expect(html).toContain("B.S. Abdur Rahman Crescent Institute of Science and Technology");
      expect(html).toContain("Crescent College, Vandalur");
      expect(html).toContain("GST Road, Vandalur");
      expect(html).toContain("Chennai – 600 048");
      expect(html).toContain("Tamil Nadu, India");

      // Interactive Google Maps iframe verification
      expect(html).toContain("<iframe");
      expect(html).toContain('title="Map showing Crescent College, Vandalur"');
      expect(html).toContain("12.87748");
      expect(html).toContain("80.08462");

      // Regression protection: broad text search query must not be in rendered markup
      expect(html).not.toContain(
        "B.S.+Abdur+Rahman+Crescent+Institute+of+Science+and+Technology,+Vandalur"
      );
      expect(html).not.toContain("key=");

      // Strictly no unverified visiting instruction
      expect(html).not.toContain("prior to visiting");
      expect(html).not.toContain("in-person meetings");
    });

    it("renders ContactCta directing to email and join-us without fake contact form", () => {
      const html = renderToStaticMarkup(<ContactCta />);
      expect(html).toContain('href="mailto:crescentcluboffinance26@gmail.com"');
      expect(html).toContain('href="/join-us"');
      expect(html).not.toContain("<form");
      expect(html).not.toContain("<input");
      expect(html).not.toContain("<textarea");
    });
  });

  describe("3. Full Page Assembly & Standards", () => {
    it("renders ContactPage without placeholders, unverified claims, or visiting instructions", () => {
      const html = renderToStaticMarkup(<ContactPage />);

      expect(html).not.toContain("Content under construction");
      expect(html).not.toContain("TODO");
      expect(html).not.toContain("Lorem ipsum");

      // Canonical eyebrow
      expect(html).toContain("CRESCENT CLUB OF FINANCE");
      expect(html).not.toContain("CRESCENT COLLEGE • FINANCE CLUB");

      // Heading hierarchy: exactly 1 h1
      const h1Count = (html.match(/<h1/g) || []).length;
      expect(h1Count).toBe(1);

      // Section headings as h2
      const h2Count = (html.match(/<h2/g) || []).length;
      expect(h2Count).toBeGreaterThanOrEqual(4);

      // Verified email and social links
      expect(html).toContain("crescentcluboffinance26@gmail.com");
      expect(html).toContain("https://www.instagram.com/crescentcluboffinance?igsh=MXIyYXpnMmdnNmMyeA==");
      expect(html).toContain("https://www.linkedin.com/company/ccf-2024/");

      // Campus presence and official address lines
      expect(html).toContain("Crescent College, Vandalur");
      expect(html).toContain("GST Road, Vandalur");
      expect(html).toContain("Chennai – 600 048");
      expect(html).toContain("Tamil Nadu, India");

      // Google Maps embed present with verified coordinates
      expect(html).toContain("<iframe");
      expect(html).toContain('title="Map showing Crescent College, Vandalur"');
      expect(html).toContain("12.87748");
      expect(html).toContain("80.08462");
      expect(html).not.toContain(
        "B.S.+Abdur+Rahman+Crescent+Institute+of+Science+and+Technology,+Vandalur"
      );

      // Prohibited claims absent
      expect(html).not.toContain("recognized");
      expect(html).not.toContain("prior to visiting");

      // No fake form elements
      expect(html).not.toContain("<form");
      expect(html).not.toContain("<input");
      expect(html).not.toContain("<textarea");

      // Verify absence of forbidden superlatives or unverified claims
      const textOnly = html.replace(/<[^>]*>/g, " ").toLowerCase();
      for (const word of FORBIDDEN_SUPERLATIVES) {
        expect(textOnly).not.toContain(word);
      }
      for (const claim of UNVERIFIED_CLAIMS) {
        expect(textOnly).not.toContain(claim);
      }
    });

    it("verifies metadata is factual and does not invent unverified domains", () => {
      expect(metadata.title).toBe(
        "Contact — Crescent Club of Finance | Crescent College"
      );
      expect(metadata.description).toBeTruthy();
      expect((metadata.openGraph as Record<string, unknown>)?.siteName).toBe(
        "Crescent Club of Finance"
      );
      expect((metadata.openGraph as Record<string, unknown>)?.url).toBeUndefined();
    });
  });
});
