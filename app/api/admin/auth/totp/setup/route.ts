import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth/session";
import {
  generateTotpSecret,
  encryptTotpSecret,
  generateOtpauthUri,
  generateQrCodeDataUrl,
} from "@/lib/auth/totp";
import { prisma } from "@/lib/db/client";

export async function POST() {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secret = generateTotpSecret();
    const encryptedSecret = encryptTotpSecret(secret);
    const otpauthUri = generateOtpauthUri(admin.email, secret);
    const qrCodeDataUrl = await generateQrCodeDataUrl(otpauthUri);

    // Upsert unverified secret for enrollment
    await prisma.adminTotpSecret.upsert({
      where: { adminId: admin.id },
      create: {
        adminId: admin.id,
        secret: encryptedSecret,
        verified: false,
      },
      update: {
        secret: encryptedSecret,
        verified: false,
      },
    });

    return NextResponse.json({
      otpauthUri,
      qrCodeDataUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to initiate TOTP setup";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
