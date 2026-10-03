import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/admin/departments/route";
import { DELETE } from "@/app/api/admin/departments/[id]/route";

import { getCurrentAdmin } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/audit/log";
import { prisma } from "@/lib/db/client";

vi.mock("@/lib/auth/session", () => ({
  getCurrentAdmin: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    department: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/audit/log", () => ({
  createAuditLog: vi.fn(),
  DEPARTMENT_AUDIT_ACTIONS: { INITIALIZED: "DEPARTMENT_INITIALIZED" }
}));

describe("POST /api/admin/departments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createRequest = (body: any) => {
    return new Request("http://localhost/api/admin/departments", {
      method: "POST",
      body: JSON.stringify(body),
    });
  };

  it("1. unauthorized access is rejected", async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(null);
    const req = createRequest({ name: "Test", slug: "test" });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("2. insufficient permissions (EVENT_ADMIN) is rejected", async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue({ id: "1", role: "EVENT_ADMIN" } as any);
    const req = createRequest({ name: "Test", slug: "test" });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("3. validation failure when missing required fields", async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue({ id: "1", role: "CCF_ADMIN" } as any);
    const req = createRequest({ name: "Test" }); // missing slug
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Department name and slug are required.");
  });

  it("4. duplicate slug/name handling", async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue({ id: "1", role: "CCF_ADMIN" } as any);
    vi.mocked(prisma.department.findUnique).mockResolvedValue({ id: "2", name: "Test" } as any); // mock duplicate
    const req = createRequest({ name: "Test", slug: "test" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("A department with this name or slug already exists.");
  });

  it("5. successful department creation with authorized admin", async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue({ id: "1", role: "IT_ADMIN" } as any);
    vi.mocked(prisma.department.findUnique).mockResolvedValue(null); // no duplicate
    vi.mocked(prisma.department.create).mockResolvedValue({ id: "new-dept", name: "Media", slug: "media" } as any);

    const req = createRequest({ name: "Media", slug: "media" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.department.id).toBe("new-dept");
    expect(prisma.department.create).toHaveBeenCalled();
  });
});


describe("DELETE /api/admin/departments/[id]", () => {
  const req = (id: string) => new Request(`http://localhost:3000/api/admin/departments/${id}`, { method: "DELETE" }) as any;

  it("fails if unauthorized", async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValueOnce({ id: "admin2", role: "EVENT_ADMIN" } as any);
    const res = await DELETE(req("dept-1"), { params: Promise.resolve({ id: "dept-1" }) });
    expect(res.status).toBe(403);
  });

  it("fails if department has assigned members", async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValueOnce({ id: "admin1", role: "CCF_ADMIN" } as any);
    prisma.department.delete = vi.fn();
    prisma.department.findUnique = vi.fn().mockResolvedValueOnce({
      id: "dept-1",
      name: "Advisory Board",
      _count: { members: 3 }
    });
    const res = await DELETE(req("dept-1"), { params: Promise.resolve({ id: "dept-1" }) });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Cannot delete");
    expect(data.error).toContain("3 assigned members");
    expect(prisma.department.delete).not.toHaveBeenCalled();
  });

  it("succeeds if empty and creates audit log", async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValueOnce({ id: "admin1", role: "CCF_ADMIN" } as any);
    prisma.department.findUnique = vi.fn().mockResolvedValueOnce({
      id: "dept-2",
      name: "Empty Dept",
      slug: "empty-dept",
      _count: { members: 0 }
    });
    prisma.department.delete = vi.fn().mockResolvedValueOnce({});

    const res = await DELETE(req("dept-2"), { params: Promise.resolve({ id: "dept-2" }) });
    expect(res.status).toBe(200);

    expect(prisma.department.delete).toHaveBeenCalledWith({ where: { id: "dept-2" } });
    expect(createAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: "DEPARTMENT_DELETED",
      entityId: "dept-2",
      metadata: expect.objectContaining({
        departmentName: "Empty Dept"
      })
    }));
  });
});
