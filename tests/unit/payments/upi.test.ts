import { describe, it, expect } from "vitest";
import {
  buildUpiUri,
  generateUpiQrCodeDataUrl,
  normalizeAndValidatePaymentReference,
} from "@/lib/payments/upi";
import { PaymentErrorCode } from "@/lib/payments/types";

describe("UPI & QR Code Utilities (Phase 10)", () => {
  describe("buildUpiUri", () => {
    it("generates a standard trusted upi://pay URI", () => {
      const uri = buildUpiUri("ccf@okaxis", "Crescent Club of Finance", 250);
      expect(uri).toContain("upi://pay?");
      expect(uri).toContain("pa=ccf%40okaxis");
      expect(uri).toContain("pn=Crescent+Club+of+Finance");
      expect(uri).toContain("am=250");
      expect(uri).toContain("cu=INR");
    });

    it("includes transaction note / reference when provided", () => {
      const uri = buildUpiUri(
        "ccf@okaxis",
        "Crescent Club of Finance",
        500,
        "Registration CCF-MAG-1234"
      );
      expect(uri).toContain("tn=Registration+CCF-MAG-1234");
    });

    it("correctly formats fractional decimal amounts", () => {
      const uri = buildUpiUri("ccf@okaxis", "CCF", 99.5);
      expect(uri).toContain("am=99.50");
    });

    it("handles string amount representations", () => {
      const uri = buildUpiUri("ccf@okaxis", "CCF", "350");
      expect(uri).toContain("am=350");
    });

    it("encodes special characters and spaces safely", () => {
      const uri = buildUpiUri(
        "ccf-finance@axis&bank",
        "CCF & Partners / Finance",
        100,
        "Ref #123 & Special"
      );
      expect(uri).toContain("pa=ccf-finance%40axis%26bank");
      expect(uri).toContain("pn=CCF+%26+Partners+%2F+Finance");
      expect(uri).toContain("tn=Ref+%23123+%26+Special");
    });

    it("throws INVALID_REQUEST if UPI ID is missing or empty", () => {
      expect(() => buildUpiUri("", "CCF", 100)).toThrowError(
        /UPI ID is required/
      );
      expect(() => buildUpiUri("   ", "CCF", 100)).toThrowError(
        /UPI ID is required/
      );
    });

    it("throws INVALID_REQUEST if payee name is missing or empty", () => {
      expect(() => buildUpiUri("ccf@okaxis", "", 100)).toThrowError(
        /Payee name is required/
      );
      expect(() => buildUpiUri("ccf@okaxis", "   ", 100)).toThrowError(
        /Payee name is required/
      );
    });

    it("throws INVALID_REQUEST if amount is zero, negative, or NaN", () => {
      expect(() => buildUpiUri("ccf@okaxis", "CCF", 0)).toThrowError(
        /Payment amount must be a positive number/
      );
      expect(() => buildUpiUri("ccf@okaxis", "CCF", -50)).toThrowError(
        /Payment amount must be a positive number/
      );
      expect(() => buildUpiUri("ccf@okaxis", "CCF", "invalid")).toThrowError(
        /Payment amount must be a positive number/
      );
    });
  });

  describe("generateUpiQrCodeDataUrl", () => {
    it("generates a valid Base64 PNG Data URL starting with data:image/png;base64,", async () => {
      const uri = "upi://pay?pa=ccf%40okaxis&pn=CCF&am=100&cu=INR";
      const qrDataUrl = await generateUpiQrCodeDataUrl(uri);

      expect(typeof qrDataUrl).toBe("string");
      expect(qrDataUrl.startsWith("data:image/png;base64,")).toBe(true);
      expect(qrDataUrl.length).toBeGreaterThan(100);
    });

    it("rejects non-UPI URIs with INVALID_REQUEST", async () => {
      await expect(generateUpiQrCodeDataUrl("https://example.com")).rejects.toMatchObject({
        code: PaymentErrorCode.INVALID_REQUEST,
      });
      await expect(generateUpiQrCodeDataUrl("")).rejects.toMatchObject({
        code: PaymentErrorCode.INVALID_REQUEST,
      });
    });
  });

  describe("normalizeAndValidatePaymentReference", () => {
    it("trims leading and trailing whitespace", () => {
      const ref = normalizeAndValidatePaymentReference("   408112345678   ");
      expect(ref).toBe("408112345678");
    });

    it("accepts valid 12-digit UPI UTR numbers", () => {
      const ref = normalizeAndValidatePaymentReference("408112345678");
      expect(ref).toBe("408112345678");
    });

    it("accepts valid alphanumeric reference codes with hyphens and underscores", () => {
      const ref = normalizeAndValidatePaymentReference("AXIS-UPI-9988776655");
      expect(ref).toBe("AXIS-UPI-9988776655");
    });

    it("rejects empty or whitespace-only references", () => {
      expect(() => normalizeAndValidatePaymentReference("")).toThrowError(
        /Payment reference cannot be empty/
      );
      expect(() => normalizeAndValidatePaymentReference("    ")).toThrowError(
        /Payment reference cannot be empty/
      );
    });

    it("rejects references shorter than 6 characters", () => {
      expect(() => normalizeAndValidatePaymentReference("12345")).toThrowError(
        /between 6 and 50 characters/
      );
    });

    it("rejects references longer than 50 characters", () => {
      const longRef = "A".repeat(51);
      expect(() => normalizeAndValidatePaymentReference(longRef)).toThrowError(
        /between 6 and 50 characters/
      );
    });

    it("rejects dangerous or script injection characters", () => {
      expect(() =>
        normalizeAndValidatePaymentReference("<script>alert(1)</script>")
      ).toThrowError(/contains invalid characters/);
      expect(() =>
        normalizeAndValidatePaymentReference('UTR-12345"OR 1=1')
      ).toThrowError(/contains invalid characters/);
    });
  });
});
