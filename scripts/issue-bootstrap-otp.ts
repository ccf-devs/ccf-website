import { PrismaClient } from "@prisma/client";
import { normalizeAdminEmail } from "../lib/auth/adapter";
import { issueBootstrapOtp } from "../lib/auth/bootstrap";
import { parseAndValidateTestDatabaseUrl } from "./verify-test-db";

export interface TargetDbInfo {
  environment: "TEST" | "PRODUCTION" | "UNKNOWN";
  host: string;
  port: number;
  database: string;
  sanitizedTarget: string;
  url: string;
}

/**
 * Resolves the effective target database using the exact URL that Prisma will use.
 * Rejection criteria:
 * - Missing or invalid URL format.
 * - Non-postgres protocol.
 * - Missing database name.
 */
export function resolveEffectiveDatabaseTarget(options?: {
  rawUrl?: string;
  isTestFlag?: boolean;
}): TargetDbInfo {
  let targetUrl: string | undefined;

  if (options?.isTestFlag) {
    const testConfig = parseAndValidateTestDatabaseUrl();
    targetUrl = testConfig.url;
  } else if (options?.rawUrl !== undefined) {
    targetUrl = options.rawUrl;
  } else {
    targetUrl = process.env.DATABASE_URL;
  }

  if (!targetUrl || typeof targetUrl !== "string" || !targetUrl.trim()) {
    throw new Error(
      "[OPERATOR PREFLIGHT FAILURE] DATABASE_URL is not configured or is empty. Cannot determine database target."
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(targetUrl.trim());
  } catch {
    throw new Error(
      "[OPERATOR PREFLIGHT FAILURE] DATABASE_URL is not a valid URL format. Refusing to proceed."
    );
  }

  if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") {
    throw new Error(
      `[OPERATOR PREFLIGHT FAILURE] Unsupported protocol '${parsed.protocol}'. Expected 'postgresql:'.`
    );
  }

  const host = parsed.hostname.toLowerCase();
  const port = parseInt(parsed.port || "5432", 10);
  const database = parsed.pathname.replace(/^\//, "");

  if (!database) {
    throw new Error(
      "[OPERATOR PREFLIGHT FAILURE] Database name is missing in connection URL."
    );
  }

  const isLoopback =
    host === "localhost" || host === "127.0.0.1" || host === "::1";
  const isTestDb = isLoopback && database === "ccf_e2e_test";

  let environment: "TEST" | "PRODUCTION" | "UNKNOWN" = "UNKNOWN";

  if (isTestDb) {
    environment = "TEST";
  } else if (!isLoopback) {
    environment = "PRODUCTION";
  } else {
    // Loopback host but database is not ccf_e2e_test
    environment = "UNKNOWN";
  }

  const sanitizedTarget = `${host}:${port}/${database}`;

  return {
    environment,
    host,
    port,
    database,
    sanitizedTarget,
    url: targetUrl.trim(),
  };
}

/**
 * Verifies that the required admin_bootstrap_otps table exists in the target database
 * before generating credentials or executing any mutations.
 */
export async function verifyBootstrapTablePreflight(
  prisma: PrismaClient,
  targetInfo: TargetDbInfo
): Promise<void> {
  try {
    const tableCheck = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'admin_bootstrap_otps'
      ) as "exists";
    `;

    if (!tableCheck || !tableCheck[0]?.exists) {
      throw new Error(
        `[OPERATOR PREFLIGHT FAILURE] Required table 'admin_bootstrap_otps' does not exist in target database (${targetInfo.sanitizedTarget}). ` +
          "Required migration '20261014003000_admin_bootstrap_otps' has not been applied. " +
          "Please run 'npx prisma migrate deploy' before issuing bootstrap credentials."
      );
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("OPERATOR PREFLIGHT FAILURE")) {
      throw err;
    }
    throw new Error(
      `[OPERATOR PREFLIGHT FAILURE] Unable to verify table schema on target (${targetInfo.sanitizedTarget}): ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }
}

/**
 * Core issuance command with rigorous preflight validation.
 */
