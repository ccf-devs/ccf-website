"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

function RecoveryForm() {
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
      const res = await signIn("recovery", {
        email: email.trim().toLowerCase(),
        code: code.trim(),
        redirect: false,
        callbackUrl,
      });

      if (res?.error) {
        setError("Invalid recovery code or administrator email. The code may have already been used.");
        setLoading(false);
      } else if (res?.ok) {
        router.push(callbackUrl);
      }
    } catch {
      setError("An unexpected error occurred during recovery authentication.");
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md space-y-6 rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Break-Glass Recovery
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Enter your administrator email and one of your unused one-time recovery codes.
        </p>
      </div>

      <div className="rounded-md bg-amber-50 p-3 text-xs text-amber-800 border border-amber-200">
        <strong>Notice:</strong> Each recovery code can only be used once. Upon successful sign-in, the used code is permanently deleted.
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
            One-Time Recovery Code
          </label>
          <input
            id="code"
            type="text"
            required
            autoComplete="off"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="XXXXX-XXXXX"
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-center text-lg font-mono uppercase tracking-wider text-slate-900 shadow-sm focus:border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800"
          />
        </div>

        <Button
          type="submit"
          disabled={loading || !code.trim()}
          className="w-full bg-slate-900 text-white hover:bg-slate-800"
        >
          {loading ? "Verifying Recovery Code..." : "Verify & Sign In"}
        </Button>
      </form>

      <div className="text-center text-sm pt-2">
        <Link
          href="/admin/auth/login"
          className="font-medium text-slate-700 hover:text-slate-900 underline"
        >
          Back to regular sign in
        </Link>
      </div>
    </div>
  );
}

export default function AdminRecoveryPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <Suspense fallback={<div className="text-slate-500">Loading...</div>}>
        <RecoveryForm />
      </Suspense>
    </div>
  );
}
