import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getB2Config,
  getB2Client,
  resetB2Client,
  uploadMediaObject,
  getMediaObject,
  deleteMediaObject,
  mediaObjectExists,
} from "@/lib/storage/b2";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { GET as getMediaRoute } from "@/app/api/media/[...key]/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/client";
import { Readable } from "stream";

// Mock S3Client send method
const mockSend = vi.fn();
vi.mock("@aws-sdk/client-s3", async () => {
  const actual = await vi.importActual<typeof import("@aws-sdk/client-s3")>("@aws-sdk/client-s3");
  return {
    ...actual,
    S3Client: vi.fn().mockImplementation((config) => {
      return {
        ...config,
        send: mockSend,
      };
    }),
  };
});

describe("Backblaze B2 Storage Integration", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    resetB2Client();
    process.env.B2_ENDPOINT = "https://s3.ca-east-006.backblazeb2.com";
    process.env.B2_REGION = "ca-east-006";
    process.env.B2_BUCKET = "ccf-production-media";
    process.env.B2_KEY_ID = "test-key-id";
    process.env.B2_APPLICATION_KEY = "test-app-key";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("1. Configuration & Credential Validation", () => {
    it("returns valid B2 configuration when environment variables are set", () => {
      const config = getB2Config();
      expect(config.endpoint).toBe("https://s3.ca-east-006.backblazeb2.com");
      expect(config.region).toBe("ca-east-006");
      expect(config.bucket).toBe("ccf-production-media");
      expect(config.keyId).toBe("test-key-id");
      expect(config.applicationKey).toBe("test-app-key");
    });

    it("uses default verified endpoint, region, and bucket if optional vars are omitted", () => {
      delete process.env.B2_ENDPOINT;
      delete process.env.B2_REGION;
      delete process.env.B2_BUCKET;

      const config = getB2Config();
      expect(config.endpoint).toBe("https://s3.ca-east-006.backblazeb2.com");
      expect(config.region).toBe("ca-east-006");
      expect(config.bucket).toBe("ccf-production-media");
    });

    it("throws a descriptive error without leaking secrets when B2_KEY_ID is missing", () => {
      delete process.env.B2_KEY_ID;
      expect(() => getB2Config()).toThrowError(/Missing required environment variable.*B2_KEY_ID/);
      // Ensure the error message does NOT contain secret values
      try {
        getB2Config();
      } catch (err: any) {
        expect(err.message).not.toContain("test-app-key");
      }
    });

    it("throws a descriptive error without leaking secrets when B2_APPLICATION_KEY is missing", () => {
      delete process.env.B2_APPLICATION_KEY;
      expect(() => getB2Config()).toThrowError(/Missing required environment variable.*B2_APPLICATION_KEY/);
      try {
        getB2Config();
      } catch (err: any) {
        expect(err.message).not.toContain("test-key-id");
      }
    });

    it("initializes S3Client with forcePathStyle: true for Backblaze B2 compatibility", () => {
      const client = getB2Client();
      expect(S3Client).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: "https://s3.ca-east-006.backblazeb2.com",
          region: "ca-east-006",
          credentials: {
            accessKeyId: "test-key-id",
            secretAccessKey: "test-app-key",
          },
          forcePathStyle: true,
        })
      );
      expect(client).toBeDefined();
    });
  });

  describe("2. Storage Operations", () => {
    it("uploadMediaObject sends PutObjectCommand with correct parameters", async () => {
      mockSend.mockResolvedValueOnce({ ETag: '"test-etag-123"' });

      const result = await uploadMediaObject({
        key: "events/banner.webp",
        body: Buffer.from("fake-image-bytes"),
        mimeType: "image/webp",
        contentLength: 16,
        metadata: { "uploaded-by": "admin" },
      });

      expect(mockSend).toHaveBeenCalledTimes(1);
      const command = mockSend.mock.calls[0][0];
      expect(command).toBeInstanceOf(PutObjectCommand);
      expect(command.input).toMatchObject({
        Bucket: "ccf-production-media",
        Key: "events/banner.webp",
        ContentType: "image/webp",
        ContentLength: 16,
        Metadata: { "uploaded-by": "admin" },
      });
      expect(result).toEqual({
        key: "events/banner.webp",
        etag: '"test-etag-123"',
      });
    });

    it("getMediaObject returns stream and headers when object exists", async () => {
      const mockStream = Readable.from(["fake-data"]);
      mockSend.mockResolvedValueOnce({
        Body: mockStream,
        ContentType: "image/jpeg",
        ContentLength: 9,
        ETag: '"etag-xyz"',
      });

      const result = await getMediaObject("members/john.jpg");

      expect(mockSend).toHaveBeenCalledTimes(1);
      const command = mockSend.mock.calls[0][0];
      expect(command).toBeInstanceOf(GetObjectCommand);
      expect(command.input).toMatchObject({
        Bucket: "ccf-production-media",
        Key: "members/john.jpg",
      });
      expect(result).toBeDefined();
      expect(result?.mimeType).toBe("image/jpeg");
      expect(result?.contentLength).toBe(9);
      expect(result?.etag).toBe('"etag-xyz"');
    });

    it("getMediaObject returns null when object is not found (NoSuchKey / 404)", async () => {
      const notFoundError = new Error("The specified key does not exist.");
      notFoundError.name = "NoSuchKey";
      mockSend.mockRejectedValueOnce(notFoundError);

      const result = await getMediaObject("missing.jpg");
      expect(result).toBeNull();
    });

    it("deleteMediaObject sends DeleteObjectCommand with correct parameters", async () => {
      mockSend.mockResolvedValueOnce({});

      await deleteMediaObject("events/old-banner.png");

      expect(mockSend).toHaveBeenCalledTimes(1);
      const command = mockSend.mock.calls[0][0];
      expect(command).toBeInstanceOf(DeleteObjectCommand);
      expect(command.input).toMatchObject({
        Bucket: "ccf-production-media",
        Key: "events/old-banner.png",
      });
    });

    it("mediaObjectExists returns true when object exists and false on 404", async () => {
      mockSend.mockResolvedValueOnce({});
      const exists = await mediaObjectExists("events/photo.jpg");
      expect(exists).toBe(true);

      const notFoundErr = new Error("Not Found");
      notFoundErr.name = "NotFound";
      mockSend.mockRejectedValueOnce(notFoundErr);
      const notExists = await mediaObjectExists("events/missing.jpg");
      expect(notExists).toBe(false);
    });
  });

  describe("3. GET /api/media/[...key] Route Handler", () => {
    it("rejects path traversal attempts with 400 Bad Request", async () => {
      const req = new NextRequest("http://localhost/api/media/../secret.txt");
      const res = await getMediaRoute(req, {
        params: Promise.resolve({ key: ["..", "secret.txt"] }),
      });
      expect(res.status).toBe(400);
      expect(await res.text()).toBe("Invalid media key");
    });

    it("rejects backslash or null byte injection with 400 Bad Request", async () => {
      const req = new NextRequest("http://localhost/api/media/events/..%2Fsecret");
      const res = await getMediaRoute(req, {
        params: Promise.resolve({ key: ["events", "test\\secret"] }),
      });
      expect(res.status).toBe(400);
      expect(await res.text()).toBe("Invalid media key");
    });

    it("returns 404 if no matching PostgreSQL Media record exists (strict DB requirement)", async () => {
      // Mock prisma.media.findFirst returning null
      vi.spyOn(prisma.media, "findFirst").mockResolvedValueOnce(null);

      const req = new NextRequest("http://localhost/api/media/arbitrary/file.jpg");
      const res = await getMediaRoute(req, {
        params: Promise.resolve({ key: ["arbitrary", "file.jpg"] }),
      });

      expect(prisma.media.findFirst).toHaveBeenCalledWith({
        where: {
          objectKey: "arbitrary/file.jpg",
          visibility: true,
        },
        select: {
          id: true,
          objectKey: true,
          mimeType: true,
          visibility: true,
        },
      });
      expect(res.status).toBe(404);
      // Ensure B2 storage is NOT even queried if no DB record matches
      expect(mockSend).not.toHaveBeenCalled();
    });

    it("returns 404 if PostgreSQL Media record has visibility === false", async () => {
      // prisma.media.findFirst filters by visibility: true, so hidden records return null
      vi.spyOn(prisma.media, "findFirst").mockResolvedValueOnce(null);

      const req = new NextRequest("http://localhost/api/media/events/hidden.jpg");
      const res = await getMediaRoute(req, {
        params: Promise.resolve({ key: ["events", "hidden.jpg"] }),
      });

      expect(res.status).toBe(404);
      expect(mockSend).not.toHaveBeenCalled();
    });

    it("streams object with caching headers when matching visible Media record exists in DB", async () => {
      // Mock DB findFirst
      vi.spyOn(prisma.media, "findFirst").mockResolvedValueOnce({
        id: "media-uuid-1",
        objectKey: "members/lead.webp",
        mimeType: "image/webp",
        visibility: true,
      } as any);

      // Mock B2 GetObject
      const mockStream = Readable.from(["fake-image-binary"]);
      mockSend.mockResolvedValueOnce({
        Body: mockStream,
        ContentType: "image/webp",
        ContentLength: 17,
        ETag: '"b2-etag-789"',
      });

      const req = new NextRequest("http://localhost/api/media/members/lead.webp");
      const res = await getMediaRoute(req, {
        params: Promise.resolve({ key: ["members", "lead.webp"] }),
      });

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("image/webp");
      expect(res.headers.get("Cache-Control")).toBe(
        "public, max-age=3600, s-maxage=86400, stale-while-revalidate=3600"
      );
    });

    it("returns 304 Not Modified when client provides matching If-None-Match ETag", async () => {
      vi.spyOn(prisma.media, "findFirst").mockResolvedValueOnce({
        id: "media-uuid-2",
        objectKey: "events/cover.png",
        mimeType: "image/png",
        visibility: true,
      } as any);

      const mockStream = Readable.from(["fake-data"]);
      mockSend.mockResolvedValueOnce({
        Body: mockStream,
        ContentType: "image/png",
        ContentLength: 9,
        ETag: '"cached-etag-123"',
      });

      const req = new NextRequest("http://localhost/api/media/events/cover.png", {
        headers: {
          "if-none-match": '"cached-etag-123"',
        },
      });
      const res = await getMediaRoute(req, {
        params: Promise.resolve({ key: ["events", "cover.png"] }),
      });

      expect(res.status).toBe(304);
    });

    it("returns 404 if Media record exists in DB but B2 object is missing", async () => {
      vi.spyOn(prisma.media, "findFirst").mockResolvedValueOnce({
        id: "media-uuid-3",
        objectKey: "events/lost.png",
        mimeType: "image/png",
        visibility: true,
      } as any);

      const notFoundErr = new Error("NoSuchKey");
      notFoundErr.name = "NoSuchKey";
      mockSend.mockRejectedValueOnce(notFoundErr);

      const req = new NextRequest("http://localhost/api/media/events/lost.png");
      const res = await getMediaRoute(req, {
        params: Promise.resolve({ key: ["events", "lost.png"] }),
      });

      expect(res.status).toBe(404);
    });
  });
});
