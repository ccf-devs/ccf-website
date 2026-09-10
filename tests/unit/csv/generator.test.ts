import { describe, it, expect } from "vitest";
import {
  generateCsv,
  escapeCsvCell,
  sanitizeForFormulaInjection,
  generateSafeExportFilename,
} from "@/lib/csv/generator";

describe("CSV Generator Unit Tests", () => {
  /* -------------------------------------------------------------------------- */
  /* 1. Formula Injection Mitigation                                            */
  /* -------------------------------------------------------------------------- */
  describe("1. Formula Injection Mitigation", () => {
    it("prepends an apostrophe if string begins with '='", () => {
      expect(sanitizeForFormulaInjection("=SUM(A1:A10)")).toBe("'=SUM(A1:A10)");
    });

    it("prepends an apostrophe if string begins with '+'", () => {
      expect(sanitizeForFormulaInjection("+1234567890")).toBe("'+1234567890");
    });

    it("prepends an apostrophe if string begins with '-'", () => {
      expect(sanitizeForFormulaInjection("-CMD|' /C calc'!'A1'")).toBe("'-CMD|' /C calc'!'A1'");
    });

    it("prepends an apostrophe if string begins with '@'", () => {
      expect(sanitizeForFormulaInjection("@SUM(1,2)")).toBe("'@SUM(1,2)");
    });

    it("prepends an apostrophe if string begins with tab '\\t'", () => {
      expect(sanitizeForFormulaInjection("\talert()")).toBe("'\talert()");
    });

    it("prepends an apostrophe if string begins with carriage return '\\r'", () => {
      expect(sanitizeForFormulaInjection("\r=cmd")).toBe("'\r=cmd");
    });

    it("leaves benign strings untouched", () => {
      expect(sanitizeForFormulaInjection("Rohith Y")).toBe("Rohith Y");
      expect(sanitizeForFormulaInjection("developers.ccf@gmail.com")).toBe(
        "developers.ccf@gmail.com"
      );
      expect(sanitizeForFormulaInjection("210011601001")).toBe("210011601001");
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 2. Cell Value Escaping & Serialization                                     */
  /* -------------------------------------------------------------------------- */
  describe("2. Cell Value Escaping & RFC 4180 Rules", () => {
    it("converts null and undefined to empty string", () => {
      expect(escapeCsvCell(null)).toBe("");
      expect(escapeCsvCell(undefined)).toBe("");
    });

    it("formats booleans safely as 'true' or 'false'", () => {
      expect(escapeCsvCell(true)).toBe("true");
      expect(escapeCsvCell(false)).toBe("false");
    });

    it("formats numbers without formula injection prepending", () => {
      expect(escapeCsvCell(42)).toBe("42");
      expect(escapeCsvCell(-15.5)).toBe("-15.5");
      expect(escapeCsvCell(0)).toBe("0");
    });

    it("quotes cells containing commas", () => {
      expect(escapeCsvCell("Chennai, Tamil Nadu")).toBe('"Chennai, Tamil Nadu"');
    });

    it("escapes internal double quotes as double double quotes", () => {
      expect(escapeCsvCell('The "Best" Club')).toBe('"The ""Best"" Club"');
    });

    it("quotes cells containing carriage returns or newlines", () => {
      expect(escapeCsvCell("Line 1\nLine 2")).toBe('"Line 1\nLine 2"');
      expect(escapeCsvCell("Line 1\r\nLine 2")).toBe('"Line 1\r\nLine 2"');
    });

    it("serializes structured objects and arrays deterministically without '[object Object]'", () => {
      const complexObj = { role: "lead", verified: true };
      const escapedObj = escapeCsvCell(complexObj);
      expect(escapedObj).not.toContain("[object Object]");
      expect(escapedObj).toContain('""role"":""lead""');

      const arrayVal = ["Alpha", "Beta", "Gamma"];
      const escapedArray = escapeCsvCell(arrayVal);
      expect(escapedArray).not.toContain("[object Object]");
      expect(escapedArray).toContain('[""Alpha"",""Beta"",""Gamma""]');
    });

    it("quotes formula-sanitized strings properly", () => {
      const sanitized = escapeCsvCell("=1+1");
      expect(sanitized).toBe('"\'=1+1"');
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 3. CSV Document Assembly & RFC 4180 Line Endings                           */
  /* -------------------------------------------------------------------------- */
  describe("3. Document Assembly, CRLF & BOM", () => {
    const columns = ["Name", "Email", "Role", "Active"];
    const rows = [
      ["Rohith Y", "developers.ccf@gmail.com", "IT Head", true],
      ["Kaleem", "kaleem@ccf.org", "President", true],
      ['"Quoted, Name"', "=HYPERLINK()", "Member", false],
    ];

    it("generates CSV with CRLF line endings on every line", () => {
      const csv = generateCsv(columns, rows, { withBom: false });
      const lines = csv.split("\r\n");

      expect(lines[0]).toBe("Name,Email,Role,Active");
      expect(lines[1]).toBe("Rohith Y,developers.ccf@gmail.com,IT Head,true");
      expect(lines[2]).toBe("Kaleem,kaleem@ccf.org,President,true");
      expect(lines[3]).toBe('"""Quoted, Name""","\'=HYPERLINK()",Member,false');
      // Final trailing empty line from ending CRLF
      expect(lines[lines.length - 1]).toBe("");
    });

    it("prepends UTF-8 BOM when withBom is true (default)", () => {
      const csv = generateCsv(columns, rows);
      expect(csv.startsWith("\uFEFF")).toBe(true);
    });

    it("omits UTF-8 BOM when withBom is false", () => {
      const csv = generateCsv(columns, rows, { withBom: false });
      expect(csv.startsWith("\uFEFF")).toBe(false);
    });

    it("preserves deterministic column ordering", () => {
      const csv = generateCsv(columns, rows, { withBom: false });
      const firstLine = csv.split("\r\n")[0];
      expect(firstLine).toBe("Name,Email,Role,Active");
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 4. Safe Filename Generation                                                */
  /* -------------------------------------------------------------------------- */
  describe("4. Safe Filename Generation", () => {
    it("generates safe filename according to handbook specification", () => {
      const date = new Date(2026, 8, 10); // Sept 10, 2026
      const filename = generateSafeExportFilename("stock-pitch-2026", date);
      expect(filename).toBe("CCF_stock-pitch-2026_Registrations_2026-09-10.csv");
    });

    it("replaces filesystem-unsafe and path traversal characters with underscores", () => {
      const date = new Date(2026, 8, 10);
      const filename = generateSafeExportFilename("../events/pitch!@#$", date);
      expect(filename).toBe("CCF_events_pitch_Registrations_2026-09-10.csv");
    });

    it("handles empty or fallback slugs gracefully", () => {
      const date = new Date(2026, 8, 10);
      const filename = generateSafeExportFilename("", date);
      expect(filename).toBe("CCF_Event_Registrations_2026-09-10.csv");
    });
  });
});
