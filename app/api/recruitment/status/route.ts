import { NextResponse } from "next/server";
import { getRecruitmentSettings } from "@/lib/recruitment/service";

export const dynamic = "force-dynamic";

/**
 * GET /api/recruitment/status
 * Public endpoint returning current recruitment open/closed state.
 * Never leaks database details or internal state.
 */
export async function GET() {
  try {
    const settings = await getRecruitmentSettings();
    return NextResponse.json({
      success: true,
      isOpen: settings.isOpen,
    });
  } catch (error) {
    console.error("[GET /api/recruitment/status] Error fetching status:", error);
    // Fail closed
    return NextResponse.json({
      success: true,
      isOpen: false,
    });
  }
}
