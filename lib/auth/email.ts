import { Resend } from "resend";

export interface SendVerificationEmailParams {
  identifier: string;
  url: string;
  expires: Date;
}

/**
 * Sends a Magic Link verification email via Resend.
 * Security:
 * - Does not log raw token or full magic link URL.
 * - Uses environment variables for API key and sender address.
 */
export async function sendMagicLinkEmail({
  identifier,
  url,
  expires,
}: SendVerificationEmailParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "CCF Auth <auth@crescentcluboffinance.com>";

  if (!apiKey) {
    if (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test") {
      // In dev or test without a real Resend API key, log notice without secrets
      console.warn("[AUTH] RESEND_API_KEY not configured. Email delivery skipped in non-production.");
      return;
    }
    throw new Error("RESEND_API_KEY is not configured.");
  }

  const resend = new Resend(apiKey);
  const minutesValid = Math.max(1, Math.round((expires.getTime() - Date.now()) / (60 * 1000)));

  const { error } = await resend.emails.send({
    from,
    to: identifier,
    subject: "Sign in to Crescent Club of Finance Admin",
    text: `Sign in to CCF Admin\n\nClick the link below to sign in:\n${url}\n\nThis link will expire in ${minutesValid} minutes.\nIf you did not request this link, you can safely ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #111827;">
        <h2 style="color: #0f172a; margin-bottom: 16px;">Crescent Club of Finance</h2>
        <p style="font-size: 16px; line-height: 24px;">Hello,</p>
        <p style="font-size: 16px; line-height: 24px;">Click the button below to sign in to the CCF Administration Platform.</p>
        <p style="margin: 28px 0;">
          <a href="${url}" style="background-color: #0f172a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">
            Sign in to Admin Dashboard
          </a>
        </p>
        <p style="font-size: 14px; color: #6b7280; line-height: 20px;">
          This link will expire in <strong>${minutesValid} minutes</strong> and can only be used once.
        </p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="font-size: 12px; color: #9ca3af;">
          If you did not request this link, please ignore this email.
        </p>
      </div>
    `,
  });

  if (error) {
    throw new Error(`Failed to send verification email: ${error.message}`);
  }
}
