import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as getRecruitmentStatusHandler } from "@/app/api/recruitment/status/route";
import { POST as postRecruitmentApplicationHandler } from "@/app/api/recruitment/applications/route";
import {
  GET as getAdminRecruitmentSettingsHandler,
  PATCH as patchAdminRecruitmentSettingsHandler,
} from "@/app/api/admin/recruitment/route";
import { GET as getAdminRecruitmentApplicationsHandler } from "@/app/api/admin/recruitment/applications/route";
import {
  PATCH as patchAdminApplicationHandler,
  DELETE as deleteAdminApplicationHandler,
} from "@/app/api/admin/recruitment/applications/[id]/route";
import { getCurrentAdmin } from "@/lib/auth/session";
import { AdminRole, RecruitmentStatus } from "@prisma/client";
import * as recruitmentService from "@/lib/recruitment/service";
import {
  RecruitmentErrorCode,
  RecruitmentDomainError,
} from "@/lib/recruitment/types";

vi.mock("@/lib/auth/session", () => ({
  getCurrentAdmin: vi.fn(),
}));

vi.mock("@/lib/recruitment/service", () => ({
  getRecruitmentSettings: vi.fn(),
  updateRecruitmentSettings: vi.fn(),
  submitRecruitmentApplication: vi.fn(),
  getAdminRecruitmentApplications: vi.fn(),
  getAdminRecruitmentApplicationById: vi.fn(),
  updateApplicationStatusByAdmin: vi.fn(),
  deleteApplicationByAdmin: vi.fn(),
}));

