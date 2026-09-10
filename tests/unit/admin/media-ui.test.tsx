import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AdminRole } from "@prisma/client";
import AdminMediaPage from "@/app/admin/media/page";
import {
  MediaManagementConsole,
  MediaItem,
  MediaEventOption,
  MediaMetrics,
} from "@/components/admin/media";
import * as authSession from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";

// Mock next/navigation
const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/media",
  redirect: (url: string) => mockRedirect(url),
}));

// Mock auth session
vi.mock("@/lib/auth/session", () => ({
  getCurrentAdmin: vi.fn(),
}));

// Mock prisma client
vi.mock("@/lib/db/client", () => ({
  prisma: {
    media: {
      findMany: vi.fn(),
    },
    event: {
      findMany: vi.fn(),
    },
  },
}));

describe("Admin Media UI Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockAdminUser = {
    id: "admin-uuid-1",
    email: "developers.ccf@gmail.com",
    name: "CCF Devs",
    role: AdminRole.CCF_ADMIN,
  };

  const sampleEvents: MediaEventOption[] = [
    {
      id: "event-1",
      name: "Stock Pitch 2026",
      slug: "stock-pitch-2026",
    },
  ];

  const sampleMedia: MediaItem[] = [
    {
      id: "media-1",
      eventId: "event-1",
      objectKey: "events/event-1/photo1.jpg",
      mimeType: "image/jpeg",
      altText: "Pitch deck presentation",
      width: 1920,
      height: 1080,
      visibility: true,
      displayOrder: 1,
      createdAt: "2026-09-08T10:00:00.000Z",
      event: {
        id: "event-1",
        name: "Stock Pitch 2026",
        slug: "stock-pitch-2026",
      },
      _count: {
        members: 0,
      },
    },
    {
      id: "media-2",
      eventId: null,
      objectKey: "gallery/photo2.png",
      mimeType: "image/png",
      altText: null,
      width: null,
      height: null,
      visibility: false,
      displayOrder: 2,
      createdAt: "2026-09-08T11:00:00.000Z",
      event: null,
      _count: {
        members: 1,
      },
    },
  ];

  const sampleMetrics: MediaMetrics = {
    total: 2,
    visible: 1,
    hidden: 1,
    eventMedia: 1,
  };

  /* -------------------------------------------------------------------------- */
  /* 1. Page Component Authorization & Database States                           */
  /* -------------------------------------------------------------------------- */
  describe("1. Page Component Authorization & States", () => {
    it("redirects unauthenticated user to login with callbackUrl", async () => {
      vi.mocked(authSession.getCurrentAdmin).mockResolvedValue(null);

      await AdminMediaPage();

      expect(mockRedirect).toHaveBeenCalledWith(
        "/admin/auth/login?callbackUrl=/admin/media"
      );
    });

    it("redirects unauthorized non-admin role to login", async () => {
      vi.mocked(authSession.getCurrentAdmin).mockResolvedValue({
        id: "user-1",
        email: "user@example.com",
        name: "User",
        role: "MEMBER" as unknown as AdminRole,
      });

      await AdminMediaPage();

      expect(mockRedirect).toHaveBeenCalledWith(
        "/admin/auth/login?callbackUrl=/admin/media"
      );
    });

    it("renders page for authorized CCF_ADMIN and queries Prisma", async () => {
      vi.mocked(authSession.getCurrentAdmin).mockResolvedValue(mockAdminUser);
      vi.mocked(prisma.media.findMany).mockResolvedValue(
        sampleMedia.map((m) => ({
          ...m,
          createdAt: new Date(m.createdAt),
        })) as any
      );
      vi.mocked(prisma.event.findMany).mockResolvedValue(sampleEvents as any);

      const element = await AdminMediaPage();
      expect(element).not.toBeNull();
      const html = renderToStaticMarkup(element!);

      expect(mockRedirect).not.toHaveBeenCalled();
      expect(html).toContain("Media");
      expect(html).toContain("Pitch deck presentation");
      expect(html).toContain("Stock Pitch 2026");
    });

    it("fails closed with operational error state when database read throws", async () => {
      vi.mocked(authSession.getCurrentAdmin).mockResolvedValue(mockAdminUser);
      vi.mocked(prisma.media.findMany).mockRejectedValue(new Error("Neon connection timed out"));

      const element = await AdminMediaPage();
      expect(element).not.toBeNull();
      const html = renderToStaticMarkup(element!);

      // Verifies fail closed message
      expect(html).toContain("Live operational data is temporarily unavailable.");
      expect(html).toContain("Operational Data Temporarily Unavailable");
      // Must NOT render media management cards or empty state
      expect(html).not.toContain("No Media Assets Yet");
      // Must NOT expose raw Prisma/DB error
      expect(html).not.toContain("Neon connection timed out");
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 2. MediaManagementConsole Component                                        */
  /* -------------------------------------------------------------------------- */
  describe("2. MediaManagementConsole Component", () => {
    it("renders metrics counters and media items in initial view", () => {
      const html = renderToStaticMarkup(
        <MediaManagementConsole
          initialMedia={sampleMedia}
          events={sampleEvents}
          initialMetrics={sampleMetrics}
        />
      );

      // Metrics cards
      expect(html).toContain("Total Assets");
      expect(html).toContain("Visible");
      expect(html).toContain("Hidden");
      expect(html).toContain("Event Media");

      // Media item 1
      expect(html).toContain("Pitch deck presentation");
      expect(html).toContain("events/event-1/photo1.jpg");
      expect(html).toContain("Stock Pitch 2026");

      // Media item 2
      expect(html).toContain("gallery/photo2.png");
      expect(html).toContain("1 member");
    });

    it("renders empty state when 0 media assets exist in database", () => {
      const emptyMetrics: MediaMetrics = {
        total: 0,
        visible: 0,
        hidden: 0,
        eventMedia: 0,
      };

      const html = renderToStaticMarkup(
        <MediaManagementConsole
          initialMedia={[]}
          events={sampleEvents}
          initialMetrics={emptyMetrics}
        />
      );

      expect(html).toContain("No Media Assets Yet");
      expect(html).toContain("Upload First Asset");
    });

    it("renders action buttons including Upload Media and Search Input", () => {
      const html = renderToStaticMarkup(
        <MediaManagementConsole
          initialMedia={sampleMedia}
          events={sampleEvents}
          initialMetrics={sampleMetrics}
        />
      );

      expect(html).toContain("Upload Media");
      expect(html).toContain("Search alt text or filename...");
    });
  });
});
