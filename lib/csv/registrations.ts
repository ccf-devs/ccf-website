import { AdminRegistrationView } from "@/lib/registrations/types";

export interface EventMetadata {
  id: string;
  name: string;
  slug: string;
  registrationType?: "INDIVIDUAL" | "TEAM";
}

export interface FormFieldMetadata {
  id?: string;
  formVersionId?: string;
  key: string;
  label: string;
  displayOrder?: number;
}

export interface TransformRegistrationsOptions {
  event: EventMetadata;
  registrations: AdminRegistrationView[];
  formFields?: FormFieldMetadata[];
  isTeam?: boolean;
}

export interface TransformedCsvData {
  columns: string[];
  rows: (string | number | boolean | null)[][];
}

/**
 * Standard CCF form keys that map directly to standard core CSV columns.
 * These keys are excluded from trailing dynamic custom columns to avoid duplication.
 */
export const CORE_MAPPED_KEYS = new Set([
  // Names
  "participant_name",
  "name",
  "full_name",
  // Participant Category / Type
  "participant_type",
  "participant_category",
  // Identifiers / RRN
  "crescent_rrn",
  "external_roll_number",
  "rrn",
  "roll_number",
  "identifier",
  // College
  "college_name",
  "college",
  // Academic Department
  "academic_department",
  "department",
  // Academic Year
  "academic_year",
  "year",
  "year_of_study",
  // Phone / WhatsApp
  "phone_number",
  "phone",
  "whatsapp_number",
  "whatsapp",
  // Team Name
  "team_name",
]);

/**
 * Clean core column order for INDIVIDUAL registrations (14 columns)
 */
export const INDIVIDUAL_CORE_COLUMNS = [
  "Registration Code",
  "Registration Status",
  "Registered At",
  "Participant Name",
  "Participant Type",
  "RRN / Roll Number",
  "College",
  "Academic Department",
  "Year",
  "Phone",
  "Payment Status",
  "Payment Method",
  "Payment Amount",
  "Payment Reference",
] as const;

/**
 * Clean core column order for TEAM registrations (17 columns)
 */
export const TEAM_CORE_COLUMNS = [
  "Registration Code",
  "Registration Status",
  "Registered At",
  "Team Name",
  "Member #",
  "Member Role",
  "Member Name",
  "Participant Type",
  "RRN / Roll Number",
  "College",
  "Phone",
  "Academic Department",
  "Year",
  "Payment Status",
  "Payment Method",
  "Payment Amount",
  "Payment Reference",
] as const;

/**
 * Formats dynamic field response values for readable CSV representation.
 */
export function formatFieldValueForCsv(
  valueText: string | null | undefined,
  valueJson: any | null | undefined
): string {
  if (valueText !== null && valueText !== undefined) {
    return valueText;
  }

  if (valueJson === null || valueJson === undefined) {
    return "";
  }

  if (Array.isArray(valueJson)) {
    return valueJson
      .map((item) => (typeof item === "object" ? JSON.stringify(item) : String(item)))
      .join(", ");
  }

  if (typeof valueJson === "boolean") {
    return valueJson ? "Yes" : "No";
  }

  if (typeof valueJson === "object") {
    return JSON.stringify(valueJson);
  }

  return String(valueJson);
}

interface DynamicColumnDef {
  key: string;
  header: string;
  displayOrder: number;
}

/**
 * Resolves the deterministic, stable union of dynamic form columns across
 * all form versions present in the registrations or explicitly provided.
 *
 * Handles:
 * - Exclusion of core mapped keys to prevent duplicate columns
 * - Preservation of displayOrder
 * - Stable union across multiple published form versions
 * - Disambiguation of conflicting labels with different keys or core column headers
 */
