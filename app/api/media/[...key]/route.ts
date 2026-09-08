import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getMediaObject } from "@/lib/storage/b2";
import type { Readable } from "stream";

interface RouteContext {
  params: Promise<{ key?: string[] }>;
}

/**
 * GET /api/media/[...key]
 *
 * Secure server-controlled media streaming route for Backblaze B2 private bucket storage.
 * Enforces:
 * 1. Path traversal / malicious key validation
 * 2. Mandatory existence of a matching PostgreSQL Media record (does NOT serve arbitrary B2 objects)
 * 3. Media.visibility === true check (respecting schema semantics)
 * 4. HTTP caching headers (Cache-Control, ETag, 304 handling)
 */
export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const { key } = await params;

    if (!key || !Array.isArray(key) || key.length === 0) {
      return new NextResponse("Invalid media request", { status: 400 });
    }

    // Guard against directory traversal or invalid path components
    for (const segment of key) {
      if (
        !segment ||
        segment === "." ||
        segment === ".." ||
        segment.includes("/") ||
        segment.includes("\\") ||
        segment.includes("\0")
      ) {
        return new NextResponse("Invalid media key", { status: 400 });
      }
    }

    const objectKey = key.join("/");

    // 1. Mandatory verification against PostgreSQL Media record
    // Only serve objects that are explicitly tracked in the database and visible.
    const media = await prisma.media.findFirst({
      where: {
        objectKey,
        visibility: true,
      },
      select: {
        id: true,
        objectKey: true,
        mimeType: true,
        visibility: true,
      },
    });

    if (!media) {
      return new NextResponse("Not Found", { status: 404 });
    }

    // Check client conditional request (ETag)
    const clientEtag = req.headers.get("if-none-match");

    // 2. Fetch object from Backblaze B2
    const object = await getMediaObject(media.objectKey);
    if (!object || !object.stream) {
      return new NextResponse("Not Found", { status: 404 });
    }

    if (clientEtag && object.etag && clientEtag === object.etag) {
      return new NextResponse(null, { status: 304 });
    }

    const headers = new Headers();
    headers.set("Content-Type", media.mimeType || object.mimeType || "application/octet-stream");
    if (object.contentLength) {
      headers.set("Content-Length", object.contentLength.toString());
    }
    if (object.etag) {
      headers.set("ETag", object.etag);
    }
    // Cache policy: 1 hour browser cache, 1 day shared CDN cache, 1 hour stale-while-revalidate
    headers.set(
      "Cache-Control",
      "public, max-age=3600, s-maxage=86400, stale-while-revalidate=3600"
    );

    // Convert stream to Web ReadableStream for Response
    let body: BodyInit;
    const streamAny = object.stream as any;
    if (typeof streamAny.transformToWebStream === "function") {
      body = streamAny.transformToWebStream();
    } else if (typeof streamAny.pipe === "function") {
      const { Readable } = await import("stream");
      body = Readable.toWeb(streamAny as Readable) as unknown as BodyInit;
    } else {
      body = object.stream as unknown as BodyInit;
    }

    return new Response(body, {
      status: 200,
      headers,
    });
  } catch (error: unknown) {
    console.error("[MEDIA_GET] Unexpected error retrieving media:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
