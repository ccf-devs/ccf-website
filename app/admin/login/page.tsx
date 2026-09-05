import { redirect } from "next/navigation";

/**
 * Convenience redirect for /admin/login.
 * Redirects to the canonical Auth.js login route: /admin/auth/login.
 */
export default function AdminLoginRedirectPage() {
  redirect("/admin/auth/login");
}
