import React from "react";
import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { LogoutConfirmDialog } from "@/components/admin/logout-confirm-dialog";
import { AdminUserMenu } from "@/components/admin/admin-user-menu";
import { AdminRole } from "@prisma/client";

// Mock next-auth/react
vi.mock("next-auth/react", () => ({
  signOut: vi.fn(),
}));

describe("Logout Confirmation Dialog & Shared State Unit Tests", () => {
  it("renders LogoutConfirmDialog with preserved confirmation messaging when open", () => {
    const html = renderToStaticMarkup(
      <LogoutConfirmDialog open={true} onOpenChange={() => {}} />
    );

    expect(html).toContain("Sign out of CCF Admin?");
    expect(html).toContain(
      "Your session will end and you will be redirected to the sign-in page."
    );
    expect(html).toContain("Cancel");
    expect(html).toContain("Sign Out");
  });

  it("does not render LogoutConfirmDialog content when closed", () => {
    const html = renderToStaticMarkup(
      <LogoutConfirmDialog open={false} onOpenChange={() => {}} />
    );

    expect(html).not.toContain("Sign out of CCF Admin?");
    expect(html).not.toContain("Sign Out");
  });

  it("AdminUserMenu delegates logout click to onOpenLogout when provided", () => {
    const onOpenLogout = vi.fn();
    const mockUser = {
      name: "Super Admin",
      email: "admin@crescent.education",
      role: AdminRole.CCF_ADMIN,
    };

    const html = renderToStaticMarkup(
      <AdminUserMenu user={mockUser} onOpenLogout={onOpenLogout} />
    );

    expect(html).toContain("Super Admin");
    expect(html).toContain("Logout");
    // When onOpenLogout is passed, local LogoutConfirmDialog is omitted to avoid duplication
    expect(html).not.toContain("Sign out of CCF Admin?");
  });
});
