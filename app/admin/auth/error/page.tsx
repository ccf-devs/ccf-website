"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  let title = "Authentication Error";
  let description = "An unexpected error occurred during administrator authentication.";

  switch (error) {
    case "AccessDenied":
      title = "Access Denied";
      description = "Your email address is not registered as an active administrator or your account is inactive.";
      break;
    case "Verification":
      title = "Sign-in Link Expired or Used";
      description = "This sign-in link is either invalid, has expired (10-minute window), or has already been used. Please request a new link.";
      break;
    case "Configuration":
      title = "Server Configuration Error";
      description = "There is a configuration issue with the authentication service. Please contact the IT administrator.";
      break;
    case "CredentialsSignin":
      title = "Invalid Credentials";
      description = "The authentication code or email provided was incorrect or inactive.";
      break;
    case "SessionRequired":
      title = "Sign In Required";
      description = "Please sign in with your administrator account to access this page.";
      break;
    default:
      if (error) {
        description = `Error code: ${error}`;
      }
      break;
  }

  return (
    <div className="w-full max-w-md space-y-6 rounded-lg border border-red-200 bg-white p-8 shadow-sm text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
        <svg
          className="h-6 w-6 text-red-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>

      <h1 className="text-2xl font-bold tracking-tight text-slate-900">
        {title}
      </h1>

      <p className="text-sm text-slate-600 leading-relaxed">
        {description}
      </p>

      <div className="pt-4">
        <Link
          href="/admin/auth/login"
          className="inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Return to Sign In
        </Link>
      </div>
    </div>
  );
}

export default function AdminAuthErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <Suspense fallback={<div className="text-slate-500">Loading...</div>}>
        <AuthErrorContent />
      </Suspense>
    </div>
  );
}
