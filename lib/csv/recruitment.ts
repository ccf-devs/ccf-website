import { AdminRecruitmentApplicationItem } from "@/lib/recruitment/types";
import { sanitizeForFormulaInjection } from "./generator";

export interface TransformedCsvData {
  columns: string[];
  rows: (string | number | boolean | null)[][];
}

/**
 * Transforms recruitment applications into structured CSV columns and rows.
 */
export function transformRecruitmentApplicationsToCsvRows(
  applications: AdminRecruitmentApplicationItem[]
): TransformedCsvData {
  // Sort applications deterministically by createdAt ascending, then RRN ascending
  const sortedApplications = [...applications].sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();
    if (timeA !== timeB) return timeA - timeB;
    return a.rrnNormalized.localeCompare(b.rrnNormalized);
  });

  const columns = [
    "Application ID",
    "Name",
    "RRN",
    "Desired Department",
    "Academic Department",
    "Year",
    "WhatsApp Contact",
    "Status",
    "Submitted At",
  ];

  const rows = sortedApplications.map((app) => {
    const submittedAt =
      typeof app.createdAt === "string"
        ? app.createdAt
        : (app.createdAt as unknown) instanceof Date
        ? (app.createdAt as unknown as Date).toISOString()
        : String(app.createdAt || "");

    return [
      app.id,
      sanitizeForFormulaInjection(app.name),
      sanitizeForFormulaInjection(app.rrnNormalized),
      sanitizeForFormulaInjection(app.departmentName),
      sanitizeForFormulaInjection(app.academicDepartment),
      sanitizeForFormulaInjection(app.year),
      sanitizeForFormulaInjection(app.phone),
      app.status,
      submittedAt,
    ];
  });

  return { columns, rows };
}
