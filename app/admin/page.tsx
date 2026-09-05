import { redirect } from "next/navigation";

/**
 * Root /admin entry point.
 * Redirects to the canonical dashboard route /admin/dashboard.
 * Middleware protection enforces authentication prior to page execution.
 */
export default function AdminRootPage() {
  redirect("/admin/dashboard");
}
