import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedOrEnrollmentAdmin } from "@/lib/auth/session";
import { decryptTotpSecret, verifyTotpToken } from "@/lib/auth/totp";
import { prisma } from "@/lib/db/client";

export async function POST(request: NextRequest) {
  try {
    const admin = await getAuthenticatedOrEnrollmentAdmin();
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

    if (totpRecord.verified) {
      return NextResponse.json(
        { error: "TOTP authenticator is already verified." },
        { status: 409 }
      );
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