describe("Recruitment API Routes Unit Tests", () => {
  const mockAdmin = {
    id: "admin-uuid-1",
    name: "Recruitment Admin",
    email: "admin@crescent.education",
    role: AdminRole.CCF_ADMIN,
    active: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. GET /api/recruitment/status", () => {
    it("returns 200 with isOpen boolean and strictly excludes whatsappGroupUrl", async () => {
      (recruitmentService.getRecruitmentSettings as any).mockResolvedValue({
        isOpen: true,
        whatsappGroupUrl: "https://chat.whatsapp.com/secret-invite",
      });

      const res = await getRecruitmentStatusHandler();
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.isOpen).toBe(true);
      // STRICT PRIVACY: Public status must NOT expose WhatsApp group link prematurely
      expect(json.whatsappGroupUrl).toBeUndefined();
    });

    it("fails closed on error and strictly omits whatsappGroupUrl", async () => {
      (recruitmentService.getRecruitmentSettings as any).mockRejectedValue(
        new Error("DB Down")
      );
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const res = await getRecruitmentStatusHandler();
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.isOpen).toBe(false);
      expect(json.whatsappGroupUrl).toBeUndefined();

      consoleErrorSpy.mockRestore();
    });
  });

  describe("2. POST /api/recruitment/applications", () => {
    const validBody = {
      name: "Student Name",
      rrn: "210071601050",
      departmentId: "dept-1",
      academicDepartment: "Mechanical",
      year: "3rd Year",
      phone: "9876543210",
    };

    it("returns 201 with confirmation on successful submission", async () => {
      (recruitmentService.submitRecruitmentApplication as any).mockResolvedValue({
        id: "app-uuid-1",
        name: "Student Name",
        departmentName: "Finance Management",
        status: RecruitmentStatus.ACTIVE,
        whatsappGroupUrl: "https://chat.whatsapp.com/test",
      });

      const req = new NextRequest(
        "http://localhost:3000/api/recruitment/applications",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validBody),
        }
      );

      const res = await postRecruitmentApplicationHandler(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.application.id).toBe("app-uuid-1");
      expect(json.application.name).toBe("Student Name");
    });

    it("returns domain error status code on duplicate submission", async () => {
      (recruitmentService.submitRecruitmentApplication as any).mockRejectedValue(
        new RecruitmentDomainError(
          "An active recruitment application already exists for this Crescent RRN.",
          RecruitmentErrorCode.DUPLICATE_APPLICATION,
          409
        )
      );

      const req = new NextRequest(
        "http://localhost:3000/api/recruitment/applications",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validBody),
        }
      );

      const res = await postRecruitmentApplicationHandler(req);
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.code).toBe("DUPLICATE_APPLICATION");
    });
  });

  describe("3. Admin Settings Endpoints", () => {
    it("GET /api/admin/recruitment rejects 401 if unauthenticated", async () => {
      (getCurrentAdmin as any).mockResolvedValue(null);
      const res = await getAdminRecruitmentSettingsHandler();
      expect(res.status).toBe(401);
    });

    it("GET /api/admin/recruitment returns 200 with settings when authenticated", async () => {
      (getCurrentAdmin as any).mockResolvedValue(mockAdmin);
      (recruitmentService.getRecruitmentSettings as any).mockResolvedValue({
        isOpen: true,
        whatsappGroupUrl: "https://chat.whatsapp.com/test",
      });

      const res = await getAdminRecruitmentSettingsHandler();
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.settings.isOpen).toBe(true);
    });

    it("PATCH /api/admin/recruitment rejects 401 if unauthenticated", async () => {
      (getCurrentAdmin as any).mockResolvedValue(null);
      const req = new NextRequest("http://localhost:3000/api/admin/recruitment", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isOpen: true }),
      });
      const res = await patchAdminRecruitmentSettingsHandler(req);
      expect(res.status).toBe(401);
    });

    it("PATCH /api/admin/recruitment updates settings when authenticated", async () => {
      (getCurrentAdmin as any).mockResolvedValue(mockAdmin);
      (recruitmentService.updateRecruitmentSettings as any).mockResolvedValue({
        isOpen: true,
        whatsappGroupUrl: "https://chat.whatsapp.com/test",
      });

      const req = new NextRequest("http://localhost:3000/api/admin/recruitment", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isOpen: true }),
      });

      const res = await patchAdminRecruitmentSettingsHandler(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.settings.isOpen).toBe(true);
    });
  });

  describe("4. Admin Applications Endpoints", () => {
    it("GET /api/admin/recruitment/applications rejects 401 if unauthenticated", async () => {
      (getCurrentAdmin as any).mockResolvedValue(null);
      const req = new NextRequest(
        "http://localhost:3000/api/admin/recruitment/applications"
      );
      const res = await getAdminRecruitmentApplicationsHandler(req);
      expect(res.status).toBe(401);
    });

    it("GET /api/admin/recruitment/applications returns 200 with list when authenticated", async () => {
      (getCurrentAdmin as any).mockResolvedValue(mockAdmin);
      (recruitmentService.getAdminRecruitmentApplications as any).mockResolvedValue(
        [
          {
            id: "app-1",
            name: "Student A",
            rrnNormalized: "210071601050",
            departmentName: "Finance Management",
            status: RecruitmentStatus.ACTIVE,
          },
        ]
      );

      const req = new NextRequest(
        "http://localhost:3000/api/admin/recruitment/applications"
      );
      const res = await getAdminRecruitmentApplicationsHandler(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.applications).toHaveLength(1);
    });

    it("PATCH /api/admin/recruitment/applications/[id] updates application status", async () => {
      (getCurrentAdmin as any).mockResolvedValue(mockAdmin);
      (recruitmentService.updateApplicationStatusByAdmin as any).mockResolvedValue({
        id: "app-1",
        status: RecruitmentStatus.SELECTED,
      });

      const req = new NextRequest(
        "http://localhost:3000/api/admin/recruitment/applications/app-1",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: RecruitmentStatus.SELECTED }),
        }
      );

      const res = await patchAdminApplicationHandler(req, {
        params: Promise.resolve({ id: "app-1" }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.application.status).toBe(RecruitmentStatus.SELECTED);
    });

    it("returns safe confirmation without WhatsApp group link when none configured", async () => {
      (recruitmentService.submitRecruitmentApplication as any).mockResolvedValue({
        id: "app-uuid-2",
        name: "Student Two",
        departmentName: "Event Management",
        status: RecruitmentStatus.ACTIVE,
        whatsappGroupUrl: null,
      });

      const req = new NextRequest(
        "http://localhost:3000/api/recruitment/applications",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Student Two",
            rrn: "210071601051",
            departmentId: "dept-2",
            academicDepartment: "Commerce",
            year: "1st Year",
            phone: "9876543211",
          }),
        }
      );

      const res = await postRecruitmentApplicationHandler(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.application.id).toBe("app-uuid-2");
      expect(json.application.whatsappGroupUrl).toBeNull();
    });

    it("DELETE /api/admin/recruitment/applications/[id] deletes application", async () => {
      (getCurrentAdmin as any).mockResolvedValue(mockAdmin);
      (recruitmentService.deleteApplicationByAdmin as any).mockResolvedValue({
        success: true,
      });

      const req = new NextRequest(
        "http://localhost:3000/api/admin/recruitment/applications/app-1",
        {
          method: "DELETE",
        }
      );

      const res = await deleteAdminApplicationHandler(req, {
        params: Promise.resolve({ id: "app-1" }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });

    it("enforces strict admin authorization and rejects non-admin roles with 403", async () => {
      const nonAdmin = {
        id: "user-1",
        name: "Regular User",
        email: "user@crescent.education",
        role: "STUDENT" as any,
        active: true,
      };
      (getCurrentAdmin as any).mockResolvedValue(nonAdmin);

      // GET settings
      const getSettingsRes = await getAdminRecruitmentSettingsHandler();
      expect(getSettingsRes.status).toBe(403);

      // GET applications
      const getAppsReq = new NextRequest(
        "http://localhost:3000/api/admin/recruitment/applications"
      );
      const getAppsRes = await getAdminRecruitmentApplicationsHandler(getAppsReq);
      expect(getAppsRes.status).toBe(403);

      // PATCH application
      const patchAppReq = new NextRequest(
        "http://localhost:3000/api/admin/recruitment/applications/app-1",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: RecruitmentStatus.SELECTED }),
        }
      );
      const patchAppRes = await patchAdminApplicationHandler(patchAppReq, {
        params: Promise.resolve({ id: "app-1" }),
      });
      expect(patchAppRes.status).toBe(403);

      // DELETE application
      const deleteAppReq = new NextRequest(
        "http://localhost:3000/api/admin/recruitment/applications/app-1",
        { method: "DELETE" }
      );
      const deleteAppRes = await deleteAdminApplicationHandler(deleteAppReq, {
        params: Promise.resolve({ id: "app-1" }),
      });
      expect(deleteAppRes.status).toBe(403);
    });

    it("parses and forwards limit and offset pagination parameters in applications query", async () => {
      (getCurrentAdmin as any).mockResolvedValue(mockAdmin);
      (recruitmentService.getAdminRecruitmentApplications as any).mockResolvedValue([]);

      const req = new NextRequest(
        "http://localhost:3000/api/admin/recruitment/applications?limit=25&offset=50&departmentId=dept-1&status=ACTIVE&search=tariq"
      );
      const res = await getAdminRecruitmentApplicationsHandler(req);
      expect(res.status).toBe(200);

      expect(recruitmentService.getAdminRecruitmentApplications).toHaveBeenCalledWith({
        departmentId: "dept-1",
        status: RecruitmentStatus.ACTIVE,
        search: "tariq",
        limit: 25,
        offset: 50,
      });
    });
  });
});
