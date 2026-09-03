import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth/session";
import { decryptTotpSecret, verifyTotpToken } from "@/lib/auth/totp";
import { prisma } from "@/lib/db/client";

export async function POST(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { code } = body;

    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Authentication code is required" }, { status: 400 });
    }

    const totpRecord = await prisma.adminTotpSecret.findUnique({
      where: { adminId: admin.id },
    });

    if (!totpRecord) {
      return NextResponse.json({ error: "No TOTP enrollment in progress" }, { status: 404 });
    }

    const plainSecret = decryptTotpSecret(totpRecord.secret);
    const isValid = verifyTotpToken(code, plainSecret);

    if (!isValid) {
      return NextResponse.json({ error: "Invalid code. Please try again." }, { status: 400 });
    }

    await prisma.adminTotpSecret.update({
      where: { adminId: admin.id },
      data: { verified: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to verify TOTP";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
