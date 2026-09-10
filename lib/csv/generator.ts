/**
 * CCF CSV Serializer & Generator
 *
 * Zero-dependency, RFC 4180-compliant CSV serializer.
 * Enforces:
 * - CRLF (\r\n) line terminators
 * - RFC 4180 cell quoting & double quote escaping ("")
 * - UTF-8 Byte Order Mark (\uFEFF) for Excel compatibility
 * - Formula injection / CSV injection mitigation
 * - Deterministic serialization of scalar & structured values
 */

/**
 * Characters that could trigger formula execution in spreadsheet software
 * (Microsoft Excel, LibreOffice Calc, Google Sheets).
 */
const FORMULA_INJECTION_PREFIXES = ["=", "+", "-", "@", "\t", "\r"];

/**
 * Sanitizes a string to prevent spreadsheet formula injection.
 * If a string begins with =, +, -, @, tab, or carriage return,
 * prepends a single apostrophe (').
 */
export function sanitizeForFormulaInjection(value: string): string {
  if (!value || typeof value !== "string") {
    return value;
  }

  const firstChar = value.charAt(0);
  if (FORMULA_INJECTION_PREFIXES.includes(firstChar)) {
    return `'${value}`;
  }

  return value;
}

/**
 * Safely converts a cell value into an RFC 4180 compliant CSV string.
 *
 * Rules:
 * 1. null or undefined -> empty string ""
 * 2. boolean -> "true" or "false"
 * 3. number -> standard string representation (formula injection NOT applied to actual numbers)
 * 4. string -> formula injection mitigation applied, quotes escaped, quoted if contains delimiters
 * 5. object/array -> deterministic JSON stringified, then escaped and quoted
 */
export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  let strValue: string;

  if (typeof value === "boolean") {
    strValue = value ? "true" : "false";
  } else if (typeof value === "number") {
    strValue = Number.isFinite(value) ? String(value) : "";
  } else if (typeof value === "string") {
    strValue = sanitizeForFormulaInjection(value);
  } else if (typeof value === "object") {
    try {
      strValue = JSON.stringify(value);
    } catch {
      strValue = "";
    }
  } else {
    strValue = String(value);
  }

  // Check if quoting is required: comma, double-quote, CR, LF, or starts with apostrophe (from sanitization)
  const requiresQuotes =
    strValue.includes(",") ||
    strValue.includes('"') ||
    strValue.includes("\r") ||
    strValue.includes("\n") ||
    strValue.startsWith("'");

  if (requiresQuotes) {
    // Escape internal double quotes by doubling them ("" -> RFC 4180)
    const escaped = strValue.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  return strValue;
}

export interface GenerateCsvOptions {
  /**
   * Whether to include the UTF-8 Byte Order Mark (\uFEFF) at the beginning of the file.
   * Required for seamless opening in Microsoft Excel without character corruption.
   * Default: true
   */
  withBom?: boolean;
}

/**
 * Generates an RFC 4180 compliant CSV string from columns and rows.
 *
 * @param columns Array of column header strings in deterministic order
 * @param rows Array of rows, where each row is an array of cell values
 * @param options CSV formatting options
 * @returns Serialized CSV string with CRLF line endings and optional UTF-8 BOM
 */
export function generateCsv(
  columns: string[],
  rows: unknown[][],
  options: GenerateCsvOptions = {}
): string {
  const { withBom = true } = options;

  const headerRow = columns.map((col) => escapeCsvCell(col)).join(",");

  const dataRows = rows.map((row) =>
    columns.map((_, colIndex) => escapeCsvCell(row[colIndex])).join(",")
  );

  const lines = [headerRow, ...dataRows];
  const csvBody = lines.join("\r\n") + "\r\n";

  return withBom ? `\uFEFF${csvBody}` : csvBody;
}

/**
 * Generates a filesystem-safe and header-safe filename for event registration CSV export.
 * Follows handbook format: CCF_<EVENT>_Registrations_<YYYY-MM-DD>.csv
 */
export function generateSafeExportFilename(
  eventSlug: string,
  exportDate: Date = new Date()
): string {
  const cleanSlug = eventSlug
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");

  const yyyy = exportDate.getFullYear();
  const mm = String(exportDate.getMonth() + 1).padStart(2, "0");
  const dd = String(exportDate.getDate()).padStart(2, "0");

  return `CCF_${cleanSlug || "Event"}_Registrations_${yyyy}-${mm}-${dd}.csv`;
}
