import { z } from "zod";
import { FieldType, FieldScope, EventFieldDomain } from "./types";
import { isFieldVisible } from "./conditional-logic";

/**
 * Regex for field keys: lowercase letter followed by letters, numbers, and underscores (e.g. "crescent_rrn", "team_name")
 */
export const FIELD_KEY_REGEX = /^[a-z][a-z0-9_]{0,99}$/;

/**
 * Zod schema for configuring validation rules on a field
 */
export const FieldValidationConfigSchema = z
  .object({
    min: z.number().optional(),
    max: z.number().optional(),
    pattern: z.string().max(500).optional(),
    customErrorMessage: z.string().max(250).optional(),
  })
  .nullable()
  .optional();

/**
 * Zod schema for configuring conditional logic on a field
 */
export const FieldConditionalLogicSchema = z
  .object({
    dependsOn: z.string().min(1).max(100),
    operator: z.enum(["equals", "not_equals", "in", "not_in"]),
    value: z.union([
      z.string(),
      z.number(),
      z.boolean(),
      z.array(z.union([z.string(), z.number(), z.boolean()])),
    ]),
  })
  .nullable()
  .optional();

/**
 * Zod schema for field UI config (options, placeholders, system field metadata)
 */
export const FieldConfigSchema = z
  .object({
    options: z.array(z.string().min(1).max(250)).optional(),
    placeholder: z.string().max(250).optional(),
    helpText: z.string().max(500).optional(),
    isSystem: z.boolean().optional(),
    systemKey: z.string().max(100).optional(),
  })
  .optional();

/**
 * Zod schema for creating or updating an EventField
 */
export const EventFieldBaseSchema = z.object({
  key: z
    .string()
    .min(1, "Field key is required")
    .max(100, "Field key cannot exceed 100 characters")
    .regex(
      FIELD_KEY_REGEX,
      "Field key must contain only lowercase alphanumeric characters and underscores"
    ),
  label: z
    .string()
    .min(1, "Label is required")
    .max(250, "Label cannot exceed 250 characters"),
  type: z.nativeEnum(FieldType, {
    errorMap: () => ({ message: "Invalid field type" }),
  }),
  fieldScope: z.nativeEnum(FieldScope, {
    errorMap: () => ({ message: "Invalid field scope" }),
  }),
  required: z.boolean().default(false),
  displayOrder: z.number().int().nonnegative().optional(),
  config: FieldConfigSchema,
  validation: FieldValidationConfigSchema,
  conditionalLogic: FieldConditionalLogicSchema,
});

export const EventFieldInputSchema = EventFieldBaseSchema.superRefine((data, ctx) => {
  // Option-based field types require at least one option
  if (
    data.type === FieldType.SELECT ||
    data.type === FieldType.MULTI_SELECT ||
    data.type === FieldType.RADIO
  ) {
    const options = data.config?.options;
    if (!options || options.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["config", "options"],
        message: `${data.type} fields require at least one option`,
      });
    }
  }

  // Min/Max consistency
  if (
    data.validation?.min !== undefined &&
    data.validation?.max !== undefined &&
    data.validation.min > data.validation.max
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["validation", "min"],
      message: "Minimum validation value cannot be greater than maximum value",
    });
  }

  // Conditional logic self-reference guard
  if (data.conditionalLogic?.dependsOn === data.key) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["conditionalLogic", "dependsOn"],
      message: "A field cannot conditionally depend on itself",
    });
  }
});

export type EventFieldInput = z.infer<typeof EventFieldInputSchema>;

/**
 * Zod schema for updating an existing EventField (partial)
 */
export const EventFieldUpdateSchema = EventFieldBaseSchema.partial();
export type EventFieldUpdate = z.infer<typeof EventFieldUpdateSchema>;

/**
 * Zod schema for creating a new FormVersion
 */
export const FormVersionCreateSchema = z
  .object({
    cloneFromVersionId: z.string().optional(),
    sourceVersionId: z.string().optional(),
  })
  .transform((data) => ({
    cloneFromVersionId: data.cloneFromVersionId || data.sourceVersionId,
  }));

export type FormVersionCreateInput = z.infer<typeof FormVersionCreateSchema>;

/**
 * Zod schema for batch reordering fields
 */
export const FieldReorderSchema = z
  .object({
    fields: z
      .array(
        z.object({
          id: z.string().min(1),
          displayOrder: z.number().int().positive(),
        })
      )
      .optional(),
    items: z
      .array(
        z.object({
          id: z.string().min(1),
          displayOrder: z.number().int().positive(),
        })
      )
      .optional(),
  })
  .refine(
    (data) =>
      (Array.isArray(data.fields) && data.fields.length > 0) ||
      (Array.isArray(data.items) && data.items.length > 0),
    {
      message: "At least one field reorder instruction is required",
    }
  )
  .transform((data) => ({
    fields: (data.fields || data.items)!,
  }))
  .superRefine((data, ctx) => {
    if (!data?.fields || !Array.isArray(data.fields)) {
      return;
    }
    const ids = data.fields.map((f) => f?.id).filter(Boolean);
    const uniqueIds = new Set(ids);
    if (uniqueIds.size !== data.fields.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fields"],
        message: "Field IDs must be strictly unique in reorder request",
      });
    }

    const orders = data.fields
      .map((f) => f?.displayOrder)
      .filter((o) => typeof o === "number");
    const uniqueOrders = new Set(orders);
    if (uniqueOrders.size !== data.fields.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fields"],
        message: "Display order values must be strictly unique in reorder request",
      });
    }
  });

