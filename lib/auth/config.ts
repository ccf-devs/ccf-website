import type { NextAuthOptions } from "next-auth";
import type { EmailConfig } from "next-auth/providers/email";
import CredentialsProvider from "next-auth/providers/credentials";
import { createCcfAdminAdapter, normalizeAdminEmail } from "@/lib/auth/adapter";
import { sendMagicLinkEmail } from "@/lib/auth/email";
import { decryptTotpSecret, verifyTotpToken } from "@/lib/auth/totp";
import { verifyAndConsumeRecoveryCode } from "@/lib/auth/recovery";
import { verifyAndRedeemBootstrapOtp } from "@/lib/auth/bootstrap";
import { prisma } from "@/lib/db/client";
import { AdminRole } from "@prisma/client";

export const authOptions: NextAuthOptions = {
  adapter: createCcfAdminAdapter(),
  session: {
    strategy: "jwt",
    // 8-hour session lifetime limits the stateless JWT revocation window
    maxAge: 8 * 60 * 60,
  },
  secret: process.env.AUTH_SECRET,
  pages: {
    signIn: "/admin/auth/login",
    verifyRequest: "/admin/auth/verify",
    error: "/admin/auth/error",
  },
  providers: [
    // 1. Primary Authentication: Magic Link via Resend
    {
      id: "email",
      type: "email",
      name: "Email",
      // Set to 600 seconds (10 minutes) verification window
      maxAge: 600,
      from: process.env.EMAIL_FROM || "CCF Auth <auth@crescentcluboffinance.com>",
      server: "",
      sendVerificationRequest: async ({ identifier, url, expires }) => {
        const normalizedEmail = normalizeAdminEmail(identifier);
        const admin = await prisma.adminUser.findUnique({
          where: { email: normalizedEmail },
          select: { role: true, active: true },
        });
        // SEC-004: Magic link email delivery is strictly reserved for CCF_ADMIN
        if (!admin || !admin.active || admin.role !== AdminRole.CCF_ADMIN) {
          return;
        }
        await sendMagicLinkEmail({ identifier, url, expires });
      },
      options: {},
    } as EmailConfig,

    // 2. Fallback Authentication: TOTP Authenticator
    CredentialsProvider({
      id: "totp",
      name: "TOTP Authenticator",
      credentials: {
        email: { label: "Email", type: "email" },
        code: { label: "Authentication Code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.code) {
          return null;
        }

        const normalizedEmail = normalizeAdminEmail(credentials.email);

        // Verify active administrator
        const admin = await prisma.adminUser.findUnique({
          where: { email: normalizedEmail },
          include: { totpSecret: true },
        });

        if (!admin || !admin.active) {
          return null;
        }

        // Must have an enrolled and verified TOTP secret
        if (!admin.totpSecret || !admin.totpSecret.verified) {
          return null;
        }

        // Decrypt and verify code
        try {
          const decryptedSecret = decryptTotpSecret(admin.totpSecret.secret);
          const isValid = verifyTotpToken(credentials.code, decryptedSecret);
          if (!isValid) {
            return null;
          }

          return {
            id: admin.id,
            email: admin.email,
            name: admin.name,
            role: admin.role,
            active: admin.active,
          };
        } catch {
          return null;
        }
      },
    }),

    // 3. Break-Glass Authentication: One-Time Recovery Codes
    CredentialsProvider({
      id: "recovery",
      name: "Recovery Code",
      credentials: {
        email: { label: "Email", type: "email" },
        code: { label: "Recovery Code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.code) {
          return null;
        }

        const normalizedEmail = normalizeAdminEmail(credentials.email);

        const admin = await prisma.adminUser.findUnique({
          where: { email: normalizedEmail },
          include: { totpSecret: true },
        });

        if (!admin || !admin.active) {
          return null;
        }

        // SEC-001: Recovery code authentication is only permitted for administrators
        // who have an enrolled and verified TOTP secret
        if (!admin.totpSecret || !admin.totpSecret.verified) {
          return null;
        }

        // Verify and atomically consume the one-time recovery code
        const isValid = await verifyAndConsumeRecoveryCode(admin.id, credentials.code);
        if (!isValid) {
          return null;
        }

        return {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
          active: admin.active,
        };
      },
    }),

    // 4. Initial Bootstrap Authentication: Single-Use Operator OTP
    CredentialsProvider({
      id: "bootstrap-otp",
      name: "Initial Bootstrap OTP",
      credentials: {
        email: { label: "Email", type: "email" },
        otp: { label: "Bootstrap OTP", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.otp) {
          return null;
        }

        const result = await verifyAndRedeemBootstrapOtp(
          credentials.email,
          credentials.otp
        );

        if (!result.success || !result.admin) {
          return null;
        }

        return {
          id: result.admin.id,
          email: result.admin.email,
          name: result.admin.name,
          role: result.admin.role,
          active: result.admin.active,
          isRestrictedEnrollment: true,
        };
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      // Reject any user without an explicit active status
      if (!user) return false;
      const customUser = user as { active?: boolean; role?: AdminRole };
      if (customUser.active === false) {
        return false;
      }
      // SEC-004: Strict role-specific authentication policy:
      // Magic link email sign-in is strictly reserved for CCF_ADMIN.
      // IT_ADMIN accounts must authenticate via TOTP authenticator (or recovery codes).
      if (account?.provider === "email" && customUser.role !== AdminRole.CCF_ADMIN) {
        return false;
      }
      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        const customUser = user as {
          role?: AdminRole;
          active?: boolean;
          isRestrictedEnrollment?: boolean;
        };
        token.id = user.id;
        token.role = customUser.role as AdminRole;
        token.active = customUser.active ?? true;
        token.isRestrictedEnrollment = customUser.isRestrictedEnrollment ?? false;
      }
      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as AdminRole;
        session.user.active = (token.active as boolean) ?? true;
        session.user.isRestrictedEnrollment =
          (token.isRestrictedEnrollment as boolean) ?? false;
      }
      return session;
    },
  },
};
