import { prisma } from "@/lib/db/client";
import { CCF_PUBLIC_INFO } from "@/components/site/navigation-data";
import { createAuditLog } from "@/lib/audit/log";

export interface PublicContactSettings {
  contactEmail: string;
  supportEmail: string;
  socialInstagram: string;
  socialLinkedin: string;
}

export const ALLOWED_SITE_SETTING_KEYS = [
  "contact_email",
  "support_email",
  "social_instagram",
  "social_linkedin",
  "recruitment_status",
] as const;

export type AllowedSiteSettingKey = (typeof ALLOWED_SITE_SETTING_KEYS)[number];

export const DEFAULT_PUBLIC_CONTACT_SETTINGS: PublicContactSettings = {
  contactEmail: CCF_PUBLIC_INFO.email,
  supportEmail: "support.ccf@gmail.com",
  socialInstagram: CCF_PUBLIC_INFO.socials.instagram,
  socialLinkedin: CCF_PUBLIC_INFO.socials.linkedin,
};

function extractStringValue(val: unknown): string | null {
  if (typeof val === "string") return val;
  if (val && typeof val === "object" && "value" in val) {
    return String((val as { value: unknown }).value);
  }
  return null;
}

/**
 * Retrieves public contact and social settings from site_settings.
 * Falls back to canonical CCF_PUBLIC_INFO values if unconfigured or unreachable.
 */
export async function getPublicContactSettings(): Promise<PublicContactSettings> {
  try {
    if (!prisma?.siteSetting?.findMany) {
      return DEFAULT_PUBLIC_CONTACT_SETTINGS;
    }

    const settings = await prisma.siteSetting.findMany({
      where: {
        key: {
          in: ["contact_email", "support_email", "social_instagram", "social_linkedin"],
        },
      },
    });

    const map = new Map<string, string>();
    for (const s of settings) {
      const strVal = extractStringValue(s.value);
      if (strVal) {
        map.set(s.key, strVal);
      }
    }

    return {
      contactEmail: map.get("contact_email") || DEFAULT_PUBLIC_CONTACT_SETTINGS.contactEmail,
      supportEmail: map.get("support_email") || DEFAULT_PUBLIC_CONTACT_SETTINGS.supportEmail,
      socialInstagram: map.get("social_instagram") || DEFAULT_PUBLIC_CONTACT_SETTINGS.socialInstagram,
      socialLinkedin: map.get("social_linkedin") || DEFAULT_PUBLIC_CONTACT_SETTINGS.socialLinkedin,
    };
  } catch (error) {
    console.error("[getPublicContactSettings] Failed to fetch contact settings:", error);
    return DEFAULT_PUBLIC_CONTACT_SETTINGS;
  }
}

/**
 * Updates an allowed site setting and logs an audit trail event.
 */
export async function updateSiteSetting(
  key: string,
  value: unknown,
  adminId: string
) {
  if (!ALLOWED_SITE_SETTING_KEYS.includes(key as AllowedSiteSettingKey)) {
    throw new Error(`Setting key "${key}" is not permitted.`);
  }

  const updated = await prisma.siteSetting.upsert({
    where: { key },
    update: { value: value as any, updatedBy: adminId },
    create: { key, value: value as any, updatedBy: adminId },
  });

  await createAuditLog({
    actorId: adminId,
    action: "SITE_SETTING_UPDATED",
    entityType: "SITE_SETTING",
    metadata: { key, value },
  });

  return updated;
}
