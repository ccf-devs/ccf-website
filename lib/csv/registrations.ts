import { AdminRegistrationView } from "@/lib/registrations/types";
import { PaymentStatus, PaymentMethod } from "@prisma/client";

export interface EventMetadata {
  id: string;
  name: string;
  slug: string;
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
}

export interface TransformedCsvData {
  columns: string[];
  rows: (string | number | boolean | null)[][];
}

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
 * - Preservation of displayOrder
 * - Stable union across multiple published form versions
 * - Disambiguation of conflicting labels with different keys
 */
export function resolveDynamicColumns(
  registrations: AdminRegistrationView[],
  providedFields?: FormFieldMetadata[]
): DynamicColumnDef[] {
  // Map of key -> { key, label, displayOrder }
  const fieldMap = new Map<string, { key: string; label: string; displayOrder: number }>();

  // 1. Ingest any explicitly provided form field metadata (from DB query)
  if (providedFields && providedFields.length > 0) {
    for (const field of providedFields) {
      if (!fieldMap.has(field.key)) {
        fieldMap.set(field.key, {
          key: field.key,
          label: field.label,
          displayOrder: field.displayOrder ?? 9999,
        });
      }
    }
  }

  // 2. Ingest fields found in registration responses (ensures legacy/historical responses are captured)
  let fallbackOrder = 10000;
  for (const reg of registrations) {
    for (const resp of reg.responses) {
      if (!fieldMap.has(resp.fieldKey)) {
        fieldMap.set(resp.fieldKey, {
          key: resp.fieldKey,
          label: resp.fieldLabel || resp.fieldKey,
          displayOrder: fallbackOrder++,
        });
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

  // Assign deterministic, unique headers (appending key if duplicate label exists)
  return rawFields.map((field) => {
    const isDuplicate = (labelCounts.get(field.label) || 0) > 1;
    const header = isDuplicate ? `${field.label} (${field.key})` : field.label;
    return {
      key: field.key,
      header,
      displayOrder: field.displayOrder,
    };
  });
}

/**
 * Transforms event registrations into tabular CSV columns and rows according to
 * CCF Handbook Phase 13A specification.
 *
 * Rules:
 * - Individual registration: exactly 1 CSV row.
 * - Team registration: exactly 1 CSV row per team member.
 * - Shared registration/team/payment columns repeated across all team member rows.
 * - Dynamic form fields unioned stably across form versions.
 * - Sorted primarily by registration createdAt ascending, team members sorted with leader first.
 */
export function transformRegistrationsToCsvRows(
  options: TransformRegistrationsOptions
): TransformedCsvData {
  const { event, registrations, formFields } = options;

  // 1. Sort registrations deterministically by createdAt ascending
  const sortedRegistrations = [...registrations].sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();
    if (timeA !== timeB) return timeA - timeB;
    return a.registrationCode.localeCompare(b.registrationCode);
  });

  // 2. Resolve dynamic form columns
  const dynamicColumns = resolveDynamicColumns(sortedRegistrations, formFields);

  // 3. Define the deterministic column list
  const standardEventColumns = [
    "Event",
    "Event Slug",
    "Registration Code",
    "Registration Status",
    "Registration Type",
    "Registration Date",
  ];

  const teamMemberColumns = [
    "Team Name",
    "Member Ordinal",
    "Member Role",
    "Member Name",
    "Member Participant Type",
    "Member Identifier / RRN",
    "Member College",
    "Member Phone",
    "Member Academic Department",
    "Member Year",
  ];

  const paymentColumns = [
    "Payment Status",
    "Payment Method",
    "Payment Amount",
    "Payment Currency",
    "Payment User Reference",
  ];

  const dynamicHeaders = dynamicColumns.map((col) => col.header);

  const columns = [
    ...standardEventColumns,
    ...teamMemberColumns,
    ...paymentColumns,
    ...dynamicHeaders,
  ];

  // 4. Construct rows
  const rows: (string | number | boolean | null)[][] = [];

  for (const reg of sortedRegistrations) {
    // Format payment fields
    const paymentStatus = reg.payment?.status || (event ? "FREE" : "N/A");
    const paymentMethod = reg.payment?.method || "";
    const paymentAmount = reg.payment?.amount || "";
    const paymentCurrency = reg.payment?.currency || "";
    const paymentReference = reg.payment?.userReference || "";

    // Map dynamic responses by fieldKey for O(1) row lookup
    const responseMap = new Map<string, { valueText: string | null; valueJson: any | null }>();
    for (const resp of reg.responses) {
      responseMap.set(resp.fieldKey, {
        valueText: resp.valueText,
        valueJson: resp.valueJson,
      });
    }

    const dynamicValues = dynamicColumns.map((col) => {
      const resp = responseMap.get(col.key);
      if (!resp) return "";
      return formatFieldValueForCsv(resp.valueText, resp.valueJson);
    });

    const sharedEventValues = [
      event.name,
      event.slug,
      reg.registrationCode,
      reg.status,
      reg.registrationType,
      reg.createdAt,
    ];

    const sharedPaymentValues = [
      paymentStatus,
      paymentMethod,
      paymentAmount,
      paymentCurrency,
      paymentReference,
    ];

    if (reg.registrationType === "TEAM" && reg.team && reg.team.members.length > 0) {
      // Sort team members: leader first, then by name or stable identifier
      const members = [...reg.team.members].sort((m1, m2) => {
        if (m1.isLeader && !m2.isLeader) return -1;
        if (!m1.isLeader && m2.isLeader) return 1;
        return m1.name.localeCompare(m2.name);
      });

      // Emit exactly 1 CSV row per team member
      members.forEach((member, index) => {
        const memberOrdinal = index + 1;
        const memberRole = member.isLeader ? "Leader" : "Member";

        const memberValues = [
          reg.team?.name || "Unnamed Team",
          memberOrdinal,
          memberRole,
          member.name,
          member.participantType,
          member.identifierNormalized || "",
          member.collegeNormalized || "",
          member.phone || "",
          member.academicDepartment || "",
          member.year || "",
        ];

        rows.push([
          ...sharedEventValues,
          ...memberValues,
          ...sharedPaymentValues,
          ...dynamicValues,
        ]);
      });
    } else {
      // Individual registration: exactly 1 CSV row
      const individualValues = [
        "", // Team Name
        1, // Member Ordinal
        "Individual", // Member Role
        reg.participantName,
        reg.participantType,
        reg.identifierNormalized || "",
        reg.collegeNormalized || "",
        "", // Phone (captured via dynamic fields if configured)
        "", // Department
        "", // Year
      ];

      rows.push([
        ...sharedEventValues,
        ...individualValues,
        ...sharedPaymentValues,
        ...dynamicValues,
      ]);
    }
  }

  return { columns, rows };
}
