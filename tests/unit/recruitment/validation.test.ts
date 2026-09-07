import { describe, it, expect } from "vitest";
import {
  normalizeRecruitmentRrn,
  normalizePhone,
  publicRecruitmentApplicationSchema,
  adminUpdateApplicationStatusSchema,
  adminUpdateRecruitmentSettingsSchema,
} from "@/lib/recruitment/validation";
import { RecruitmentStatus } from "@prisma/client";

describe("Recruitment Validation Unit Tests", () => {
  describe("1. RRN Normalization & Format", () => {
    it("normalizes and accepts valid 12-digit Crescent RRNs starting with 2", () => {
      expect(normalizeRecruitmentRrn("210071601001")).toBe("210071601001");
      expect(normalizeRecruitmentRrn(" 220071601045  ")).toBe("220071601045");
      expect(normalizeRecruitmentRrn("230161601099")).toBe("230161601099");
    });

    it("rejects invalid RRN formats", () => {
      // Not starting with 2
      expect(() => normalizeRecruitmentRrn("110071601001")).toThrow();
      expect(() => normalizeRecruitmentRrn("310071601001")).toThrow();
      // Wrong length
      expect(() => normalizeRecruitmentRrn("21007160100")).toThrow(); // 11 digits
      expect(() => normalizeRecruitmentRrn("2100716010011")).toThrow(); // 13 digits
      // Letters or symbols
      expect(() => normalizeRecruitmentRrn("21007160100A")).toThrow();
      expect(() => normalizeRecruitmentRrn("2100-7160100")).toThrow();
      // Empty
      expect(() => normalizeRecruitmentRrn("")).toThrow();
    });
  });

  describe("2. Phone Number Normalization & Validation", () => {
    it("normalizes valid 10-digit Indian phone numbers by stripping whitespace and punctuation", () => {
      expect(normalizePhone("9876543210")).toBe("9876543210");
      expect(normalizePhone(" 8765432109 ")).toBe("8765432109");
      expect(normalizePhone("7654321098")).toBe("7654321098");
      expect(normalizePhone("6543210987")).toBe("6543210987");
    });

    it("normalizes numbers with leading 0 or +91 prefix", () => {
      expect(normalizePhone("09876543210")).toBe("09876543210");
      expect(normalizePhone("+919876543210")).toBe("+919876543210");
      expect(normalizePhone("+91 98765 43210")).toBe("+919876543210");
      expect(normalizePhone("+91-98765-43210")).toBe("+919876543210");
    });

    it("rejects invalid phone numbers", () => {
      expect(() => normalizePhone("12345")).toThrow();
      expect(() => normalizePhone("123456789")).toThrow(); // 9 digits
      expect(() => normalizePhone("abcdefghij")).toThrow();
      expect(() => normalizePhone("")).toThrow();
    });
  });

  describe("3. Public Recruitment Application Schema", () => {
    const validPayload = {
      name: "Mohamed Tariq",
      rrn: "210071601045",
      departmentId: "11111111-2222-3333-4444-555555555555",
      academicDepartment: "Computer Science and Engineering",
      year: "3rd Year",
      phone: "9876543210",
    };

    it("accepts valid application payload", () => {
      const parsed = publicRecruitmentApplicationSchema.parse(validPayload);
      expect(parsed.name).toBe("Mohamed Tariq");
      expect(parsed.rrn).toBe("210071601045");
      expect(parsed.departmentId).toBe("11111111-2222-3333-4444-555555555555");
      expect(parsed.academicDepartment).toBe("Computer Science and Engineering");
      expect(parsed.year).toBe("3rd Year");
      expect(parsed.phone).toBe("9876543210");
    });

    it("rejects payload with missing or short name", () => {
      expect(() =>
        publicRecruitmentApplicationSchema.parse({ ...validPayload, name: "" })
      ).toThrow();
      expect(() =>
        publicRecruitmentApplicationSchema.parse({ ...validPayload, name: "A" })
      ).toThrow();
    });

    it("rejects payload with invalid RRN", () => {
      expect(() =>
        publicRecruitmentApplicationSchema.parse({
          ...validPayload,
          rrn: "123456789012",
        })
      ).toThrow();
    });

    it("rejects payload with invalid phone", () => {
      expect(() =>
        publicRecruitmentApplicationSchema.parse({
          ...validPayload,
          phone: "12345",
        })
      ).toThrow();
    });

    it("rejects payload with empty department or academic fields", () => {
      expect(() =>
        publicRecruitmentApplicationSchema.parse({
          ...validPayload,
          departmentId: "",
        })
      ).toThrow();
      expect(() =>
        publicRecruitmentApplicationSchema.parse({
          ...validPayload,
          academicDepartment: "   ",
        })
      ).toThrow();
      expect(() =>
        publicRecruitmentApplicationSchema.parse({
          ...validPayload,
          year: "",
        })
      ).toThrow();
    });
  });

  describe("4. Admin Status Update Schema", () => {
    it("accepts valid recruitment statuses", () => {
      expect(
        adminUpdateApplicationStatusSchema.parse({ status: RecruitmentStatus.ACTIVE })
      ).toEqual({ status: RecruitmentStatus.ACTIVE });
      expect(
        adminUpdateApplicationStatusSchema.parse({ status: RecruitmentStatus.SELECTED })
      ).toEqual({ status: RecruitmentStatus.SELECTED });
      expect(
        adminUpdateApplicationStatusSchema.parse({ status: RecruitmentStatus.REJECTED })
      ).toEqual({ status: RecruitmentStatus.REJECTED });
      expect(
        adminUpdateApplicationStatusSchema.parse({ status: RecruitmentStatus.WITHDRAWN })
      ).toEqual({ status: RecruitmentStatus.WITHDRAWN });
    });

    it("rejects invalid status strings", () => {
      expect(() =>
        adminUpdateApplicationStatusSchema.parse({ status: "PENDING" })
      ).toThrow();
      expect(() =>
        adminUpdateApplicationStatusSchema.parse({ status: "CONFIRMED" })
      ).toThrow();
    });
  });

  describe("5. Admin Settings Update Schema", () => {
    it("accepts boolean isOpen with valid WhatsApp group link", () => {
      const parsed = adminUpdateRecruitmentSettingsSchema.parse({
        isOpen: true,
        whatsappGroupUrl: "https://chat.whatsapp.com/AbCdEfGhIjKlMnOpQrStUv",
      });
      expect(parsed.isOpen).toBe(true);
      expect(parsed.whatsappGroupUrl).toBe(
        "https://chat.whatsapp.com/AbCdEfGhIjKlMnOpQrStUv"
      );
    });

    it("accepts null or omitted whatsappGroupUrl", () => {
      const parsed1 = adminUpdateRecruitmentSettingsSchema.parse({
        isOpen: false,
        whatsappGroupUrl: null,
      });
      expect(parsed1.isOpen).toBe(false);
      expect(parsed1.whatsappGroupUrl).toBeNull();

      const parsed2 = adminUpdateRecruitmentSettingsSchema.parse({
        isOpen: false,
      });
      expect(parsed2.isOpen).toBe(false);
    });

    it("rejects invalid WhatsApp URLs", () => {
      expect(() =>
        adminUpdateRecruitmentSettingsSchema.parse({
          isOpen: true,
          whatsappGroupUrl: "https://google.com",
        })
      ).toThrow();
      expect(() =>
        adminUpdateRecruitmentSettingsSchema.parse({
          isOpen: true,
          whatsappGroupUrl: "not-a-url",
        })
      ).toThrow();
    });
  });
});
