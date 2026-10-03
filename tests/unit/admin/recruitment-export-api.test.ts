import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/admin/recruitment/applications/export/route";
import { getCurrentAdmin } from "@/lib/auth/session";
import { AdminRole, RecruitmentStatus } from "@prisma/client";
import { getAdminRecruitmentApplications } from "@/lib/recruitment/service";
import { createAuditLog } from "@/lib/audit/log";

vi.mock("@/lib/auth/session");
vi.mock("@/lib/recruitment/service");
vi.mock("@/lib/audit/log", async () => {
  const actual = await vi.importActual<any>("@/lib/audit/log");
  return { ...actual, createAuditLog: vi.fn() };
});

describe("GET /api/admin/recruitment/applications/export", () => {
  const req = (params: string = "") => new Request(`http://localhost:3000/api/admin/recruitment/applications/export${params}`) as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("1. Unauthenticated request is rejected", async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValueOnce(null);
    const res = await GET(req());
    expect(res.status).toBe(401);
  });

  it("2. Non-admin request is rejected", async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValueOnce({ id: "user1", role: "UNKNOWN_ROLE" as any } as any);
    const res = await GET(req());
    expect(res.status).toBe(403);
  });

  it("3. Valid admin export succeeds and returns CSV", async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValueOnce({ id: "admin1", role: AdminRole.CCF_ADMIN } as any);
    vi.mocked(getAdminRecruitmentApplications).mockResolvedValueOnce([
      {
        id: "app1",
        name: "Test User",
        rrnNormalized: "23BXX1234",
        departmentId: "dept1",
        departmentName: "Finance",
        departmentSlug: "finance",
        academicDepartment: "Computer Science",
        year: "2nd Year",
        phone: "+911234567890",
        status: RecruitmentStatus.SELECTED,
        createdAt: "2026-10-03T21:41:00.000Z",
        updatedAt: "2026-10-03T21:41:00.000Z",
      },
    ]);

    const res = await GET(req("?departmentId=dept1&status=SELECTED&search=Test"));
    
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
    expect(res.headers.get("Content-Disposition")).toContain("attachment; filename=");
    expect(res.headers.get("Content-Disposition")).toContain("recruitment-applications");

    const text = await res.text();
    expect(text).toContain("Application ID,Name,RRN,Desired Department,Academic Department,Year,WhatsApp Contact,Status,Submitted At");
    expect(text).toContain("app1,Test User,23BXX1234,Finance,Computer Science,2nd Year,\"'+911234567890\",SELECTED,2026-10-03T21:41:00.000Z");

    expect(getAdminRecruitmentApplications).toHaveBeenCalledWith({
      departmentId: "dept1",
      status: RecruitmentStatus.SELECTED,
      search: "Test",
    });

    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: "admin1",
        entityType: "Recruitment",
                action: "RECRUITMENT_EXPORTED",
        metadata: expect.objectContaining({ count: 1, format: "CSV" }),
      })
    );
  });

  it("4. Empty dataset", async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValueOnce({ id: "admin1", role: AdminRole.CCF_ADMIN } as any);
    vi.mocked(getAdminRecruitmentApplications).mockResolvedValueOnce([]);

    const res = await GET(req());
    
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("Application ID,Name");
    
    // No data rows
    const lines = text.trim().split("\n");
    expect(lines.length).toBe(1); // Only header
  });

  it("5. Formula injection protection", async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValueOnce({ id: "admin1", role: AdminRole.CCF_ADMIN } as any);
    vi.mocked(getAdminRecruitmentApplications).mockResolvedValueOnce([
      {
        id: "app2",
        name: "=cmd|' /C calc'!A0",
        rrnNormalized: "+23BXX1234",
        departmentId: "dept1",
        departmentName: "-Finance",
        departmentSlug: "finance",
        academicDepartment: "@CS",
        year: "\t2nd Year",
        phone: "+911234567890",
        status: RecruitmentStatus.ACTIVE,
        createdAt: "2026-10-03T21:41:00.000Z",
        updatedAt: "2026-10-03T21:41:00.000Z",
      },
    ]);

    const res = await GET(req());
    const text = await res.text();
    
    expect(text).toContain("'=cmd");
    expect(text).toContain("'+23BXX1234");
    expect(text).toContain("'-Finance");
    expect(text).toContain("'@CS");
  });
});
