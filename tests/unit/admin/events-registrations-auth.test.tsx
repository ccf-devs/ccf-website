import { describe, it, expect, vi, beforeEach } from "vitest";
import AdminEventsPage from "@/app/admin/events/page";
import CreateEventPage from "@/app/admin/events/new/page";
import AdminRegistrationsPage from "@/app/admin/registrations/page";
import { getCurrentAdmin } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { AdminRole } from "@prisma/client";
import { prisma } from "@/lib/db/client";

vi.mock("@/lib/auth/session", () => ({
  getCurrentAdmin: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    event: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    registration: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

vi.mock("@/components/admin", () => ({
  AdminShell: ({ children }: any) => <div>{children}</div>,
  AdminPageHeader: () => <div>Header</div>,
  DashboardErrorState: () => <div>Error</div>,
}));

vi.mock("@/components/admin/events", () => ({
  EventListTable: () => <div>Events Table</div>,
  EventForm: () => <div>Event Form</div>,
}));

vi.mock("@/components/admin/registrations/registration-list-table", () => ({
  RegistrationListTable: () => <div>Registrations Table</div>,
}));

describe("SEC-006: Admin Events and Registrations Authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("AdminEventsPage", () => {
    it("redirects to login when getCurrentAdmin returns null (unauthenticated or restricted session)", async () => {
      vi.mocked(getCurrentAdmin).mockResolvedValue(null);

      await AdminEventsPage();

      expect(redirect).toHaveBeenCalledWith(
        "/admin/auth/login?callbackUrl=/admin/events"
      );
    });

    it("renders page when getCurrentAdmin returns active administrator", async () => {
      vi.mocked(getCurrentAdmin).mockResolvedValue({
        id: "admin-1",
        email: "cyberrohith07@gmail.com",
        name: "Rohith",
        role: AdminRole.IT_ADMIN,
      });

      const jsx = await AdminEventsPage();
      expect(redirect).not.toHaveBeenCalled();
      expect(jsx).toBeDefined();
    });
  });

  describe("CreateEventPage", () => {
    it("redirects to login when getCurrentAdmin returns null", async () => {
      vi.mocked(getCurrentAdmin).mockResolvedValue(null);

      await CreateEventPage();

      expect(redirect).toHaveBeenCalledWith(
        "/admin/auth/login?callbackUrl=/admin/events/new"
      );
    });
  });

  describe("AdminRegistrationsPage", () => {
    it("redirects to login when getCurrentAdmin returns null", async () => {
      vi.mocked(getCurrentAdmin).mockResolvedValue(null);

      await AdminRegistrationsPage();

      expect(redirect).toHaveBeenCalledWith(
        "/admin/auth/login?callbackUrl=/admin/registrations"
      );
    });

    it("renders registrations page for active administrator", async () => {
      vi.mocked(getCurrentAdmin).mockResolvedValue({
        id: "admin-2",
        email: "developers.ccf@gmail.com",
        name: "CCF Admin",
        role: AdminRole.CCF_ADMIN,
      });

      const jsx = await AdminRegistrationsPage();
      expect(redirect).not.toHaveBeenCalled();
      expect(jsx).toBeDefined();
    });
  });
});
