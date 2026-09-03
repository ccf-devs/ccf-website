import Link from "next/link";

export default function AdminVerifyPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-slate-200 bg-white p-8 shadow-sm text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
          <svg
            className="h-6 w-6 text-slate-700"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Check your email
        </h1>

        <p className="text-sm text-slate-600 leading-relaxed">
          A secure sign-in link has been sent to your administrator email address.
          The link is valid for <strong>10 minutes</strong> and can only be used once.
        </p>

        <div className="rounded-md bg-slate-50 p-4 text-xs text-slate-500 text-left border border-slate-100">
          <p className="font-semibold text-slate-700 mb-1">Didn&apos;t receive the email?</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Verify you entered the authorized administrator email.</li>
            <li>Check your spam/junk folder.</li>
            <li>Or use the TOTP authenticator / recovery code option.</li>
          </ul>
        </div>

        <div className="pt-2">
          <Link
            href="/admin/auth/login"
            className="text-sm font-medium text-slate-700 hover:text-slate-900 underline"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