export function resolveDynamicColumns(
  registrations: AdminRegistrationView[],
  providedFields?: FormFieldMetadata[],
  coreColumnNames?: Set<string>
): DynamicColumnDef[] {
  // Map of key -> { key, label, displayOrder }
  const fieldMap = new Map<string, { key: string; label: string; displayOrder: number }>();

  // 1. Ingest any explicitly provided form field metadata (from DB query)
  if (providedFields && providedFields.length > 0) {
    for (const field of providedFields) {
      if (!CORE_MAPPED_KEYS.has(field.key.toLowerCase())) {
        if (!fieldMap.has(field.key)) {
          fieldMap.set(field.key, {
            key: field.key,
            label: field.label,
            displayOrder: field.displayOrder ?? 9999,
          });
        }
      }
    }
  }

  // 2. Ingest fields found in registration responses (ensures legacy/historical responses are captured)
  let fallbackOrder = 10000;
  for (const reg of registrations) {
    for (const resp of reg.responses) {
      if (!CORE_MAPPED_KEYS.has(resp.fieldKey.toLowerCase())) {
        if (!fieldMap.has(resp.fieldKey)) {
          fieldMap.set(resp.fieldKey, {
            key: resp.fieldKey,
            label: resp.fieldLabel || resp.fieldKey,
            displayOrder: fallbackOrder++,
          });
        }
      }
    }
  }

  const rawFields = Array.from(fieldMap.values());

  // Count occurrences of each label to identify collisions across different keys
  const labelCounts = new Map<string, number>();
  for (const field of rawFields) {
    labelCounts.set(field.label, (labelCounts.get(field.label) || 0) + 1);
  }

  // Sort columns stably by displayOrder, then key
  rawFields.sort((a, b) => {
    if (a.displayOrder !== b.displayOrder) {
      return a.displayOrder - b.displayOrder;
    }
    return a.key.localeCompare(b.key);
  });

  // Assign deterministic, unique headers (appending key if duplicate label exists or clashes with core column names)
  return rawFields.map((field) => {
    const isDuplicate = (labelCounts.get(field.label) || 0) > 1;
    const clashesWithCore = coreColumnNames?.has(field.label);
    const header = isDuplicate || clashesWithCore ? `${field.label} (${field.key})` : field.label;
    return {
      key: field.key,
      header,
      displayOrder: field.displayOrder,
    };
  });
}

/**
 * Transforms event registrations into tabular CSV columns and rows according to
 * CCF Phase 13 specification.
 *
 * Rules:
 * - Individual registration: exactly 1 CSV row with 14 standard core columns + dynamic custom fields.
 * - Team registration: exactly 1 CSV row per team member with 17 standard core columns + dynamic custom fields.
 * - Shared registration/payment columns repeated across team member rows.
 * - Core mapped fields (names, identifiers, department, year, phone) resolved cleanly into core columns.
 * - Dynamic form fields unioned stably across form versions in displayOrder.
 * - Sorted primarily by registration createdAt ascending, team members sorted with leader first.
 */