export type FieldReorderInput = z.infer<typeof FieldReorderSchema>;

/**
 * Dynamic Form Submission Validation Result
 */
export interface FormValidationResult {
  isValid: boolean;
  success: boolean;
  errors?: Record<string, string>;
  cleanedValues: Record<string, any>;
  validatedValues: Record<string, any>;
}

/**
 * Validates dynamic form submission responses against a published form version's fields.
 *
 * Rules:
 * - Follows conditional visibility: if a field is hidden for the current branch (e.g. Crescent RRN for external student),
 *   its required flag is not enforced.
 * - Enforces field types (EMAIL, NUMBER, PHONE, SELECT, MULTI_SELECT, etc.).
 * - Enforces custom validation rules (min, max, pattern).
 */
export function validateFormSubmission(
  fields: EventFieldDomain[],
  values: Record<string, any>
): FormValidationResult {
  const errors: Record<string, string> = {};
  const cleanedValues: Record<string, any> = { ...values };

  for (const field of fields) {
    const isVisible = isFieldVisible(field.conditionalLogic, values);

    // If field is conditionally hidden for this branch, required validation is bypassed
    if (!isVisible) {
      continue;
    }

    const value = values[field.key];
    const isCheckboxEmpty =
      field.type === FieldType.CHECKBOX && (value === false || value === "false" || !value);
    const isEmpty =
      value === undefined ||
      value === null ||
      value === "" ||
      (Array.isArray(value) && value.length === 0) ||
      isCheckboxEmpty;

    // Required check
    if (field.required && isEmpty) {
      errors[field.key] =
        field.validation?.customErrorMessage || `${field.label} is required`;
      continue;
    }

    // If optional and empty, skip further type checks
    if (isEmpty) {
      continue;
    }

    // Type-specific and rule validation
    switch (field.type) {
      case FieldType.EMAIL: {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (typeof value !== "string" || !emailRegex.test(value)) {
          errors[field.key] =
            field.validation?.customErrorMessage || "Please enter a valid email address";
        }
        break;
      }

      case FieldType.NUMBER: {
        const num = Number(value);
        if (isNaN(num)) {
          errors[field.key] =
            field.validation?.customErrorMessage || "Please enter a valid number";
        } else {
          if (field.validation?.min !== undefined && num < field.validation.min) {
            errors[field.key] =
              field.validation?.customErrorMessage ||
              `Value must be at least ${field.validation.min}`;
          }
          if (field.validation?.max !== undefined && num > field.validation.max) {
            errors[field.key] =
              field.validation?.customErrorMessage ||
              `Value cannot exceed ${field.validation.max}`;
          }
        }
        break;
      }

      case FieldType.PHONE: {
        const phoneDigits = String(value).replace(/\D/g, "");
        if (phoneDigits.length < 10 || phoneDigits.length > 15) {
          errors[field.key] =
            field.validation?.customErrorMessage ||
            "Please enter a valid 10-digit phone number";
        }
        break;
      }

      case FieldType.SELECT:
      case FieldType.RADIO: {
        const allowedOptions = field.config.options || [];
        if (!allowedOptions.includes(String(value))) {
          errors[field.key] =
            field.validation?.customErrorMessage || "Please select a valid option";
        }
        break;
      }

      case FieldType.MULTI_SELECT: {
        const allowedOptions = field.config.options || [];
        if (!Array.isArray(value)) {
          errors[field.key] = "Invalid selection";
        } else {
          const invalid = value.some((v) => !allowedOptions.includes(String(v)));
          if (invalid) {
            errors[field.key] = "One or more selected options are invalid";
          }
          if (field.validation?.min !== undefined && value.length < field.validation.min) {
            errors[field.key] = `Please select at least ${field.validation.min} options`;
          }
          if (field.validation?.max !== undefined && value.length > field.validation.max) {
            errors[field.key] = `You may select at most ${field.validation.max} options`;
          }
        }
        break;
      }

      case FieldType.TEXT:
      case FieldType.TEXTAREA: {
        const strVal = String(value);
        if (field.validation?.min !== undefined && strVal.length < field.validation.min) {
          errors[field.key] =
            field.validation?.customErrorMessage ||
            `Must be at least ${field.validation.min} characters`;
        }
        if (field.validation?.max !== undefined && strVal.length > field.validation.max) {
          errors[field.key] =
            field.validation?.customErrorMessage ||
            `Cannot exceed ${field.validation.max} characters`;
        }
        if (field.validation?.pattern) {
          try {
            const regex = new RegExp(field.validation.pattern);
            if (!regex.test(strVal)) {
              errors[field.key] =
                field.validation?.customErrorMessage || "Value does not match required format";
            }
          } catch {
            // Ignore malformed regex in runtime
          }
        }
        break;
      }

      default:
        break;
    }
  }

  const isValid = Object.keys(errors).length === 0;
  return {
    isValid,
    success: isValid,
    errors: isValid ? undefined : errors,
    cleanedValues,
    validatedValues: cleanedValues,
  };
}
