import { describe, it, expect } from "vitest";
import {
  isValidCrescentRrn,
  normalizeCrescentRrn,
  normalizeCollege,
  normalizeExternalRoll,
  normalizeName,
  generateRegistrationCode,
  CRESCENT_RRN_REGEX,
} from "@/lib/registrations/normalization";
import { RegistrationDomainError, RegistrationErrorCode } from "@/lib/registrations/types";

describe("Phase 8: Normalization & Identity Validation", () => {
  describe("Crescent RRN Validation & Normalization (Area D)", () => {
    it("accepts valid 12-digit RRN starting with 2", () => {
      expect(isValidCrescentRrn("210071601001")).toBe(true);
      expect(isValidCrescentRrn("200161601050")).toBe(true);
      expect(isValidCrescentRrn("220011601099")).toBe(true);
      expect(normalizeCrescentRrn("210071601001")).toBe("210071601001");
    });

    it("trims whitespace from valid RRN", () => {
      expect(normalizeCrescentRrn("  210071601001  ")).toBe("210071601001");
    });

    it("rejects RRN not starting with 2", () => {
      expect(isValidCrescentRrn("110071601001")).toBe(false);
      expect(isValidCrescentRrn("310071601001")).toBe(false);
      expect(() => normalizeCrescentRrn("110071601001")).toThrowError(RegistrationDomainError);
      try {
        normalizeCrescentRrn("110071601001");
      } catch (err: any) {
        expect(err.code).toBe(RegistrationErrorCode.INVALID_RRN);
      }
    });

    it("rejects RRN with incorrect length", () => {
      expect(isValidCrescentRrn("21007160100")).toBe(false); // 11 digits
      expect(isValidCrescentRrn("2100716010019")).toBe(false); // 13 digits
      expect(() => normalizeCrescentRrn("21007160100")).toThrow();
      expect(() => normalizeCrescentRrn("2100716010019")).toThrow();
    });

    it("rejects RRN containing alphabetic or special characters", () => {
      expect(isValidCrescentRrn("21007160100A")).toBe(false);
      expect(isValidCrescentRrn("2100-1601001")).toBe(false);
      expect(isValidCrescentRrn("2100 7160100")).toBe(false);
      expect(() => normalizeCrescentRrn("21007160100A")).toThrow();
    });

    it("rejects non-string inputs", () => {
      expect(isValidCrescentRrn(null)).toBe(false);
      expect(isValidCrescentRrn(undefined)).toBe(false);
      expect(isValidCrescentRrn(210071601001)).toBe(false);
      expect(() => normalizeCrescentRrn(null)).toThrow();
      expect(() => normalizeCrescentRrn(12345)).toThrow();
    });
  });

  describe("External College Normalization (Area E)", () => {
    it("trims whitespace, collapses inner spaces, and transforms to uppercase", () => {
      expect(normalizeCollege("  Loyola   College  ")).toBe("LOYOLA COLLEGE");
      expect(normalizeCollege("anna university, chennai")).toBe("ANNA UNIVERSITY, CHENNAI");
      expect(normalizeCollege("IIT Madras")).toBe("IIT MADRAS");
    });

    it("throws when college name is empty or invalid", () => {
      expect(() => normalizeCollege("")).toThrow(RegistrationDomainError);
      expect(() => normalizeCollege("   ")).toThrow(RegistrationDomainError);
      expect(() => normalizeCollege(null)).toThrow(RegistrationDomainError);
    });
  });

  describe("External Roll Number Normalization (Area E)", () => {
    it("trims whitespace, removes inner spaces, and converts to uppercase", () => {
      expect(normalizeExternalRoll(" 2022 - cs - 401 ")).toBe("2022-CS-401");
      expect(normalizeExternalRoll(" 9176 123 456 ")).toBe("9176123456");
      expect(normalizeExternalRoll("ece_2021_042")).toBe("ECE_2021_042");
    });

    it("throws when roll number is empty or invalid", () => {
      expect(() => normalizeExternalRoll("")).toThrow(RegistrationDomainError);
      expect(() => normalizeExternalRoll("   ")).toThrow(RegistrationDomainError);
      expect(() => normalizeExternalRoll(undefined)).toThrow(RegistrationDomainError);
    });
  });

  describe("Participant Name Normalization", () => {
    it("normalizes participant full name correctly", () => {
      expect(normalizeName("  Mohamed   Riyaz  ")).toBe("Mohamed Riyaz");
      expect(normalizeName("A. R. Rahman")).toBe("A. R. Rahman");
    });

    it("throws when name is empty", () => {
      expect(() => normalizeName("")).toThrow(RegistrationDomainError);
      expect(() => normalizeName("   ")).toThrow(RegistrationDomainError);
    });
  });

  describe("Registration Code Generation", () => {
    it("generates a canonical code matching CCF-<PREFIX>-<HEX8>", () => {
      const code1 = generateRegistrationCode("magnora-26");
      expect(code1).toMatch(/^CCF-MAGNORA2-[A-F0-9]{8}$/);
      expect(code1.length).toBeLessThanOrEqual(50);

      const code2 = generateRegistrationCode("finrise-25");
      expect(code2).toMatch(/^CCF-FINRISE2-[A-F0-9]{8}$/);

      const code3 = generateRegistrationCode("test");
      expect(code3).toMatch(/^CCF-TEST-[A-F0-9]{8}$/);
    });

    it("generates unique codes on subsequent invocations", () => {
      const codes = new Set();
      for (let i = 0; i < 50; i++) {
        codes.add(generateRegistrationCode("magnora-26"));
      }
      expect(codes.size).toBe(50);
    });
  });
});
