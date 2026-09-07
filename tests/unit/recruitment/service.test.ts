import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getRecruitmentSettings,
  updateRecruitmentSettings,
  submitRecruitmentApplication,
  getAdminRecruitmentApplications,
  getAdminRecruitmentApplicationById,
  updateApplicationStatusByAdmin,
  deleteApplicationByAdmin,
} from "@/lib/recruitment/service";
import { RecruitmentErrorCode, RecruitmentDomainError } from "@/lib/recruitment/types";
import { RecruitmentStatus } from "@prisma/client";
import { prisma } from "@/lib/db/client";

// Mock Prisma
vi.mock("@/lib/db/client", () => ({
  prisma: {
    siteSetting: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    department: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    recruitmentApplication: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(prisma)),
  },
}));

describe("Recruitment Service Layer Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Settings Management", () => {
    it("getRecruitmentSettings returns default closed state if setting not found", async () => {
      (prisma.siteSetting.findUnique as any).mockResolvedValue(null);
      const settings = await getRecruitmentSettings();
      expect(settings.isOpen).toBe(false);
      expect(settings.whatsappGroupUrl).toBeNull();
    });

    it("getRecruitmentSettings returns stored configuration", async () => {
      (prisma.siteSetting.findUnique as any).mockResolvedValue({
        key: "recruitment_status",
        value: {
          isOpen: true,
          whatsappGroupUrl: "https://chat.whatsapp.com/test",
        },
      });
      const settings = await getRecruitmentSettings();
      expect(settings.isOpen).toBe(true);
      expect(settings.whatsappGroupUrl).toBe("https://chat.whatsapp.com/test");
    });

    it("getRecruitmentSettings fails closed on database exception", async () => {
      (prisma.siteSetting.findUnique as any).mockRejectedValue(
        new Error("Connection refused")
      );
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const settings = await getRecruitmentSettings();
      expect(settings.isOpen).toBe(false);
      expect(settings.whatsappGroupUrl).toBeNull();
      consoleErrorSpy.mockRestore();
    });

    it("updateRecruitmentSettings updates site_settings and writes audit log", async () => {
      (prisma.siteSetting.upsert as any).mockResolvedValue({
        key: "recruitment_status",
        value: {
          isOpen: true,
          whatsappGroupUrl: "https://chat.whatsapp.com/new",
        },
      });
      (prisma.auditLog.create as any).mockResolvedValue({ id: "audit-1" });

      const res = await updateRecruitmentSettings("admin-uuid-1", {
        isOpen: true,
        whatsappGroupUrl: "https://chat.whatsapp.com/new",
      });

      expect(res.isOpen).toBe(true);
      expect(res.whatsappGroupUrl).toBe("https://chat.whatsapp.com/new");
      expect(prisma.siteSetting.upsert).toHaveBeenCalled();
      expect(prisma.auditLog.create).toHaveBeenCalled();
    });

    it("updateRecruitmentSettings rejects if admin ID is missing", async () => {
      await expect(
        updateRecruitmentSettings("", { isOpen: true })
      ).rejects.toThrow(RecruitmentDomainError);
    });
  });

  describe("2. Application Intake & Business Rules", () => {
    const validDeptId = "11111111-2222-3333-4444-555555555555";
    const validAppInput = {
      name: "Ahmed Faraz",
      rrn: "210071601050",
      departmentId: validDeptId,
      academicDepartment: "Mechanical Engineering",
      year: "2nd Year",
      phone: "9876543210",
    };


    it("rejects application when recruitment is closed", async () => {
      (prisma.siteSetting.findUnique as any).mockResolvedValue({
        key: "recruitment_status",
        value: { isOpen: false },
      });

      await expect(submitRecruitmentApplication(validAppInput)).rejects.toThrow(
        "Recruitment is currently closed."
      );
    });

    it("rejects application when department does not exist", async () => {
      (prisma.siteSetting.findUnique as any).mockResolvedValue({
        key: "recruitment_status",
        value: { isOpen: true },
      });
      (prisma.department.findUnique as any).mockResolvedValue(null);

      await expect(submitRecruitmentApplication(validAppInput)).rejects.toThrow(
        "The selected CCF department does not exist."
      );
    });

    it("rejects application when department is inactive", async () => {
      (prisma.siteSetting.findUnique as any).mockResolvedValue({
        key: "recruitment_status",
        value: { isOpen: true },
      });
      (prisma.department.findUnique as any).mockResolvedValue({
        id: validDeptId,
        name: "Inactive Dept",
        active: false,
      });

      await expect(submitRecruitmentApplication(validAppInput)).rejects.toThrow(
        "The selected CCF department is currently not accepting applications."
      );
    });

    it("rejects application when active application already exists for RRN", async () => {
      (prisma.siteSetting.findUnique as any).mockResolvedValue({
        key: "recruitment_status",
        value: { isOpen: true },
      });
      (prisma.department.findUnique as any).mockResolvedValue({
        id: validDeptId,
        name: "Finance Management",
        active: true,
      });
      (prisma.recruitmentApplication.findFirst as any).mockResolvedValue({
        id: "existing-app-1",
        status: RecruitmentStatus.ACTIVE,
      });

      await expect(submitRecruitmentApplication(validAppInput)).rejects.toThrow(
        "An active recruitment application already exists for this Crescent RRN."
      );
    });

    it("handles concurrent race condition on database partial unique index (P2002)", async () => {
      (prisma.siteSetting.findUnique as any).mockResolvedValue({
        key: "recruitment_status",
        value: { isOpen: true },
      });
      (prisma.department.findUnique as any).mockResolvedValue({
        id: validDeptId,
        name: "Finance Management",
        active: true,
      });
      (prisma.recruitmentApplication.findFirst as any).mockResolvedValue(null);

      const p2002Error: any = new Error("Unique constraint failed");
      p2002Error.code = "P2002";
      (prisma.recruitmentApplication.create as any).mockRejectedValue(p2002Error);

      await expect(submitRecruitmentApplication(validAppInput)).rejects.toThrow(
        "An active recruitment application already exists for this Crescent RRN."
      );
    });

    it("successfully creates application and returns safe confirmation view without RRN or phone", async () => {
      (prisma.siteSetting.findUnique as any).mockResolvedValue({
        key: "recruitment_status",
        value: {
          isOpen: true,
          whatsappGroupUrl: "https://chat.whatsapp.com/test",
        },
      });
      (prisma.department.findUnique as any).mockResolvedValue({
        id: validDeptId,
        name: "Finance Management",
        active: true,
      });
      (prisma.recruitmentApplication.findFirst as any).mockResolvedValue(null);
      (prisma.recruitmentApplication.create as any).mockResolvedValue({
        id: "new-app-uuid",
        name: "Ahmed Faraz",
        departmentId: validDeptId,
        department: {
          name: "Finance Management",
        },
        status: RecruitmentStatus.ACTIVE,
        createdAt: new Date(),
      });

      const result = await submitRecruitmentApplication(validAppInput);

      expect(result.id).toBe("new-app-uuid");
      expect(result.name).toBe("Ahmed Faraz");
      expect(result.departmentName).toBe("Finance Management");
      expect(result.status).toBe(RecruitmentStatus.ACTIVE);
      expect(result.whatsappGroupUrl).toBe("https://chat.whatsapp.com/test");

      // Verify privacy: result MUST NOT contain rrn or phone
      expect((result as any).rrn).toBeUndefined();
      expect((result as any).rrnNormalized).toBeUndefined();
      expect((result as any).phone).toBeUndefined();
    });
  });

  describe("3. Status Management & Deletion", () => {
    it("supports all valid state machine transitions", async () => {
      const validTransitions = [
        { from: RecruitmentStatus.ACTIVE, to: RecruitmentStatus.SELECTED },
        { from: RecruitmentStatus.ACTIVE, to: RecruitmentStatus.REJECTED },
        { from: RecruitmentStatus.ACTIVE, to: RecruitmentStatus.WITHDRAWN },
        { from: RecruitmentStatus.SELECTED, to: RecruitmentStatus.ACTIVE },
        { from: RecruitmentStatus.SELECTED, to: RecruitmentStatus.REJECTED },
        { from: RecruitmentStatus.REJECTED, to: RecruitmentStatus.ACTIVE },
        { from: RecruitmentStatus.REJECTED, to: RecruitmentStatus.SELECTED },
        { from: RecruitmentStatus.WITHDRAWN, to: RecruitmentStatus.ACTIVE },
      ];

      for (const { from, to } of validTransitions) {
        vi.clearAllMocks();
        (prisma.recruitmentApplication.findUnique as any).mockResolvedValue({
          id: "app-1",
          status: from,
          rrnNormalized: "210071601050",
          department: { name: "Finance Management" },
        });
        (prisma.recruitmentApplication.findFirst as any).mockResolvedValue(null);
        (prisma.recruitmentApplication.update as any).mockResolvedValue({
          id: "app-1",
          rrnNormalized: "210071601050",
          name: "Student Name",
          departmentId: "dept-1",
          academicDepartment: "ECE",
          year: "2nd Year",
          phone: "+919876543210",
          status: to,
          createdAt: new Date(),
          updatedAt: new Date(),
          department: { id: "dept-1", name: "Finance Management", slug: "finance" },
        });
        (prisma.auditLog.create as any).mockResolvedValue({ id: "audit-1" });

        const res = await updateApplicationStatusByAdmin("app-1", "admin-1", {
          status: to,
        });

        expect(res.status).toBe(to);
        expect(prisma.recruitmentApplication.update).toHaveBeenCalledWith({
          where: { id: "app-1" },
          data: { status: to },
          include: expect.anything(),
        });
      }
    });

    it("same-status update is idempotent and does not write to DB", async () => {
      (prisma.recruitmentApplication.findUnique as any).mockResolvedValue({
        id: "app-1",
        status: RecruitmentStatus.SELECTED,
        rrnNormalized: "210071601050",
        name: "Student Name",
        departmentId: "dept-1",
        academicDepartment: "ECE",
        year: "2nd Year",
        phone: "+919876543210",
        createdAt: new Date(),
        updatedAt: new Date(),
        department: { id: "dept-1", name: "Finance Management", slug: "finance" },
      });

      const res = await updateApplicationStatusByAdmin("app-1", "admin-1", {
        status: RecruitmentStatus.SELECTED,
      });

      expect(res.status).toBe(RecruitmentStatus.SELECTED);
      expect(prisma.recruitmentApplication.update).not.toHaveBeenCalled();
      expect(prisma.auditLog.create).not.toHaveBeenCalled();
    });

    it("rejects invalid state transitions safely", async () => {
      const invalidTransitions = [
        { from: RecruitmentStatus.WITHDRAWN, to: RecruitmentStatus.SELECTED },
        { from: RecruitmentStatus.WITHDRAWN, to: RecruitmentStatus.REJECTED },
        { from: RecruitmentStatus.SELECTED, to: RecruitmentStatus.WITHDRAWN },
        { from: RecruitmentStatus.REJECTED, to: RecruitmentStatus.WITHDRAWN },
      ];

      for (const { from, to } of invalidTransitions) {
        vi.clearAllMocks();
        (prisma.recruitmentApplication.findUnique as any).mockResolvedValue({
          id: "app-1",
          status: from,
          rrnNormalized: "210071601050",
          department: { name: "Finance Management" },
        });

        await expect(
          updateApplicationStatusByAdmin("app-1", "admin-1", { status: to })
        ).rejects.toThrow(RecruitmentDomainError);
      }
    });

    it("reactivation fails safely when another ACTIVE application exists for the same RRN", async () => {
      (prisma.recruitmentApplication.findUnique as any).mockResolvedValue({
        id: "app-1",
        status: RecruitmentStatus.WITHDRAWN,
        rrnNormalized: "210071601050",
        department: { name: "Finance Management" },
      });
      // Competing active application found
      (prisma.recruitmentApplication.findFirst as any).mockResolvedValue({
        id: "app-2",
        status: RecruitmentStatus.ACTIVE,
        rrnNormalized: "210071601050",
      });

      await expect(
        updateApplicationStatusByAdmin("app-1", "admin-1", {
          status: RecruitmentStatus.ACTIVE,
        })
      ).rejects.toThrow(
        "Cannot reactivate this application because another active application already exists for this RRN."
      );
    });

    it("deleteApplicationByAdmin deletes application and emits audit log", async () => {
      (prisma.recruitmentApplication.findUnique as any).mockResolvedValue({
        id: "app-1",
        status: RecruitmentStatus.ACTIVE,
        department: { name: "Finance Management" },
      });
      (prisma.recruitmentApplication.delete as any).mockResolvedValue({
        id: "app-1",
      });
      (prisma.auditLog.create as any).mockResolvedValue({ id: "audit-1" });

      const res = await deleteApplicationByAdmin("app-1", "admin-1");
      expect(res.success).toBe(true);
      expect(prisma.recruitmentApplication.delete).toHaveBeenCalledWith({
        where: { id: "app-1" },
      });
      expect(prisma.auditLog.create).toHaveBeenCalled();
    });

    it("proves delete -> same RRN reapplication workflow", async () => {
      const rrn = "210071601099";
      const deptId = "11111111-2222-3333-4444-555555555555";
      const appInput = {
        name: "Aisha Begum",
        rrn,
        departmentId: deptId,
        academicDepartment: "Information Technology",
        year: "1st Year",
        phone: "9876543210",
      };

      // 1. Initial submission succeeds
      (prisma.siteSetting.findUnique as any).mockResolvedValue({
        key: "recruitment_status",
        value: { isOpen: true },
      });
      (prisma.department.findUnique as any).mockResolvedValue({
        id: deptId,
        name: "IT & Media",
        active: true,
      });
      (prisma.recruitmentApplication.findFirst as any).mockResolvedValueOnce(null);
      (prisma.recruitmentApplication.create as any).mockResolvedValueOnce({
        id: "first-app-uuid",
        name: "Aisha Begum",
        departmentId: deptId,
        department: { name: "IT & Media" },
        status: RecruitmentStatus.ACTIVE,
        createdAt: new Date(),
      });

      const firstApp = await submitRecruitmentApplication(appInput);
      expect(firstApp.id).toBe("first-app-uuid");

      // 2. Duplicate submission while ACTIVE is blocked
      (prisma.recruitmentApplication.findFirst as any).mockResolvedValueOnce({
        id: "first-app-uuid",
        status: RecruitmentStatus.ACTIVE,
      });
      await expect(submitRecruitmentApplication(appInput)).rejects.toThrow(
        "An active recruitment application already exists for this Crescent RRN."
      );

      // 3. Authorized Admin Deletes the application
      (prisma.recruitmentApplication.findUnique as any).mockResolvedValueOnce({
        id: "first-app-uuid",
        status: RecruitmentStatus.ACTIVE,
        department: { name: "IT & Media" },
      });
      (prisma.recruitmentApplication.delete as any).mockResolvedValueOnce({
        id: "first-app-uuid",
      });
      (prisma.auditLog.create as any).mockResolvedValueOnce({ id: "audit-del-1" });

      const delRes = await deleteApplicationByAdmin("first-app-uuid", "admin-1");
      expect(delRes.success).toBe(true);

      // 4. Same RRN submits new application after deletion
      (prisma.recruitmentApplication.findFirst as any).mockResolvedValueOnce(null);
      (prisma.recruitmentApplication.create as any).mockResolvedValueOnce({
        id: "second-app-uuid",
        name: "Aisha Begum",
        departmentId: deptId,
        department: { name: "IT & Media" },
        status: RecruitmentStatus.ACTIVE,
        createdAt: new Date(),
      });

      const secondApp = await submitRecruitmentApplication(appInput);
      expect(secondApp.id).toBe("second-app-uuid");
      expect(secondApp.id).not.toBe(firstApp.id);
      expect(prisma.auditLog.create).toHaveBeenCalled();
    });
  });
});
