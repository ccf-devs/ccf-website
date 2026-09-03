"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

function TotpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/admin/dashboard";

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !code) return;

    setLoading(true);
    setError(null);

    try {
      const res = await signIn("totp", {
        email: email.trim().toLowerCase(),
        code: code.trim(),
        redirect: false,
        callbackUrl,
      });

      if (res?.error) {
        setError("Invalid code or administrator email. Ensure TOTP is enrolled.");
        setLoading(false);
      } else if (res?.ok) {
        router.push(callbackUrl);
      }
    } catch {
      setError("An unexpected error occurred during TOTP verification.");
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md space-y-6 rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          TOTP Authenticator
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Enter your administrator email and the 6-digit code from your authenticator app.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 border border-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-slate-700"
          >
            Administrator Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@crescent.education"
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800 sm:text-sm"
          />
        </div>

        <div>
          <label
            htmlFor="code"
            className="block text-sm font-medium text-slate-700"
          >
            6-Digit Authenticator Code
          </label>
          <input
            id="code"
            type="text"
            required
            pattern="[0-9]{6}"
            maxLength={6}
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="123456"
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-center text-lg font-mono tracking-widest text-slate-900 shadow-sm focus:border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800"
          />
        </div>

        <Button
          type="submit"
          disabled={loading || code.length !== 6}
          className="w-full bg-slate-900 text-white hover:bg-slate-800"
        >
          {loading ? "Verifying Code..." : "Verify Code & Sign In"}
        </Button>
      </form>

      <div className="space-y-2 text-center text-sm pt-2">
        <div>
          <Link
            href="/admin/auth/login"
            className="font-medium text-slate-700 hover:text-slate-900 underline"
          >
            Sign in via Magic Link instead
          </Link>
        </div>
        <div>
          <Link
            href="/admin/auth/recovery"
            className="font-medium text-slate-500 hover:text-slate-700 underline text-xs"
          >
            Use Break-Glass Recovery Code
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AdminTotpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <Suspense fallback={<div className="text-slate-500">Loading...</div>}>
        <TotpForm />
      </Suspense>
    </div>
  );
}
