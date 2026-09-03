import type { NextAuthOptions } from "next-auth";
import type { EmailConfig } from "next-auth/providers/email";
import CredentialsProvider from "next-auth/providers/credentials";
import { createCcfAdminAdapter, normalizeAdminEmail } from "@/lib/auth/adapter";
import { sendMagicLinkEmail } from "@/lib/auth/email";
import { decryptTotpSecret, verifyTotpToken } from "@/lib/auth/totp";
import { verifyAndConsumeRecoveryCode } from "@/lib/auth/recovery";
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
        });

        if (!admin || !admin.active) {
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
  ],

  callbacks: {
    async signIn({ user }) {
      // Reject any user without an explicit active status
      if (!user) return false;
      const customUser = user as { active?: boolean };
      if (customUser.active === false) {
        return false;
      }
      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        const customUser = user as { role?: AdminRole; active?: boolean };
        token.id = user.id;
        token.role = customUser.role as AdminRole;
        token.active = customUser.active ?? true;
      }
      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as AdminRole;
        session.user.active = (token.active as boolean) ?? true;
      }
      return session;
    },
  },
};