export function transformRegistrationsToCsvRows(
  options: TransformRegistrationsOptions
): TransformedCsvData {
  const { event, registrations, formFields } = options;

  // Determine if this is a team registration export
  const isTeam =
    options.isTeam ??
    (options.event.registrationType ? options.event.registrationType === "TEAM" : undefined) ??
    registrations.some(
      (r) => r.registrationType === "TEAM" || Boolean(r.team && r.team.members.length > 0)
    );

  // 1. Sort registrations deterministically by createdAt ascending, then registrationCode ascending
  const sortedRegistrations = [...registrations].sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();
    if (timeA !== timeB) return timeA - timeB;
    return a.registrationCode.localeCompare(b.registrationCode);
  });

  // 2. Select core columns based on registration structure
  const coreColumns: string[] = isTeam
    ? [...TEAM_CORE_COLUMNS]
    : [...INDIVIDUAL_CORE_COLUMNS];

  // 3. Resolve dynamic form columns (excluding core mapped keys)
  const dynamicColumns = resolveDynamicColumns(
    sortedRegistrations,
    formFields,
    new Set(coreColumns)
  );

  const dynamicHeaders = dynamicColumns.map((col) => col.header);
  const columns = [...coreColumns, ...dynamicHeaders];

  // 4. Construct rows
  const rows: (string | number | boolean | null)[][] = [];

  for (const reg of sortedRegistrations) {
    // Format payment fields
    const paymentStatus = reg.payment?.status || (event ? "FREE" : "N/A");
    const paymentMethod = reg.payment?.method || "";
    const paymentAmount =
      reg.payment?.amount !== null && reg.payment?.amount !== undefined
        ? String(reg.payment.amount)
        : "";
    const paymentReference = reg.payment?.userReference || "";

    // Map responses by fieldKey for O(1) lookup
    const responseMap = new Map<string, { valueText: string | null; valueJson: any | null }>();
    const responseByKey = new Map<string, { valueText: string | null; valueJson: any | null }>();
    for (const resp of reg.responses) {
      responseMap.set(resp.fieldKey, {
        valueText: resp.valueText,
        valueJson: resp.valueJson,
      });
      responseByKey.set(resp.fieldKey.toLowerCase(), {
        valueText: resp.valueText,
        valueJson: resp.valueJson,
      });
    }

    function getResponseValue(candidateKeys: string[]): string {
      for (const k of candidateKeys) {
        const resp = responseByKey.get(k.toLowerCase());
        if (resp) {
          const val = formatFieldValueForCsv(resp.valueText, resp.valueJson);
          if (val) return val;
        }
      }
      return "";
    }

    // Dynamic field values
    const dynamicValues = dynamicColumns.map((col) => {
      const resp = responseMap.get(col.key);
      if (!resp) return "";
      return formatFieldValueForCsv(resp.valueText, resp.valueJson);
    });

    const registeredAt =
      typeof reg.createdAt === "string"
        ? reg.createdAt
        : (reg.createdAt as unknown) instanceof Date
        ? (reg.createdAt as unknown as Date).toISOString()
        : String(reg.createdAt || "");

    if (isTeam) {
      const teamName = reg.team?.name || getResponseValue(["team_name"]) || "Unnamed Team";

      if (reg.team && reg.team.members.length > 0) {
        // Sort team members: leader first, then by name ascending
        const members = [...reg.team.members].sort((m1, m2) => {
          if (m1.isLeader && !m2.isLeader) return -1;
          if (!m1.isLeader && m2.isLeader) return 1;
          return m1.name.localeCompare(m2.name);
        });

        // Emit exactly 1 CSV row per team member
        members.forEach((member, index) => {
          const memberOrdinal = index + 1;
          const memberRole = member.isLeader ? "Leader" : "Member";
          const memberName = member.name;
          const memberType = member.participantType;
          const memberRrn = member.identifierNormalized || "";
          const memberCollege =
            member.collegeNormalized ||
            (member.participantType === "CRESCENT"
              ? "B.S. Abdur Rahman Crescent Institute of Science and Technology"
              : "");
          const memberPhone =
            member.phone ||
            (member.isLeader
              ? getResponseValue(["phone_number", "whatsapp_number", "phone", "whatsapp"])
              : "");
          const memberDept =
            member.academicDepartment ||
            (member.isLeader
              ? getResponseValue(["academic_department", "department", "degree", "department_degree"])
              : "");
          const memberYear =
            member.year ||
            (member.isLeader
              ? getResponseValue(["academic_year", "year", "year_of_study"])
              : "");

          rows.push([
            reg.registrationCode,
            reg.status,
            registeredAt,
            teamName,
            memberOrdinal,
            memberRole,
            memberName,
            memberType,
            memberRrn,
            memberCollege,
            memberPhone,
            memberDept,
            memberYear,
            paymentStatus,
            paymentMethod,
            paymentAmount,
            paymentReference,
            ...dynamicValues,
          ]);
        });
      } else {
        // Fallback for team registration without nested members array
        const participantType =
          reg.participantType ||
          getResponseValue(["participant_type", "participant_category"]);
        const college =
          reg.collegeNormalized ||
          getResponseValue(["college_name", "college"]) ||
          (participantType === "CRESCENT"
            ? "B.S. Abdur Rahman Crescent Institute of Science and Technology"
            : "");

        rows.push([
          reg.registrationCode,
          reg.status,
          registeredAt,
          teamName,
          1,
          "Leader",
          reg.participantName || getResponseValue(["full_name", "participant_name", "name"]),
          participantType,
          reg.identifierNormalized ||
            getResponseValue(["crescent_rrn", "external_roll_number", "rrn", "roll_number", "identifier"]),
          college,
          getResponseValue(["phone_number", "whatsapp_number", "phone", "whatsapp"]),
          getResponseValue(["academic_department", "department", "degree", "department_degree"]),
          getResponseValue(["academic_year", "year", "year_of_study"]),
          paymentStatus,
          paymentMethod,
          paymentAmount,
          paymentReference,
          ...dynamicValues,
        ]);
      }
    } else {
      // Individual registration: exactly 1 CSV row
      const participantType =
        reg.participantType ||
        getResponseValue(["participant_type", "participant_category"]);

      const participantName =
        reg.participantName ||
        getResponseValue(["full_name", "participant_name", "name"]);

      const rrnRollNumber =
        reg.identifierNormalized ||
        getResponseValue(["crescent_rrn", "external_roll_number", "rrn", "roll_number", "identifier"]);

      const college =
        reg.collegeNormalized ||
        getResponseValue(["college_name", "college"]) ||
        (participantType === "CRESCENT"
          ? "B.S. Abdur Rahman Crescent Institute of Science and Technology"
          : "");

      const department = getResponseValue([
        "academic_department",
        "department",
        "degree",
        "department_degree",
      ]);

      const year = getResponseValue(["academic_year", "year", "year_of_study"]);

      const phone = getResponseValue([
        "phone_number",
        "whatsapp_number",
        "phone",
        "whatsapp",
      ]);

      rows.push([
        reg.registrationCode,
        reg.status,
        registeredAt,
        participantName,
        participantType,
        rrnRollNumber,
        college,
        department,
        year,
        phone,
        paymentStatus,
        paymentMethod,
        paymentAmount,
        paymentReference,
        ...dynamicValues,
      ]);
    }
  }

  return { columns, rows };
}
