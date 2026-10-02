import ExcelJS from "exceljs";
import { TransformedCsvData } from "@/lib/csv/registrations";
import { sanitizeForFormulaInjection } from "@/lib/csv/generator";

/**
 * CCF XLSX Generator
 * Converts TransformedCsvData directly into a robust Excel workbook.
 * - Forces text formatting (@) for all strings to preserve leading zeros (e.g., RRNs, phones).
 * - Applies formula injection sanitization on all strings.
 * - Freezes header row.
 * - Adds autofilter.
 */
export async function generateXlsx(data: TransformedCsvData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Crescent Club of Finance";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Registrations", {
    views: [{ state: "frozen", ySplit: 1 }] // Freeze header row
  });

  // 1. Add headers
  sheet.addRow(data.columns);

  // Style header row
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  
  // Enable auto-filter for all columns if there are any
  if (data.columns.length > 0) {
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: data.columns.length }
    };
  }

  // 2. Add rows and sanitize
  for (const row of data.rows) {
    const sanitizedRow = row.map(cell => {
      if (typeof cell === "string") {
        return sanitizeForFormulaInjection(cell);
      }
      if (cell === null || cell === undefined) {
         return "";
      }
      return cell; 
    });
    const addedRow = sheet.addRow(sanitizedRow);
    
    // Explicitly set text format for string cells to prevent scientific notation / leading zero loss
    addedRow.eachCell((cell, colNumber) => {
      const originalValue = sanitizedRow[colNumber - 1];
      if (typeof originalValue === "string") {
        cell.numFmt = '@'; // Force Excel to treat as text
      }
    });
  }

  // 3. Auto-fit columns (reasonable widths)
  sheet.columns.forEach((col, idx) => {
    let maxLength = 15;
    const headerName = data.columns[idx];
    if (headerName && headerName.length > maxLength) {
      maxLength = headerName.length;
    }
    col.width = Math.min(maxLength + 2, 50);
  });

  // Return as buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
