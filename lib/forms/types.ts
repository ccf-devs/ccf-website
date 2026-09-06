import {
  FieldType,
  FieldScope,
  FormVersionStatus,
  RegistrationMode,
  EventField as PrismaEventField,
  FormVersion as PrismaFormVersion,
} from "@prisma/client";

// Re-export Prisma enums directly to ensure 100% semantic identity
export { FieldType, FieldScope, FormVersionStatus, RegistrationMode };

/**
 * Supported operators for conditional logic evaluation
 */
export type ConditionalOperator = "equals" | "not_equals" | "in" | "not_in";

/**
 * Conditional logic rule configuration stored in event_fields.conditional_logic (JSONB)
 */
export interface EventFieldConditionalLogic {
  /** The key of the field that this field's visibility depends on */
  dependsOn: string;
  /** Operator to test the dependent field's value against */
  operator: ConditionalOperator;
  /** Expected value or values (for "in" / "not_in") */
  value: string | number | boolean | Array<string | number | boolean>;
}

/**
 * Validation rules configuration stored in event_fields.validation (JSONB)
 */
export interface EventFieldValidation {
  /** Minimum string length, numeric value, or selection count */
  min?: number;
  /** Maximum string length, numeric value, or selection count */
  max?: number;
  /** Aliases for min/max string length */
  minLength?: number;
  maxLength?: number;
  /** Regex pattern for string format validation */
  pattern?: string;
  /** Custom error message displayed when validation fails */
  customErrorMessage?: string;
}

/**
 * Extended UI & option configuration stored in event_fields.config (JSONB)
 */
export interface EventFieldConfig {
  /** Select, multi-select, radio, or checkbox option list */
  options?: string[];
  /** Placeholder text for input */
  placeholder?: string;
  /** Helper/instructional text rendered below input */
  helpText?: string;
  /** Whether this field maps to a platform-level system field concept */
  isSystem?: boolean;
  /** Canonical system field identifier if isSystem is true */
  systemKey?:
    | "participant_type"
    | "college"
    | "crescent_rrn"
    | "external_roll"
    | "name"
    | "department"
    | "year"
    | "academic_level"
    | "phone"
    | "email"
    | "team_name"
    | "team_membership"
    | "team_leader";
}

/**
 * Domain representation of an EventField, bridging physical schema to handbook concepts
 */
export interface EventFieldDomain {
  id: string;
  formVersionId?: string;
  versionId?: string;
  key: string;
  label: string;
  type: FieldType;
  scope?: FieldScope;
  fieldScope?: FieldScope;
  required: boolean;
  displayOrder: number;
  config: EventFieldConfig;
  validation?: EventFieldValidation | null;
  conditionalLogic?: EventFieldConditionalLogic | null;
}

/**
 * Domain representation of a FormVersion with its fields
 */
export interface FormVersionDomain {
  id: string;
  eventId: string;
  versionNumber: number;
  status: FormVersionStatus;
  publishedAt: Date | null;
  createdBy: string;
  createdAt: Date;
  fields: EventFieldDomain[];
  isCurrentActive?: boolean;
}

/**
 * Helper to convert a Prisma EventField row to an EventFieldDomain object.
 * Bridges Prisma physical schema columns (fieldScope, formVersionId)
 * with CCF Handbook conceptual terminology (scope, versionId)
 * while preserving full backward and forward compatibility.
 */
export function toEventFieldDomain(field: PrismaEventField | any): EventFieldDomain {
  const config = (field.config as unknown as EventFieldConfig) || {};
  const validation = (field.validation as unknown as EventFieldValidation) || null;
  const conditionalLogic = (field.conditionalLogic as unknown as EventFieldConditionalLogic) || null;
  const scope = field.fieldScope ?? field.scope;
  const versionId = field.formVersionId ?? field.versionId;

  return {
    id: field.id,
    formVersionId: versionId,
    versionId: versionId,
    key: field.key,
    label: field.label,
    type: field.type,
    scope: scope,
    fieldScope: scope,
    required: field.required,
    displayOrder: field.displayOrder,
    config,
    validation,
    conditionalLogic,
  };
}
