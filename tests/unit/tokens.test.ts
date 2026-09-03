import { describe, it, expect } from "vitest";
import { CCF_COLORS, CCF_TYPOGRAPHY, CCF_RADII, CCF_SPACING_RHYTHM } from "@/lib/tokens";

describe("CCF Design System Tokens", () => {
  describe("Color Palette", () => {
    it("defines the primary navy foundation colors", () => {
      expect(CCF_COLORS.navy.base).toBe("#071426");
      expect(CCF_COLORS.navy.secondary).toBe("#0B1D33");
      expect(CCF_COLORS.surface.base).toBe("#101F34");
    });

    it("defines gold/amber accent colors", () => {
      expect(CCF_COLORS.gold.primary).toBe("#D7A63D");
      expect(CCF_COLORS.gold.dark).toBe("#C6902D");
    });

    it("defines off-white and muted typography colors", () => {
      expect(CCF_COLORS.text.offwhite).toBe("#F7F4EC");
      expect(CCF_COLORS.text.muted).toBe("#A8B0BD");
    });

    it("defines semantic status feedback colors", () => {
      expect(CCF_COLORS.status.success).toBe("#4FA77A");
      expect(CCF_COLORS.status.warning).toBe("#D6A24A");
      expect(CCF_COLORS.status.error).toBe("#D16A63");
    });
  });

  describe("Typography System", () => {
    it("separates editorial display typography from functional sans typography", () => {
      expect(CCF_TYPOGRAPHY.fonts.display).toContain("Cormorant Garamond");
      expect(CCF_TYPOGRAPHY.fonts.sans).toContain("Inter");
    });

    it("includes robust system font fallbacks", () => {
      expect(CCF_TYPOGRAPHY.fonts.display).toContain("serif");
      expect(CCF_TYPOGRAPHY.fonts.sans).toContain("sans-serif");
    });

    it("defines expected responsive hierarchy", () => {
      expect(CCF_TYPOGRAPHY.scale.display.lineHeight).toBeLessThanOrEqual(1.2);
      expect(CCF_TYPOGRAPHY.scale.body.lineHeight).toBeGreaterThanOrEqual(1.55);
      expect(CCF_TYPOGRAPHY.scale.body.lineHeight).toBeLessThanOrEqual(1.7);
    });
  });

  describe("Radius & Spacing Rhythm", () => {
    it("adheres to 4px / 8px spacing rhythm", () => {
      expect(CCF_SPACING_RHYTHM.unit).toBe(4);
    });

    it("defines card radius within recommended 12-18px range", () => {
      expect(CCF_RADII.card).toBe("1rem"); // 16px
      expect(CCF_RADII.lg).toBe("0.75rem"); // 12px
      expect(CCF_RADII.md).toBe("0.5rem"); // 8px (controls)
    });
  });
});
