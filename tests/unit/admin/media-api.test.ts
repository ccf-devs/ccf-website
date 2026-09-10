import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { AdminRole } from "@prisma/client";
import * as authSession from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import * as b2Storage from "@/lib/storage/b2";
import {
  GET as getMediaList,
  POST as uploadMedia,
} from "@/app/api/admin/media/route";
import {
  GET as getMediaById,
  PATCH as patchMedia,
  DELETE as deleteMedia,
} from "@/app/api/admin/media/[id]/route";

vi.mock("@/lib/auth/session", () => ({
  getCurrentAdmin: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    media: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    event: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/storage/b2", () => ({
  uploadMediaObject: vi.fn(),
  deleteMediaObject: vi.fn(),
  getMediaObject: vi.fn(),
  mediaObjectExists: vi.fn(),
  getB2Config: vi.fn(() => ({
    bucketName: "test-bucket",
    bucketId: "test-bucket-id",
    endpoint: "https://s3.us-east-005.backblazeb2.com",
    region: "us-east-005",
  })),
}));

describe("Admin Media API Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.auditLog.create).mockResolvedValue({ id: "audit-1" } as any);
    vi.mocked(prisma.media.count).mockResolvedValue(0);
  });

  const mockAdminUser = {
    id: "admin-uuid-1",
    email: "developers.ccf@gmail.com",
    name: "CCF Devs",
    role: AdminRole.CCF_ADMIN,
  };

  const mockItAdminUser = {
    id: "admin-uuid-2",
    email: "cyberrohith07@gmail.com",
    name: "Rohith IT",
    role: AdminRole.IT_ADMIN,
  };

  const mediaId = "44444444-4444-4444-4444-444444444444";
  const eventId = "55555555-5555-5555-5555-555555555555";

  // Valid 12+ byte headers
  const validPngBytes = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  ]);
  const validJpegBytes = new Uint8Array([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  ]);

  /* -------------------------------------------------------------------------- */
  /* 1. Authorization Enforcements Across Endpoints                             */
  /* -------------------------------------------------------------------------- */
  describe("1. Authorization Enforcements", () => {
    it("rejects unauthenticated requests with 401 across all endpoints", async () => {
      vi.mocked(authSession.getCurrentAdmin).mockResolvedValue(null);

      const resGet = await getMediaList(new NextRequest("http://localhost/api/admin/media"));
      expect(resGet.status).toBe(401);

      const resPost = await uploadMedia(new NextRequest("http://localhost/api/admin/media", { method: "POST" }));
      expect(resPost.status).toBe(401);

      const resGetById = await getMediaById(
        new NextRequest(`http://localhost/api/admin/media/${mediaId}`),
        { params: Promise.resolve({ id: mediaId }) }
      );
      expect(resGetById.status).toBe(401);

      const resPatch = await patchMedia(
        new NextRequest(`http://localhost/api/admin/media/${mediaId}`, { method: "PATCH" }),
        { params: Promise.resolve({ id: mediaId }) }
      );
      expect(resPatch.status).toBe(401);

      const resDelete = await deleteMedia(
        new NextRequest(`http://localhost/api/admin/media/${mediaId}`, { method: "DELETE" }),
        { params: Promise.resolve({ id: mediaId }) }
      );
      expect(resDelete.status).toBe(401);
    });

    it("rejects non-admin role with 403", async () => {
      vi.mocked(authSession.getCurrentAdmin).mockResolvedValue({
        id: "user-1",
        email: "user@example.com",
        name: "Regular User",
        role: "MEMBER" as any,
      });

      const res = await getMediaList(new NextRequest("http://localhost/api/admin/media"));
      expect(res.status).toBe(403);
    });

    it("authorizes both CCF_ADMIN and IT_ADMIN", async () => {
      vi.mocked(authSession.getCurrentAdmin).mockResolvedValue(mockItAdminUser);
      vi.mocked(prisma.media.findMany).mockResolvedValue([]);
      vi.mocked(prisma.media.count).mockResolvedValue(0);

      const res = await getMediaList(new NextRequest("http://localhost/api/admin/media"));
      expect(res.status).toBe(200);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 2. GET /api/admin/media (List, Metrics & Query Validation)                  */
  /* -------------------------------------------------------------------------- */
  describe("2. GET /api/admin/media", () => {
    beforeEach(() => {
      vi.mocked(authSession.getCurrentAdmin).mockResolvedValue(mockAdminUser);
    });

    it("returns media list with computed metrics", async () => {
      const mockItems = [
        {
          id: "m-1",
          eventId,
          objectKey: "events/test/1.png",
          mimeType: "image/png",
          altText: "Event Photo",
          width: 800,
          height: 600,
          visibility: true,
          displayOrder: 1,
          createdAt: new Date("2026-09-08T10:00:00Z"),
          event: { id: eventId, name: "Stock Summit", slug: "stock-summit" },
          _count: { members: 0 },
        },
        {
          id: "m-2",
          eventId: null,
          objectKey: "gallery/2.jpg",
          mimeType: "image/jpeg",
          altText: null,
          width: null,
          height: null,
          visibility: false,
          displayOrder: 2,
          createdAt: new Date("2026-09-08T11:00:00Z"),
          event: null,
          _count: { members: 1 },
        },
      ];

      vi.mocked(prisma.media.findMany).mockResolvedValue(mockItems as any);
      vi.mocked(prisma.media.count)
        .mockResolvedValueOnce(2) // total
        .mockResolvedValueOnce(1) // visible
        .mockResolvedValueOnce(1) // hidden
        .mockResolvedValueOnce(1); // eventMedia

      const res = await getMediaList(new NextRequest("http://localhost/api/admin/media"));
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.media).toHaveLength(2);
      expect(data.metrics).toEqual({
        total: 2,
        visible: 1,
        hidden: 1,
        eventMedia: 1,
      });
    });

    it("supports filtering by eventId, visibility, and search", async () => {
      vi.mocked(prisma.media.findMany).mockResolvedValue([]);
      vi.mocked(prisma.media.count).mockResolvedValue(0);

      const url = `http://localhost/api/admin/media?eventId=${eventId}&visibility=true&search=summit`;
      const res = await getMediaList(new NextRequest(url));
      expect(res.status).toBe(200);

      expect(prisma.media.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            eventId,
            visibility: true,
            OR: expect.any(Array),
          }),
        })
      );
    });

    it("rejects query with malformed eventId (400)", async () => {
      const res = await getMediaList(
        new NextRequest("http://localhost/api/admin/media?eventId=not-a-valid-uuid")
      );
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Invalid query parameters.");
      expect(data.details?.eventId).toBeDefined();
    });

    it("rejects query with invalid visibility value (400)", async () => {
      const res = await getMediaList(
        new NextRequest("http://localhost/api/admin/media?visibility=unknown")
      );
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Invalid query parameters.");
      expect(data.details?.visibility).toBeDefined();
    });

    it("rejects query with search parameter exceeding max length (400)", async () => {
      const longSearch = "a".repeat(101);
      const res = await getMediaList(
        new NextRequest(`http://localhost/api/admin/media?search=${longSearch}`)
      );
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Invalid query parameters.");
      expect(data.details?.search).toBeDefined();
    });

    it("returns 500 when database throws an error", async () => {
      vi.mocked(prisma.media.findMany).mockRejectedValue(new Error("DB connection failure"));

      const res = await getMediaList(new NextRequest("http://localhost/api/admin/media"));
      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toBe("Failed to retrieve media records.");
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 3. POST /api/admin/media (Upload Handling & Security)                      */
  /* -------------------------------------------------------------------------- */
  describe("3. POST /api/admin/media", () => {
    beforeEach(() => {
      vi.mocked(authSession.getCurrentAdmin).mockResolvedValue(mockAdminUser);
    });

    it("rejects request without a file (400)", async () => {
      const formData = new FormData();
      formData.append("altText", "No file here");

      const req = new NextRequest("http://localhost/api/admin/media", {
        method: "POST",
        body: formData,
      });

      const res = await uploadMedia(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("A valid image file is required.");
    });

    it("rejects unsupported MIME type such as SVG (400)", async () => {
      const formData = new FormData();
      const svgBlob = new Blob(["<svg></svg>"], { type: "image/svg+xml" });
      formData.append("file", svgBlob, "vector.svg");

      const req = new NextRequest("http://localhost/api/admin/media", {
        method: "POST",
        body: formData,
      });

      const res = await uploadMedia(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("Unsupported image format");
    });

    it("rejects spoofed file where binary signature does not match declared MIME (400)", async () => {
      const formData = new FormData();
      // Fake PNG with JPEG header
      const fakeBlob = new Blob([validJpegBytes], { type: "image/png" });
      formData.append("file", fakeBlob, "spoofed.png");

      const req = new NextRequest("http://localhost/api/admin/media", {
        method: "POST",
        body: formData,
      });

      const res = await uploadMedia(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("File binary signature does not match");
    });

    it("rejects file exceeding 10MB limit (400)", async () => {
      const formData = new FormData();
      // Create a dummy 10MB + 1 byte payload
      const largeBlob = new Blob([new Uint8Array(10 * 1024 * 1024 + 1)], { type: "image/png" });
      formData.append("file", largeBlob, "large.png");

      const req = new NextRequest("http://localhost/api/admin/media", {
        method: "POST",
        body: formData,
      });

      const res = await uploadMedia(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("File size exceeds");
    });

    it("rejects upload when specified eventId does not exist (400)", async () => {
      const formData = new FormData();
      const fileBlob = new Blob([validPngBytes], { type: "image/png" });
      formData.append("file", fileBlob, "event-photo.png");
      formData.append("eventId", eventId);

      vi.mocked(prisma.event.findUnique).mockResolvedValue(null);

      const req = new NextRequest("http://localhost/api/admin/media", {
        method: "POST",
        body: formData,
      });

      const res = await uploadMedia(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("The associated event does not exist.");
    });

    it("successfully uploads valid file to B2 and stores DB record (201)", async () => {
      const formData = new FormData();
      const fileBlob = new Blob([validPngBytes], { type: "image/png" });
      formData.append("file", fileBlob, "event-photo.png");
      formData.append("eventId", eventId);
      formData.append("altText", "Stock Summit opening");
      formData.append("visibility", "true");
      formData.append("displayOrder", "5");

      vi.mocked(prisma.event.findUnique).mockResolvedValue({
        id: eventId,
        name: "Stock Summit",
        slug: "stock-summit",
      } as any);

      vi.mocked(b2Storage.uploadMediaObject).mockResolvedValue({
        key: `events/${eventId}/mock-uuid.png`,
        etag: '"test-etag"',
      });

      const createdMediaRecord = {
        id: mediaId,
        eventId,
        objectKey: `events/${eventId}/mock-uuid.png`,
        mimeType: "image/png",
        altText: "Stock Summit opening",
        width: null,
        height: null,
        visibility: true,
        displayOrder: 5,
        createdAt: new Date("2026-09-08T12:00:00Z"),
        event: { id: eventId, name: "Stock Summit", slug: "stock-summit" },
        _count: { members: 0 },
      };

      vi.mocked(prisma.media.create).mockResolvedValue(createdMediaRecord as any);

      const req = new NextRequest("http://localhost/api/admin/media", {
        method: "POST",
        body: formData,
      });

      const res = await uploadMedia(req);
      expect(res.status).toBe(201);

      const data = await res.json();
      expect(data.media.id).toBe(mediaId);
      expect(b2Storage.uploadMediaObject).toHaveBeenCalledTimes(1);
      expect(prisma.media.create).toHaveBeenCalledTimes(1);
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "MEDIA_UPLOADED",
            entityType: "Media",
            entityId: mediaId,
          }),
        })
      );
    });

    it("fails cleanly when B2 upload fails (500) and avoids DB insertion", async () => {
      const formData = new FormData();
      const fileBlob = new Blob([validPngBytes], { type: "image/png" });
      formData.append("file", fileBlob, "event-photo.png");

      vi.mocked(b2Storage.uploadMediaObject).mockRejectedValue(new Error("B2 service timeout"));

      const req = new NextRequest("http://localhost/api/admin/media", {
        method: "POST",
        body: formData,
      });

      const res = await uploadMedia(req);
      expect(res.status).toBe(500);
      expect(prisma.media.create).not.toHaveBeenCalled();
    });

    it("cleans up uploaded B2 object if DB insertion fails (500)", async () => {
      const formData = new FormData();
      const fileBlob = new Blob([validPngBytes], { type: "image/png" });
      formData.append("file", fileBlob, "event-photo.png");

      vi.mocked(b2Storage.uploadMediaObject).mockResolvedValue({
        key: "gallery/test-uuid.png",
        etag: '"etag-1"',
      });

      vi.mocked(prisma.media.create).mockRejectedValue(new Error("Database write error"));

      const req = new NextRequest("http://localhost/api/admin/media", {
        method: "POST",
        body: formData,
      });

      const res = await uploadMedia(req);
      expect(res.status).toBe(500);
      expect(b2Storage.deleteMediaObject).toHaveBeenCalledWith(
        expect.stringMatching(/^gallery\/[a-f0-9-]+\.png$/)
      );
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 4. GET /api/admin/media/[id] (Resource Query & UUID Validation)            */
  /* -------------------------------------------------------------------------- */
  describe("4. GET /api/admin/media/[id]", () => {
    beforeEach(() => {
      vi.mocked(authSession.getCurrentAdmin).mockResolvedValue(mockAdminUser);
    });

    it("rejects malformed UUID with 400", async () => {
      const res = await getMediaById(
        new NextRequest("http://localhost/api/admin/media/invalid-uuid"),
        { params: Promise.resolve({ id: "invalid-uuid" }) }
      );
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Invalid media ID format. Expected a valid UUID.");
      expect(prisma.media.findUnique).not.toHaveBeenCalled();
    });

    it("returns 404 when media asset not found", async () => {
      vi.mocked(prisma.media.findUnique).mockResolvedValue(null);

      const res = await getMediaById(
        new NextRequest(`http://localhost/api/admin/media/${mediaId}`),
        { params: Promise.resolve({ id: mediaId }) }
      );
      expect(res.status).toBe(404);
    });

    it("returns media asset with event and member counts", async () => {
      vi.mocked(prisma.media.findUnique).mockResolvedValue({
        id: mediaId,
        objectKey: "gallery/test.png",
        mimeType: "image/png",
        visibility: true,
        displayOrder: 1,
        createdAt: new Date("2026-09-08T10:00:00Z"),
        event: null,
        _count: { members: 2 },
      } as any);

      const res = await getMediaById(
        new NextRequest(`http://localhost/api/admin/media/${mediaId}`),
        { params: Promise.resolve({ id: mediaId }) }
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.media.id).toBe(mediaId);
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 5. PATCH /api/admin/media/[id] (Metadata, Visibility & UUID Validation)    */
  /* -------------------------------------------------------------------------- */
  describe("5. PATCH /api/admin/media/[id]", () => {
    beforeEach(() => {
      vi.mocked(authSession.getCurrentAdmin).mockResolvedValue(mockAdminUser);
    });

    it("rejects malformed UUID with 400", async () => {
      const res = await patchMedia(
        new NextRequest("http://localhost/api/admin/media/not-a-uuid", {
          method: "PATCH",
          body: JSON.stringify({ visibility: false }),
        }),
        { params: Promise.resolve({ id: "not-a-uuid" }) }
      );
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Invalid media ID format. Expected a valid UUID.");
      expect(prisma.media.findUnique).not.toHaveBeenCalled();
    });

    it("returns 404 if media does not exist", async () => {
      vi.mocked(prisma.media.findUnique).mockResolvedValue(null);

      const res = await patchMedia(
        new NextRequest(`http://localhost/api/admin/media/${mediaId}`, {
          method: "PATCH",
          body: JSON.stringify({ visibility: false }),
        }),
        { params: Promise.resolve({ id: mediaId }) }
      );
      expect(res.status).toBe(404);
    });

    it("returns 400 if target eventId does not exist", async () => {
      vi.mocked(prisma.media.findUnique).mockResolvedValue({
        id: mediaId,
        objectKey: "gallery/test.png",
        visibility: true,
      } as any);
      vi.mocked(prisma.event.findUnique).mockResolvedValue(null);

      const res = await patchMedia(
        new NextRequest(`http://localhost/api/admin/media/${mediaId}`, {
          method: "PATCH",
          body: JSON.stringify({ eventId: "66666666-6666-6666-6666-666666666666" }),
        }),
        { params: Promise.resolve({ id: mediaId }) }
      );
      expect(res.status).toBe(400);
    });

    it("updates visibility and logs MEDIA_VISIBILITY_CHANGED", async () => {
      vi.mocked(prisma.media.findUnique).mockResolvedValue({
        id: mediaId,
        objectKey: "gallery/test.png",
        visibility: true,
      } as any);

      vi.mocked(prisma.media.update).mockResolvedValue({
        id: mediaId,
        objectKey: "gallery/test.png",
        visibility: false,
        createdAt: new Date(),
        event: null,
        _count: { members: 0 },
      } as any);

      const res = await patchMedia(
        new NextRequest(`http://localhost/api/admin/media/${mediaId}`, {
          method: "PATCH",
          body: JSON.stringify({ visibility: false }),
        }),
        { params: Promise.resolve({ id: mediaId }) }
      );
      expect(res.status).toBe(200);

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "MEDIA_VISIBILITY_CHANGED",
            entityId: mediaId,
          }),
        })
      );
    });

    it("updates metadata and logs MEDIA_UPDATED", async () => {
      vi.mocked(prisma.media.findUnique).mockResolvedValue({
        id: mediaId,
        objectKey: "gallery/test.png",
        altText: "Old Alt",
        displayOrder: 1,
        visibility: true,
      } as any);

      vi.mocked(prisma.media.update).mockResolvedValue({
        id: mediaId,
        objectKey: "gallery/test.png",
        altText: "New Alt",
        displayOrder: 2,
        visibility: true,
        createdAt: new Date(),
        event: null,
        _count: { members: 0 },
      } as any);

      const res = await patchMedia(
        new NextRequest(`http://localhost/api/admin/media/${mediaId}`, {
          method: "PATCH",
          body: JSON.stringify({ altText: "New Alt", displayOrder: 2 }),
        }),
        { params: Promise.resolve({ id: mediaId }) }
      );
      expect(res.status).toBe(200);

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "MEDIA_UPDATED",
            entityId: mediaId,
          }),
        })
      );
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 6. DELETE /api/admin/media/[id] (Storage Failure Semantics & Security)     */
  /* -------------------------------------------------------------------------- */
  describe("6. DELETE /api/admin/media/[id]", () => {
    beforeEach(() => {
      vi.mocked(authSession.getCurrentAdmin).mockResolvedValue(mockAdminUser);
    });

    it("rejects malformed UUID with 400", async () => {
      const res = await deleteMedia(
        new NextRequest("http://localhost/api/admin/media/not-a-valid-uuid", { method: "DELETE" }),
        { params: Promise.resolve({ id: "not-a-valid-uuid" }) }
      );
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Invalid media ID format. Expected a valid UUID.");
      expect(prisma.media.findUnique).not.toHaveBeenCalled();
    });

    it("returns 404 when media asset not found", async () => {
      vi.mocked(prisma.media.findUnique).mockResolvedValue(null);

      const res = await deleteMedia(
        new NextRequest(`http://localhost/api/admin/media/${mediaId}`, { method: "DELETE" }),
        { params: Promise.resolve({ id: mediaId }) }
      );
      expect(res.status).toBe(404);
    });

    /* --- Case A: B2 delete succeeds --- */
    it("Test 1: B2 delete succeeds -> deletes DB record and writes audit log (200)", async () => {
      const existingMedia = {
        id: mediaId,
        objectKey: "events/test/uuid-abc.png",
        mimeType: "image/png",
        eventId,
        event: { id: eventId, name: "Stock Summit", slug: "stock-summit" },
      };

      vi.mocked(prisma.media.findUnique).mockResolvedValue(existingMedia as any);
      vi.mocked(b2Storage.deleteMediaObject).mockResolvedValue({} as any);
      vi.mocked(prisma.media.delete).mockResolvedValue(existingMedia as any);

      const res = await deleteMedia(
        new NextRequest(`http://localhost/api/admin/media/${mediaId}`, { method: "DELETE" }),
        { params: Promise.resolve({ id: mediaId }) }
      );
      expect(res.status).toBe(200);

      // Verify B2 deletion was called with trusted DB objectKey
      expect(b2Storage.deleteMediaObject).toHaveBeenCalledWith("events/test/uuid-abc.png");
      expect(prisma.media.delete).toHaveBeenCalledWith({ where: { id: mediaId } });
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "MEDIA_DELETED",
            entityId: mediaId,
          }),
        })
      );
    });

    /* --- Case B: B2 object is already missing (idempotent condition) --- */
    it("Test 2: B2 object already missing -> safely proceeds with DB deletion and audit log (200)", async () => {
      const existingMedia = {
        id: mediaId,
        objectKey: "gallery/already-missing.png",
        mimeType: "image/png",
        eventId: null,
      };

      vi.mocked(prisma.media.findUnique).mockResolvedValue(existingMedia as any);
      const notFoundError = new Error("Object not found");
      (notFoundError as any).name = "NoSuchKey";
      (notFoundError as any).$metadata = { httpStatusCode: 404 };
      vi.mocked(b2Storage.deleteMediaObject).mockRejectedValue(notFoundError);
      vi.mocked(prisma.media.delete).mockResolvedValue(existingMedia as any);

      const res = await deleteMedia(
        new NextRequest(`http://localhost/api/admin/media/${mediaId}`, { method: "DELETE" }),
        { params: Promise.resolve({ id: mediaId }) }
      );
      expect(res.status).toBe(200);
      expect(prisma.media.delete).toHaveBeenCalledWith({ where: { id: mediaId } });
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "MEDIA_DELETED",
            entityId: mediaId,
          }),
        })
      );
    });

    /* --- Case C: B2 operational failure --- */
    it("Test 3: B2 operational failure -> preserves DB record, skips audit log, returns safe 500 error", async () => {
      const existingMedia = {
        id: mediaId,
        objectKey: "gallery/important-photo.png",
        mimeType: "image/png",
        eventId: null,
      };

      vi.mocked(prisma.media.findUnique).mockResolvedValue(existingMedia as any);
      vi.mocked(b2Storage.deleteMediaObject).mockRejectedValue(new Error("B2 service timeout"));

      const res = await deleteMedia(
        new NextRequest(`http://localhost/api/admin/media/${mediaId}`, { method: "DELETE" }),
        { params: Promise.resolve({ id: mediaId }) }
      );
      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toBe(
        "Failed to remove media from storage. The database record was preserved for retry."
      );
      // DB record is NOT deleted
      expect(prisma.media.delete).not.toHaveBeenCalled();
      // Audit log is NOT created
      expect(prisma.auditLog.create).not.toHaveBeenCalled();
      // Raw error message is NOT exposed to client
      expect(JSON.stringify(data)).not.toContain("B2 service timeout");
    });

    /* --- Case D: Verification of trusted objectKey derivation --- */
    it("Test 4: Deletion derives objectKey strictly from DB record, ignoring any client request body", async () => {
      const existingMedia = {
        id: mediaId,
        objectKey: "events/legit/photo.png",
        mimeType: "image/png",
        eventId: null,
      };

      vi.mocked(prisma.media.findUnique).mockResolvedValue(existingMedia as any);
      vi.mocked(b2Storage.deleteMediaObject).mockResolvedValue({} as any);
      vi.mocked(prisma.media.delete).mockResolvedValue(existingMedia as any);

      // Attempt to send a forged objectKey in the DELETE request body
      const req = new NextRequest(`http://localhost/api/admin/media/${mediaId}`, {
        method: "DELETE",
        body: JSON.stringify({ objectKey: "malicious/override.png" }),
      });

      const res = await deleteMedia(req, { params: Promise.resolve({ id: mediaId }) });
      expect(res.status).toBe(200);

      // Verify B2 delete was called with the DB key, never the forged request key
      expect(b2Storage.deleteMediaObject).toHaveBeenCalledWith("events/legit/photo.png");
      expect(b2Storage.deleteMediaObject).not.toHaveBeenCalledWith("malicious/override.png");
    });
  });
});
