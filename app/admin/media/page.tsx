import { Metadata } from "next";
import { getCurrentAdmin } from "@/lib/auth/session";
import { AdminRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { AdminShell, AdminPageHeader, DashboardErrorState } from "@/components/admin";
import {
  MediaManagementConsole,
  MediaItem,
  MediaEventOption,
  MediaMetrics,
} from "@/components/admin/media";
import { prisma } from "@/lib/db/client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Media — CCF Admin",
  description: "Media gallery assets and production storage management for Crescent Club of Finance.",
};

export default async function AdminMediaPage() {
  const admin = await getCurrentAdmin();

  if (!admin || (admin.role !== AdminRole.CCF_ADMIN && admin.role !== AdminRole.IT_ADMIN)) {
    redirect("/admin/auth/login?callbackUrl=/admin/media");
    return null;
  }

  let media: MediaItem[] = [];
  let events: MediaEventOption[] = [];
  let metrics: MediaMetrics = {
    total: 0,
    visible: 0,
    hidden: 0,
    eventMedia: 0,
  };
  let isError = false;

  try {
    const [rawMedia, rawEvents] = await Promise.all([
      prisma.media.findMany({
        include: {
          event: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          _count: {
            select: {
              members: true,
            },
          },
        },
        orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
      }),
      prisma.event.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
        },
        orderBy: { name: "asc" },
      }),
    ]);

    media = rawMedia.map((m) => ({
      id: m.id,
      eventId: m.eventId,
      objectKey: m.objectKey,
      mimeType: m.mimeType,
      altText: m.altText,
      width: m.width,
      height: m.height,
      visibility: m.visibility,
      displayOrder: m.displayOrder,
      createdAt: m.createdAt.toISOString(),
      event: m.event,
      _count: m._count,
    }));

    events = rawEvents;

    const total = media.length;
    const visible = media.filter((m) => m.visibility).length;
    const hidden = total - visible;
    const eventMedia = media.filter((m) => m.eventId !== null).length;

    metrics = {
      total,
      visible,
      hidden,
      eventMedia,
    };
  } catch (error) {
    console.error("[AdminMediaPage] Failed to fetch media data:", error);
    isError = true;
  }

  return (
    <AdminShell user={admin}>
      <AdminPageHeader
        eyebrow="Operations"
        title="Media"
        description="Manage media storage, gallery assets, visibility toggles, and event media associations."
      />

      {isError ? (
        <DashboardErrorState
          error="Live operational data is temporarily unavailable."
          retryUrl="/admin/media"
          backUrl="/admin/dashboard"
          backLabel="Return to Dashboard"
        />
      ) : (
        <MediaManagementConsole
          initialMedia={media}
          events={events}
          initialMetrics={metrics}
        />
      )}
    </AdminShell>
  );
}
