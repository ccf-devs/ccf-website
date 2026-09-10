import { z } from "zod";
import crypto from "crypto";

export const MAX_MEDIA_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export const ALLOWED_MEDIA_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export type AllowedMediaMimeType = (typeof ALLOWED_MEDIA_MIME_TYPES)[number];

export const MIME_TO_EXTENSION: Record<AllowedMediaMimeType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

/**
 * Validates binary signature (magic bytes) against declared MIME type.
 * Defense-in-depth against malicious file extension / header spoofing.
 */
export function validateImageSignature(
  buffer: Buffer,
  declaredMimeType: string
): boolean {
  if (!buffer || buffer.length < 12) {
    return false;
  }

  switch (declaredMimeType) {
    case "image/jpeg":
      // JPEG magic bytes: FF D8 FF
      return (
        buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
      );

    case "image/png":
      // PNG magic bytes: 89 50 4E 47 (0x89 'PNG')
      return (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47
      );

    case "image/gif":
      // GIF magic bytes: 47 49 46 38 ('GIF8')
      return (
        buffer[0] === 0x47 &&
        buffer[1] === 0x49 &&
        buffer[2] === 0x46 &&
        buffer[3] === 0x38
      );

    case "image/webp":
      // WEBP magic bytes: RIFF....WEBP (52 49 46 46 .... 57 45 42 50)
      return (
        buffer[0] === 0x52 &&
        buffer[1] === 0x49 &&
        buffer[2] === 0x46 &&
        buffer[3] === 0x46 &&
        buffer[8] === 0x57 &&
        buffer[9] === 0x45 &&
        buffer[10] === 0x42 &&
        buffer[11] === 0x50
      );

    default:
      return false;
  }
}

/**
 * Generates a collision-resistant, safe server-side object key.
 * Strictly prevents path traversal, absolute paths, or client-controlled keys.
 */
export function generateSafeObjectKey(
  mimeType: AllowedMediaMimeType,
  eventId?: string | null
): string {
  const ext = MIME_TO_EXTENSION[mimeType] || "jpg";
  const uuid = crypto.randomUUID();

  if (eventId && eventId.trim() !== "") {
    return `events/${eventId.trim()}/${uuid}.${ext}`;
  }

  return `gallery/${uuid}.${ext}`;
}

/**
 * Metadata validation for media upload (form data fields).
 */
export const uploadMediaMetadataSchema = z.object({
  altText: z
    .string()
    .max(300, "Alt text must not exceed 300 characters.")
    .nullable()
    .optional(),
  eventId: z
    .string()
    .uuid("Invalid event ID format.")
    .nullable()
    .optional()
    .or(z.literal("")),
  visibility: z
    .preprocess((val) => {
      if (typeof val === "string") {
        return val.toLowerCase() === "true" || val === "1";
      }
      return val;
    }, z.boolean())
    .optional()
    .default(true),
  displayOrder: z
    .preprocess((val) => {
      if (typeof val === "string" && val.trim() !== "") {
        const parsed = parseInt(val, 10);
        return isNaN(parsed) ? 0 : parsed;
      }
      return val;
    }, z.number().int().min(0, "Display order must be a non-negative integer."))
    .optional()
    .default(0),
});

export type UploadMediaMetadataInput = z.infer<typeof uploadMediaMetadataSchema>;

/**
 * Metadata validation for media update (PATCH /api/admin/media/[id]).
 */
export const updateMediaSchema = z
  .object({
    altText: z
      .string()
      .max(300, "Alt text must not exceed 300 characters.")
      .nullable()
      .optional(),
    eventId: z
      .string()
      .uuid("Invalid event ID format.")
      .nullable()
      .optional(),
    visibility: z.boolean().optional(),
    displayOrder: z
      .number()
      .int()
      .min(0, "Display order must be a non-negative integer.")
      .optional(),
  })
  .strict();

export type UpdateMediaInput = z.infer<typeof updateMediaSchema>;

/**
 * Route resource ID validation (UUID format).
 */
export const mediaIdSchema = z.string().uuid("Invalid media ID format. Expected a valid UUID.");

/**
 * Query parameter validation for GET /api/admin/media.
 */
export const mediaQuerySchema = z.object({
  eventId: z
    .string()
    .trim()
    .refine(
      (val) => {
        if (!val || val === "ALL" || val === "GENERAL") return true;
        return z.string().uuid().safeParse(val).success;
      },
      {
        message:
          "Invalid eventId filter. Must be 'ALL', 'GENERAL', or a valid UUID.",
      }
    )
    .optional(),
  visibility: z
    .string()
    .trim()
    .toLowerCase()
    .refine(
      (val) => {
        if (!val) return true;
        return ["all", "visible", "hidden", "true", "false"].includes(val);
      },
      {
        message:
          "Invalid visibility filter. Must be 'all', 'visible', 'hidden', 'true', or 'false'.",
      }
    )
    .optional(),
  search: z
    .string()
    .trim()
    .max(100, "Search query must not exceed 100 characters.")
    .optional(),
});

export type MediaQueryInput = z.infer<typeof mediaQuerySchema>;
