"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronDown, KeyRound, ShieldAlert } from "lucide-react";

function LoginForm() {
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");
  const callbackUrl = searchParams.get("callbackUrl") || "/admin/dashboard";

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    errorParam === "inactive"
      ? "Your administrator account is inactive. Please contact the IT administrator."
      : null
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError(null);

    try {
      const res = await signIn("email", {
        email: email.trim().toLowerCase(),
        callbackUrl,
        redirect: true,
      });

      if (res?.error) {
        setError("Failed to send magic link. Ensure you are an authorized administrator.");
        setLoading(false);
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md space-y-6 rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          CCF Administration
        </h1>
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
            Email
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

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-slate-900 text-white hover:bg-slate-800"
        >
          {loading ? "Sending link..." : "Send Magic Link"}
        </Button>
      </form>

      {/* Secondary sign-in methods disclosure */}
      <div className="pt-2">
        <details className="group border-t border-slate-200/80 pt-4">
          <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors select-none">
            <span>Other sign-in methods</span>
            <ChevronDown className="h-4 w-4 text-slate-400 transition-transform duration-200 group-open:rotate-180" />
          </summary>
          <div className="mt-3 space-y-2 pt-1 text-center text-sm">
            <div>
              <Link
                href="/admin/auth/totp"
                className="flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              >
                <KeyRound className="h-3.5 w-3.5 text-slate-500" />
                <span>Authenticator app</span>
              </Link>
            </div>
            <div>
              <Link
                href="/admin/auth/recovery"
                className="flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              >
                <ShieldAlert className="h-3.5 w-3.5 text-slate-500" />
                <span>Recovery code</span>
              </Link>
            </div>
          </div>
        </details>
      </div>

      <div className="border-t border-slate-100 pt-3 text-center">
        <Link
          href="/admin/auth/bootstrap"
          className="text-xs text-slate-400 hover:text-slate-600 underline transition-colors"
        >
          First-time setup
        </Link>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <Suspense fallback={<div className="text-slate-500">Loading...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
