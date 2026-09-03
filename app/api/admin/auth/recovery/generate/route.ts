import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth/session";
import { generateAndStoreRecoveryCodes } from "@/lib/auth/recovery";

export async function POST() {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { plaintextCodes } = await generateAndStoreRecoveryCodes(admin.id);

    return NextResponse.json({
      codes: plaintextCodes,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate recovery codes";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
