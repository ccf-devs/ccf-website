import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth/session";
import { AdminRole } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { mediaIdSchema } from "@/lib/media/validation";
import { getMediaObject } from "@/lib/storage/b2";
import type { Readable } from "stream";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/media/[id]/preview
 * 
 * Authenticated endpoint for admins to preview media, including hidden media (visibility=false).
 * Bypasses public visibility restrictions but enforces strict CCF_ADMIN / IT_ADMIN authorization.
 * 
 * IMPORTANT: This endpoint is strictly for authenticated admin previews and uses
 * "no-store" cache headers to prevent private/hidden media from leaking into public CDNs.
 */
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    // 1. Authenticate & Authorize
    const admin = await getCurrentAdmin();
    if (!admin) {
      return new NextResponse("Authentication required.", { status: 401 });
    }

    if (admin.role !== AdminRole.CCF_ADMIN && admin.role !== AdminRole.IT_ADMIN) {
      return new NextResponse("Insufficient permissions.", { status: 403 });
    }

    // 2. Validate media ID
    const { id } = await context.params;
    const idParsed = mediaIdSchema.safeParse(id);
    if (!idParsed.success) {
      return new NextResponse("Invalid media ID format.", { status: 400 });
    }

    // 3. Fetch media record (ignoring visibility, relying on admin auth)
    const media = await prisma.media.findUnique({
      where: { id },
      select: {
        id: true,
        objectKey: true,
        mimeType: true,
      },
    });

    if (!media) {
      return new NextResponse("Media asset not found.", { status: 404 });
    }

    // 4. Fetch object from Backblaze B2 (conditional on If-None-Match)
    const clientEtag = req.headers.get("if-none-match") || undefined;
    const object = await getMediaObject(media.objectKey, clientEtag);

    if (!object) {
      return new NextResponse("Media object not found in storage.", { status: 404 });
    }

    if ('notModified' in object) {
      const headers = new Headers();
      headers.set("Content-Type", media.mimeType || "application/octet-stream");
      if (clientEtag) {
        headers.set("ETag", clientEtag);
      }
      headers.set("Cache-Control", "private, no-store, must-revalidate");
      return new NextResponse(null, { status: 304, headers });
    }

    if (!object.stream) {
      return new NextResponse("Media object stream unavailable.", { status: 404 });
    }

    const headers = new Headers();
    headers.set("Content-Type", media.mimeType || object.mimeType || "application/octet-stream");
    if (object.contentLength) {
      headers.set("Content-Length", object.contentLength.toString());
    }
    if (object.etag) {
      headers.set("ETag", object.etag);
    }
    
    // STRICT PRIVATE CACHE: Prevent Vercel CDN or browser from sharing this authenticated response
    headers.set("Cache-Control", "private, no-store, must-revalidate");

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
  } catch (error) {
    console.error(`[GET /api/admin/media/[id]/preview] Error:`, error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
