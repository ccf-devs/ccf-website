import type { Adapter, AdapterUser, VerificationToken } from "next-auth/adapters";
import { prisma } from "@/lib/db/client";

/**
 * Normalizes an email address for consistent comparison.
 */
export function normalizeAdminEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Custom minimal Auth.js adapter backed exclusively by CCF's `admin_users`
 * and authentication-infrastructure `admin_verification_tokens` table.
 *
 * Requirements:
 * 1. Admin users must be pre-created by authorized IT/admin operations.
 * 2. Inactive admins cannot authenticate.
 * 3. Tokens are consumed atomically and never re-hashed inside adapter.
 * 4. No Auth.js users/accounts/sessions tables.
 */
export function createCcfAdminAdapter(): Adapter {
  return {
    async getUserByEmail(email: string): Promise<AdapterUser | null> {
      if (!email) return null;
      const normalizedEmail = normalizeAdminEmail(email);

      const admin = await prisma.adminUser.findUnique({
        where: { email: normalizedEmail },
      });

      if (!admin || !admin.active) {
        return null;
      }

      return {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        emailVerified: null,
        // Custom fields passed through to JWT callback
        role: admin.role,
        active: admin.active,
      } as unknown as AdapterUser;
    },

    async getUser(id: string): Promise<AdapterUser | null> {
      if (!id) return null;

      const admin = await prisma.adminUser.findUnique({
        where: { id },
      });

      if (!admin || !admin.active) {
        return null;
      }

      return {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        emailVerified: null,
        role: admin.role,
        active: admin.active,
      } as unknown as AdapterUser;
    },

    async createUser(_user: Omit<AdapterUser, "id">): Promise<AdapterUser> {
      // Defensive guarantee: admin accounts can NEVER be auto-created via sign-in.
      throw new Error("Admin accounts cannot be created through the authentication flow.");
    },

    async updateUser(user: Partial<AdapterUser> & Pick<AdapterUser, "id">): Promise<AdapterUser> {
      // Satisfies Auth.js callback requirement without adding emailVerified to admin_users.
      const admin = await prisma.adminUser.findUnique({
        where: { id: user.id },
      });

      if (!admin) {
        throw new Error("Cannot update non-existent admin user.");
      }

      return {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        emailVerified: null,
        role: admin.role,
        active: admin.active,
      } as unknown as AdapterUser;
    },

    async createVerificationToken(data: VerificationToken): Promise<VerificationToken | null> {
      // Auth.js passes the token already hashed via SHA-256(token + secret).
      // Stored as received. Do NOT hash again.
      const created = await prisma.adminVerificationToken.create({
        data: {
          identifier: normalizeAdminEmail(data.identifier),
          token: data.token,
          expires: data.expires,
        },
      });

      return {
        identifier: created.identifier,
        token: created.token,
        expires: created.expires,
      };
    },

    async useVerificationToken(params: { identifier: string; token: string }): Promise<VerificationToken | null> {
      const normalizedEmail = normalizeAdminEmail(params.identifier);

      // Atomically find and delete the token row to prevent replay
      try {
        const deleted = await prisma.adminVerificationToken.delete({
          where: {
            identifier_token: {
              identifier: normalizedEmail,
              token: params.token,
            },
          },
        });

        // Check if token expired
        if (deleted.expires.getTime() < Date.now()) {
          return null;
        }

        return {
          identifier: deleted.identifier,
          token: deleted.token,
          expires: deleted.expires,
        };
      } catch {
        // Record not found or already consumed
        return null;
      }
    },
  };
}
