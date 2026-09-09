import { z } from "zod";

/**
 * Validation schema for creating a new Member record.
 * Uses exact Prisma schema field names:
 * name, position, departmentId, photoMediaId, bio, socialUrl, visibility, displayOrder.
 */
export const createMemberSchema = z.object({
  name: z
    .string({ required_error: "Member name is required." })
    .trim()
    .min(1, "Member name cannot be blank.")
    .max(150, "Member name must not exceed 150 characters."),
  position: z
    .string()
    .trim()
    .max(150, "Position must not exceed 150 characters.")
    .optional()
    .nullable(),
  departmentId: z
    .string({ required_error: "Department is required." })
    .uuid("Invalid department identifier."),
  displayOrder: z.coerce
    .number({ invalid_type_error: "Display order must be a number." })
    .int("Display order must be an integer.")
    .min(0, "Display order must be 0 or greater.")
    .default(0),
  visibility: z.boolean().default(true),
  bio: z
    .string()
    .trim()
    .max(1000, "Bio must not exceed 1000 characters.")
    .optional()
    .nullable(),
  socialUrl: z
    .string()
    .trim()
    .url("Invalid social link URL.")
    .optional()
    .nullable()
    .or(z.literal("")),
  photoMediaId: z
    .string()
    .uuid("Invalid photo media identifier.")
    .optional()
    .nullable(),
});

export type CreateMemberInput = z.infer<typeof createMemberSchema>;

/**
 * Validation schema for updating an existing Member record.
 */
export const updateMemberSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Member name cannot be blank.")
    .max(150, "Member name must not exceed 150 characters.")
    .optional(),
  position: z
    .string()
    .trim()
    .max(150, "Position must not exceed 150 characters.")
    .optional()
    .nullable(),
  departmentId: z
    .string()
    .uuid("Invalid department identifier.")
    .optional(),
  displayOrder: z.coerce
    .number()
    .int("Display order must be an integer.")
    .min(0, "Display order must be 0 or greater.")
    .optional(),
  visibility: z.boolean().optional(),
  bio: z
    .string()
    .trim()
    .max(1000, "Bio must not exceed 1000 characters.")
    .optional()
    .nullable(),
  socialUrl: z
    .string()
    .trim()
    .url("Invalid social link URL.")
    .optional()
    .nullable()
    .or(z.literal("")),
  photoMediaId: z
    .string()
    .uuid("Invalid photo media identifier.")
    .optional()
    .nullable(),
});

export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
