import { describe, it, expect } from "vitest";
import { generateXlsx } from "@/lib/xlsx/generator";
import ExcelJS from "exceljs";

describe("XLSX Generator", () => {
  it("forces string data to text format (@) to prevent number coercion", async () => {
    const data = {
      columns: [
        "Name", 
        "Crescent RRN", 
        "External Roll Number", 
        "Phone Number", 
        "UTR / Payment Reference", 
        "Long Numeric Identifier", 
        "Leading Zero Identifier"
      ],
      rows: [
        [
          "Rohith Y",
          "200012345678",           // Crescent RRN
          "EXT-999-0012",           // external roll number
          "0987654321",             // phone number
          "812345678901",           // UTR
          "12345678901234567890",   // long numeric-looking identifier
          "000456"                  // identifier with leading zeros
        ]
      ]
    };
    
    const buffer = await generateXlsx(data);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);
    
    const sheet = workbook.worksheets[0];
    const row = sheet.getRow(2); // row 1 is header
    
    expect(row.getCell(1).value).toBe("Rohith Y");
    expect(row.getCell(2).value).toBe("200012345678");
    expect(row.getCell(3).value).toBe("EXT-999-0012");
    expect(row.getCell(4).value).toBe("0987654321");
    expect(row.getCell(5).value).toBe("812345678901");
    expect(row.getCell(6).value).toBe("12345678901234567890");
    expect(row.getCell(7).value).toBe("000456");
    
    // Assert all string values are formatted as text explicitly
    for (let i = 1; i <= 7; i++) {
      expect(row.getCell(i).numFmt).toBe("@");
    }
  });

  it("sanitizes all formula injection prefixes", async () => {
    const data = {
      columns: ["Equals", "Plus", "Minus", "At", "Tab", "CarriageReturn"],
      rows: [
        ["=1+1", "+A1", "-1+2", "@SUM", "\tHacked", "\rHacked"]
      ]
    };
    
    const buffer = await generateXlsx(data);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);
    
    const sheet = workbook.worksheets[0];
    const row = sheet.getRow(2);
    
    expect(row.getCell(1).value).toBe("'=1+1");
    expect(row.getCell(2).value).toBe("'+A1");
    expect(row.getCell(3).value).toBe("'-1+2");
    expect(row.getCell(4).value).toBe("'@SUM");
    expect(row.getCell(5).value).toBe("'\tHacked");
    expect(row.getCell(6).value).toBe("'\nHacked");
    
    // Ensure they are also text formatted
    for (let i = 1; i <= 6; i++) {
      expect(row.getCell(i).numFmt).toBe("@");
    }
  });

  it("creates valid workbook structure", async () => {
    const data = { columns: ["Test"], rows: [["Value"]] };
    const buffer = await generateXlsx(data);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);
    
    // worksheet name is "Registrations"
    expect(workbook.worksheets[0].name).toBe("Registrations");
    
    const sheet = workbook.worksheets[0];
    // header row is frozen
    expect(sheet.views[0]?.state).toBe("frozen");
    expect((sheet.views[0] as any)?.ySplit).toBe(1);
    
    // autofilter is present
    expect(sheet.autoFilter).toBeDefined();
    
    // columns have reasonable widths
    expect(sheet.getColumn(1).width).toBeGreaterThanOrEqual(15);
  });
});
