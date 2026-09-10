import { z } from "zod";
import { NotificationSeverity } from "@prisma/client";

/**
 * Route resource ID validation (UUID format).
 */
export const notificationIdSchema = z
  .string()
  .uuid("Invalid notification ID format. Expected a valid UUID.");

/**
 * Query parameter validation for GET /api/admin/notifications.
 */
export const notificationQuerySchema = z.object({
  severity: z
    .string()
    .trim()
    .toUpperCase()
    .refine(
      (val) => {
        if (!val || val === "ALL") return true;
        return Object.values(NotificationSeverity).includes(
          val as NotificationSeverity
        );
      },
      {
        message:
          "Invalid severity filter. Must be 'ALL', 'INFO', 'SUCCESS', 'WARNING', or 'ERROR'.",
      }
    )
    .optional(),
  status: z
    .string()
    .trim()
    .toUpperCase()
    .refine(
      (val) => {
        if (!val || val === "ALL") return true;
        return ["UNREAD", "READ"].includes(val);
      },
      {
        message: "Invalid status filter. Must be 'ALL', 'UNREAD', or 'READ'.",
      }
    )
    .optional(),
  target: z
    .string()
    .trim()
    .toUpperCase()
    .refine(
      (val) => {
        if (!val || val === "ALL") return true;
        return ["GLOBAL", "TARGETED"].includes(val);
      },
      {
        message: "Invalid target filter. Must be 'ALL', 'GLOBAL', or 'TARGETED'.",
      }
    )
    .optional(),
  search: z
    .string()
    .trim()
    .max(100, "Search query must not exceed 100 characters.")
    .optional(),
});

export type NotificationQueryInput = z.infer<typeof notificationQuerySchema>;

/**
 * Payload validation for creating an administrative notification/broadcast (POST /api/admin/notifications).
 */
export const createNotificationSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required.")
    .max(250, "Title must not exceed 250 characters."),
  body: z
    .string()
    .trim()
    .min(1, "Body content is required.")
    .max(2000, "Body must not exceed 2000 characters."),
  type: z
    .string()
    .trim()
    .min(1, "Type is required.")
    .max(100, "Type must not exceed 100 characters."),
  severity: z.nativeEnum(NotificationSeverity, {
    errorMap: () => ({
      message:
        "Invalid severity. Allowed values: INFO, SUCCESS, WARNING, ERROR.",
    }),
  }),
  targetAdminId: z
    .string()
    .uuid("Invalid target admin ID. Expected a valid UUID.")
    .nullable()
    .optional()
    .or(z.literal("")),
});

export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;

/**
 * Payload validation for read-state toggle (PATCH /api/admin/notifications/[id]).
 */
export const updateNotificationReadSchema = z
  .object({
    read: z.boolean({
      required_error: "'read' field is required.",
      invalid_type_error: "'read' must be a boolean.",
    }),
  })
  .strict();

export type UpdateNotificationReadInput = z.infer<
  typeof updateNotificationReadSchema
>;