export async function executeBootstrapOtpIssuance(params: {
  email: string;
  confirmProduction?: boolean;
  isTestMode?: boolean;
  rawUrl?: string;
  prismaClient?: PrismaClient;
}): Promise<{
  admin: { id: string; name: string; email: string; role: string };
  formattedOtp: string;
  expiresAt: Date;
  targetInfo: TargetDbInfo;
}> {
  const normalizedEmail = normalizeAdminEmail(params.email);

  // 1. Resolve and validate target database
  const targetInfo = resolveEffectiveDatabaseTarget({
    rawUrl: params.rawUrl,
    isTestFlag: params.isTestMode,
  });

  // Ensure process.env.DATABASE_URL matches the validated target for any downstream library calls
  process.env.DATABASE_URL = targetInfo.url;

  // 2. Production safety guard
  if (targetInfo.environment === "PRODUCTION" && !params.confirmProduction) {
    throw new Error(
      `[SAFETY GUARD REJECTION] Target database is a remote/production instance (${targetInfo.sanitizedTarget}). ` +
        "Issuing an OTP for a production administrator requires the explicit '--confirm-production' flag."
    );
  }

  // 3. Ambiguous target guard
  if (targetInfo.environment === "UNKNOWN") {
    throw new Error(
      `[SAFETY GUARD REJECTION] Ambiguous target database (${targetInfo.sanitizedTarget}). ` +
        "Target must either be validated local test (ccf_e2e_test on loopback) or remote production with explicit confirmation."
    );
  }

  const prisma =
    params.prismaClient ??
    new PrismaClient({
      datasources: {
        db: { url: targetInfo.url },
      },
    });

  try {
    // 4. Preflight table check before any credential generation or invalidation
    await verifyBootstrapTablePreflight(prisma, targetInfo);

    // 5. Look up administrator
    const admin = await prisma.adminUser.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
      },
    });

    if (!admin) {
      throw new Error(
        `Administrator with email '${normalizedEmail}' not found in database (${targetInfo.sanitizedTarget}).`
      );
    }

    if (!admin.active) {
      throw new Error(
        `Administrator '${normalizedEmail}' is marked inactive. Activate account before issuing bootstrap OTP.`
      );
    }

    // SEC-007: Restrict bootstrap OTP issuance strictly to IT_ADMIN accounts
    if (admin.role !== "IT_ADMIN") {
      throw new Error(
        `Administrator '${normalizedEmail}' has role '${admin.role}'. Bootstrap OTPs can only be issued for IT_ADMIN accounts.`
      );
    }

    // 6. Generate and persist single-use bootstrap OTP
    const issued = await issueBootstrapOtp(admin.id, { expiresInMinutes: 15 });

    return {
      admin,
      formattedOtp: issued.formattedOtp,
      expiresAt: issued.expiresAt,
      targetInfo,
    };
  } finally {
    if (!params.prismaClient) {
      await prisma.$disconnect();
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const emailInput = args.find((arg) => !arg.startsWith("--"));
  const hasConfirmProduction = args.includes("--confirm-production");
  const hasTestFlag = args.includes("--test");

  if (!emailInput) {
    console.error("==================================================================");
    console.error(" CCF SECURE OPERATOR PROVISIONING — INITIAL BOOTSTRAP OTP ISSUANCE");
    console.error("==================================================================");
    console.error("Usage:");
    console.error("  Local test issuance:");
    console.error("    npx tsx scripts/issue-bootstrap-otp.ts <admin-email> --test");
    console.error("");
    console.error("  Production issuance (authorized operator only):");
    console.error("    npx tsx scripts/issue-bootstrap-otp.ts <admin-email> --confirm-production");
    console.error("==================================================================");
    process.exit(1);
  }

  const result = await executeBootstrapOtpIssuance({
    email: emailInput,
    confirmProduction: hasConfirmProduction,
    isTestMode: hasTestFlag,
  });

  console.log("==================================================================");
  console.log(" CCF SECURE OPERATOR PROVISIONING — INITIAL BOOTSTRAP OTP ISSUANCE");
  console.log("==================================================================");
  console.log(` Target Environment:  ${result.targetInfo.environment === "TEST" ? "LOCAL TEST (Isolated)" : "PRODUCTION (Remote)"}`);
  console.log(` Target Host:         ${result.targetInfo.host}`);
  console.log(` Target Port:         ${result.targetInfo.port}`);
  console.log(` Target Database:     ${result.targetInfo.database}`);
  console.log("------------------------------------------------------------------");
  console.log(` Administrator:       ${result.admin.name} <${result.admin.email}>`);
  console.log(` Role:                ${result.admin.role}`);
  console.log(` Initial OTP:         ${result.formattedOtp}`);
  console.log(` Expires At:          ${result.expiresAt.toISOString()} (15 minutes)`);
  console.log("------------------------------------------------------------------");
  console.log(" OPERATOR SECURITY NOTICE:");
  console.log(" 1. Deliver this one-time code to the administrator via a secure,");
  console.log("    encrypted out-of-band channel (e.g. Signal, in-person).");
  console.log(" 2. Plaintext code is NEVER stored in database or application logs.");
  console.log(" 3. Code will expire automatically in 15 minutes or after 5 attempts.");
  console.log(" 4. Administrator must navigate to /admin/auth/bootstrap to enroll.");
  console.log(" 5. DO NOT execute this command in automated CI/CD pipelines or shared");
  console.log("    terminal sessions where terminal history or logs are captured.");
  console.log("==================================================================\n");
}

if (require.main === module) {
  main().catch((err) => {
    console.error("[OPERATOR ERROR]", err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
