import { z } from "zod";

/**
 * Validation schema for updating department parameters.
 * Note: `name` and `slug` are immutable identity fields and cannot be updated.
 */
export const updateDepartmentSchema = z.object({
  description: z
    .string()
    .trim()
    .max(1000, "Description must not exceed 1000 characters.")
    .optional()
    .nullable(),
  active: z.boolean().optional(),
});

export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;
