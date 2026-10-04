import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { AdminRole } from "@prisma/client";
import * as authSession from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import * as b2Storage from "@/lib/storage/b2";
import { GET as getAdminMediaPreview } from "@/app/api/admin/media/[id]/preview/route";
import { Readable } from "stream";

vi.mock("@/lib/auth/session", () => ({
  getCurrentAdmin: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    media: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/storage/b2", () => ({
  getMediaObject: vi.fn(),
}));

describe("Admin Media Preview API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mediaId = "44444444-4444-4444-4444-444444444444";
  
  const mockAdminUser = {
    id: "admin-uuid-1",
    email: "developers.ccf@gmail.com",
    name: "CCF Devs",
    role: AdminRole.CCF_ADMIN,
  };

  it("rejects unauthenticated requests with 401", async () => {
    vi.mocked(authSession.getCurrentAdmin).mockResolvedValue(null);

    const req = new NextRequest(`http://localhost/api/admin/media/${mediaId}/preview`);
    const res = await getAdminMediaPreview(req, { params: Promise.resolve({ id: mediaId }) });
    expect(res.status).toBe(401);
  });

  it("rejects unauthorized non-admin roles with 403", async () => {
    vi.mocked(authSession.getCurrentAdmin).mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      name: "Regular User",
      role: "MEMBER" as any,
    });

    const req = new NextRequest(`http://localhost/api/admin/media/${mediaId}/preview`);
    const res = await getAdminMediaPreview(req, { params: Promise.resolve({ id: mediaId }) });
    expect(res.status).toBe(403);
  });

  it("returns 404 if media record does not exist in DB", async () => {
    vi.mocked(authSession.getCurrentAdmin).mockResolvedValue(mockAdminUser);
    vi.mocked(prisma.media.findUnique).mockResolvedValue(null);

    const req = new NextRequest(`http://localhost/api/admin/media/${mediaId}/preview`);
    const res = await getAdminMediaPreview(req, { params: Promise.resolve({ id: mediaId }) });
    expect(res.status).toBe(404);
  });

  it("returns 404 if B2 object does not exist", async () => {
    vi.mocked(authSession.getCurrentAdmin).mockResolvedValue(mockAdminUser);
    vi.mocked(prisma.media.findUnique).mockResolvedValue({
      id: mediaId,
      objectKey: "hidden/photo.png",
      mimeType: "image/png",
    } as any);
    vi.mocked(b2Storage.getMediaObject).mockResolvedValue(null);

    const req = new NextRequest(`http://localhost/api/admin/media/${mediaId}/preview`);
    const res = await getAdminMediaPreview(req, { params: Promise.resolve({ id: mediaId }) });
    expect(res.status).toBe(404);
  });

  it("successfully streams hidden media with private cache headers", async () => {
    vi.mocked(authSession.getCurrentAdmin).mockResolvedValue(mockAdminUser);
    vi.mocked(prisma.media.findUnique).mockResolvedValue({
      id: mediaId,
      objectKey: "hidden/photo.png",
      mimeType: "image/png",
    } as any);

    const mockStream = new Readable();
    mockStream.push("mock-image-data");
    mockStream.push(null);

    vi.mocked(b2Storage.getMediaObject).mockResolvedValue({
      stream: mockStream,
      mimeType: "image/png",
      contentLength: 15,
      etag: '"etag-123"',
    });

    const req = new NextRequest(`http://localhost/api/admin/media/${mediaId}/preview`);
    const res = await getAdminMediaPreview(req, { params: Promise.resolve({ id: mediaId }) });
    
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store, must-revalidate");
    expect(res.headers.get("Content-Type")).toBe("image/png");
    expect(res.headers.get("ETag")).toBe('"etag-123"');
    expect(res.headers.get("Vercel-Cache-Tag")).toBeNull();
  });

  it("handles 304 Not Modified correctly with private cache headers", async () => {
    vi.mocked(authSession.getCurrentAdmin).mockResolvedValue(mockAdminUser);
    vi.mocked(prisma.media.findUnique).mockResolvedValue({
      id: mediaId,
      objectKey: "hidden/photo.png",
      mimeType: "image/png",
    } as any);

    vi.mocked(b2Storage.getMediaObject).mockResolvedValue({
      notModified: true,
    });

    const req = new NextRequest(`http://localhost/api/admin/media/${mediaId}/preview`, {
      headers: { "if-none-match": '"etag-123"' },
    });
    const res = await getAdminMediaPreview(req, { params: Promise.resolve({ id: mediaId }) });
    
    expect(res.status).toBe(304);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store, must-revalidate");
    expect(res.headers.get("ETag")).toBe('"etag-123"');
    expect(res.headers.get("Vercel-Cache-Tag")).toBeNull();
  });
});
