import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/config";
import { prisma } from "@/lib/db/client";
import { AdminRole } from "@prisma/client";

export interface AuthenticatedAdmin {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
}

/**
 * Retrieves the current authenticated administrator from the server session
 * AND re-validates against the database to ensure the administrator is currently active.
 *
 * This mitigates the stateless JWT revocation window:
 * If an admin is deactivated in the DB, any subsequent request to protected APIs
 * or server components immediately rejects them.
 */
export async function getCurrentAdmin(): Promise<AuthenticatedAdmin | null> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.email) {
    return null;
  }

  // Authoritative server-side re-check from database
  const admin = await prisma.adminUser.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
    },
  });

  if (!admin || !admin.active) {
    return null;
  }

  return {
    id: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role,
  };
}

/**
 * Requires an active authenticated administrator.
 * Throws an Error if unauthenticated or inactive.
 */
export async function requireAdmin(): Promise<AuthenticatedAdmin> {
  const admin = await getCurrentAdmin();
  if (!admin) {
    throw new Error("UNAUTHORIZED: Active administrator session required.");
  }
  return admin;
}

/**
 * Requires an active administrator with one of the specified roles.
 * Throws an Error if unauthenticated, inactive, or unauthorized.
 */
export async function requireRole(allowedRoles: AdminRole[]): Promise<AuthenticatedAdmin> {
  const admin = await requireAdmin();
  if (!allowedRoles.includes(admin.role)) {
    throw new Error("FORBIDDEN: Insufficient administrator role.");
  }
  return admin;
}

/**
 * Helper to check whether an admin has the IT_ADMIN role.
 */
export function isItAdmin(admin: AuthenticatedAdmin): boolean {
  return admin.role === AdminRole.IT_ADMIN;
}

/**
 * Helper to check whether an admin has the CCF_ADMIN role.
 */
export function isCcfAdmin(admin: AuthenticatedAdmin): boolean {
  return admin.role === AdminRole.CCF_ADMIN;
}
