import { describe, it, expect } from "vitest";
import { PUBLIC_NAV_ITEMS, CCF_PUBLIC_INFO, CCF_EYEBROW } from "@/components/site/navigation-data";

describe("Public Navigation & Shell Configuration", () => {
  it("contains all 7 required public navigation links", () => {
    const hrefs = PUBLIC_NAV_ITEMS.map((item) => item.href);
    expect(hrefs).toEqual([
      "/",
      "/about",
      "/departments",
      "/members",
      "/events",
      "/contact",
      "/join-us",
    ]);

    const labels = PUBLIC_NAV_ITEMS.map((item) => item.label);
    expect(labels).toEqual([
      "Home",
      "About",
      "Departments",
      "Members",
      "Events",
      "Contact",
      "Join Us",
    ]);
  });

  it("marks 'Join Us' as the primary CTA link", () => {
    const joinUs = PUBLIC_NAV_ITEMS.find((item) => item.href === "/join-us");
    expect(joinUs).toBeDefined();
    expect(joinUs?.isCta).toBe(true);

    // Other links are standard navigation links
    const nonCtaLinks = PUBLIC_NAV_ITEMS.filter((item) => item.href !== "/join-us");
    for (const item of nonCtaLinks) {
      expect(item.isCta).toBeFalsy();
    }
  });

  it("does not include any admin or internal routes in public navigation", () => {
    for (const item of PUBLIC_NAV_ITEMS) {
      expect(item.href.startsWith("/admin")).toBe(false);
      expect(item.href.startsWith("/api")).toBe(false);
    }
  });

  it("preserves verified official CCF contact information without invented details", () => {
    expect(CCF_PUBLIC_INFO.email).toBe("crescentcluboffinance26@gmail.com");
    expect(CCF_PUBLIC_INFO.campus).toContain("Crescent College, Vandalur");
    expect(CCF_PUBLIC_INFO.socials.instagram).toContain("instagram.com/crescentcluboffinance");
    expect(CCF_PUBLIC_INFO.socials.linkedin).toContain("linkedin.com/company/ccf-2024");
  });

  it("exports canonical CCF eyebrow text", () => {
    expect(CCF_EYEBROW).toBe("CRESCENT CLUB OF FINANCE");
  });
});
