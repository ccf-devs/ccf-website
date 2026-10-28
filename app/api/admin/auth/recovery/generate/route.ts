import { NextResponse } from "next/server";
import { getCurrentAdmin, getEnrollmentAdmin } from "@/lib/auth/session";
import { generateAndStoreRecoveryCodes } from "@/lib/auth/recovery";
import { prisma } from "@/lib/db/client";

export async function POST() {
  try {
    const standardAdmin = await getCurrentAdmin();
    const enrollmentAdmin = standardAdmin ? null : await getEnrollmentAdmin();
    const admin = standardAdmin || enrollmentAdmin;

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isRestrictedEnrollment = Boolean(enrollmentAdmin);

    // SEC-001: Enforce prerequisite that TOTP must be enrolled and verified
    // before recovery codes can be generated
    const totpRecord = await prisma.adminTotpSecret.findUnique({
      where: { adminId: admin.id },
      select: { verified: true },
    });

    if (!totpRecord || !totpRecord.verified) {
      return NextResponse.json(
        { error: "TOTP enrollment must be verified before generating recovery codes." },
        { status: 403 }
      );
    }

    // A restricted enrollment session is strictly permitted to generate initial recovery codes ONCE.
    // Prevent stale restricted sessions from regenerating or invalidating existing codes after onboarding.
    if (isRestrictedEnrollment) {
      const existingCodesCount = await prisma.adminRecoveryCode.count({
        where: { adminId: admin.id },
      });

      if (existingCodesCount > 0) {
        return NextResponse.json(
          { error: "Recovery codes have already been generated for this enrollment session." },
          { status: 409 }
        );
      }
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
