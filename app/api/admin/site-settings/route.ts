import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth/session";
import { AdminRole } from "@prisma/client";
import {
  getPublicContactSettings,
  updateSiteSetting,
  ALLOWED_SITE_SETTING_KEYS,
  AllowedSiteSettingKey,
} from "@/lib/site-settings/service";
import { z } from "zod";

export const dynamic = "force-dynamic";

const patchSettingSchema = z.object({
  key: z.enum(ALLOWED_SITE_SETTING_KEYS as unknown as [AllowedSiteSettingKey, ...AllowedSiteSettingKey[]]),
  value: z.any(),
});

export async function GET(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  if (admin.role !== AdminRole.CCF_ADMIN && admin.role !== AdminRole.IT_ADMIN) {
    return NextResponse.json({ error: "Insufficient permissions." }, { status: 403 });
  }

  const settings = await getPublicContactSettings();
  return NextResponse.json({ settings });
}

export async function PATCH(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  if (admin.role !== AdminRole.CCF_ADMIN && admin.role !== AdminRole.IT_ADMIN) {
    return NextResponse.json({ error: "Insufficient permissions." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { key, value } = patchSettingSchema.parse(body);

    if (key === "contact_email" || key === "support_email") {
      const emailParsed = z.string().email().safeParse(value);
      if (!emailParsed.success) {
        return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
      }
    } else if (key === "social_instagram" || key === "social_linkedin") {
      const urlParsed = z.string().url().safeParse(value);
      if (!urlParsed.success) {
        return NextResponse.json({ error: "Please enter a valid URL." }, { status: 400 });
      }
    }

    const updated = await updateSiteSetting(key, value, admin.id);
    return NextResponse.json({ success: true, setting: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Invalid input." }, { status: 400 });
    }
    console.error("[PATCH /api/admin/site-settings] Error:", error);
    return NextResponse.json({ error: "Failed to update site setting." }, { status: 500 });
  }
}
