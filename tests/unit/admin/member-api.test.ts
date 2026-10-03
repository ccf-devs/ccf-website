import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/admin/members/route";
import { PATCH } from "@/app/api/admin/members/[id]/route";
import { DELETE } from "@/app/api/admin/members/[id]/route";
import { getCurrentAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";

vi.mock("@/lib/auth/session", () => ({
  getCurrentAdmin: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    member: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    department: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/audit/log", () => ({
  createAuditLog: vi.fn(),
  MEMBER_AUDIT_ACTIONS: { CREATED: "MEMBER_CREATED", UPDATED: "MEMBER_UPDATED" }
}));

describe("Member API - Department Nullability and Deletion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockAdmin = { id: "1", role: "CCF_ADMIN" };

  it("1. Normal member with department still works", async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(mockAdmin as any);
    vi.mocked(prisma.member.create).mockResolvedValue({ id: "m1", departmentId: "123e4567-e89b-12d3-a456-426614174000" } as any);
    
    vi.mocked(prisma.department.findUnique).mockResolvedValue({ id: "123e4567-e89b-12d3-a456-426614174000", active: true } as any);
    const req = (new Request("http://localhost/api/admin/members", {
      method: "POST",
      body: JSON.stringify({ name: "Alice", departmentId: "123e4567-e89b-12d3-a456-426614174000" }),
    }) as any);
    
    const res = await POST(req);
    expect(res.status).toBe(201); // 1. Normal member
    expect(prisma.member.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ departmentId: "123e4567-e89b-12d3-a456-426614174000" })
    }));
  });

  it("2. Leadership member with no department can be created", async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(mockAdmin as any);
    vi.mocked(prisma.member.create).mockResolvedValue({ id: "m2", departmentId: null } as any);
    
    const req = (new Request("http://localhost/api/admin/members", {
      method: "POST",
      // departmentId is not sent, or is null
      body: JSON.stringify({ name: "President Bob", departmentId: null }),
    }) as any);
    
    const res = await POST(req);
    expect(res.status).toBe(201);
    expect(prisma.member.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ departmentId: undefined })
    }));
  });

  it("3. Leadership member with no department can be edited", async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(mockAdmin as any);
    vi.mocked(prisma.member.findUnique).mockResolvedValue({ id: "m3", name: "President Bob", departmentId: null } as any);
    vi.mocked(prisma.member.update).mockResolvedValue({ id: "m3", departmentId: null, position: "VP" } as any);
    
    const req = (new Request("http://localhost/api/admin/members/m3", {
      method: "PATCH",
      body: JSON.stringify({ position: "VP", departmentId: null }),
    }) as any);
    
    const res = await PATCH(req, { params: Promise.resolve({ id: "m3" }) });
    expect(res.status).toBe(200);
    expect(prisma.member.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ position: "VP" })
    }));
  });

  it("4. Unauthorized deletion is rejected", async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue({ id: "2", role: "EVENT_ADMIN" } as any);
    const req = (new Request("http://localhost/api/admin/members/m1", { method: "DELETE" }) as any);
    const res = await DELETE(req, { params: Promise.resolve({ id: "m1" }) });
    expect(res.status).toBe(403);
  });

  it("5. Invalid/nonexistent member ID on deletion", async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(mockAdmin as any);
    vi.mocked(prisma.member.findUnique).mockResolvedValue(null);
    const req = (new Request("http://localhost/api/admin/members/bad-id", { method: "DELETE" }) as any);
    const res = await DELETE(req, { params: Promise.resolve({ id: "bad-id" }) });
    expect(res.status).toBe(404);
  });

  it("6. Authorized deletion performs hard delete safely and audits", async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(mockAdmin as any);
    vi.mocked(prisma.member.findUnique).mockResolvedValue({ id: "m1", name: "Alice" } as any);
    const req = (new Request("http://localhost/api/admin/members/m1", { method: "DELETE" }) as any);
    const res = await DELETE(req, { params: Promise.resolve({ id: "m1" }) });
    expect(res.status).toBe(200);
    
    expect(prisma.member.delete).toHaveBeenCalledWith({ where: { id: "m1" } });
  });
});
