import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as listEvents, POST as createEvent } from "@/app/api/admin/events/route";
import { GET as getEvent, PATCH as patchEvent } from "@/app/api/admin/events/[id]/route";
import { AdminRole, EventStatus, EventCapacityMode, RegistrationMode, RegistrationMethod, PaymentMode } from "@prisma/client";
import { getCurrentAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";

// Mock auth session
vi.mock("@/lib/auth/session", () => ({
  getCurrentAdmin: vi.fn(),
}));

// Mock database client
vi.mock("@/lib/db/client", () => ({
  prisma: {
    event: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn((callback) =>
      callback({
        event: {
          create: vi.fn(),
          update: vi.fn(),
        },
        auditLog: {
          create: vi.fn(),
        },
      })
    ),
  },
}));

describe("Admin Event Management API Handlers (Phase 6)", () => {
  const mockAdmin = {
    id: "admin-uuid-1",
    name: "Lead Admin",
    email: "lead@crescent.education",
    role: AdminRole.CCF_ADMIN,
  };

  const mockItAdmin = {
    id: "admin-uuid-2",
    name: "IT Lead",
    email: "it@crescent.education",
    role: AdminRole.IT_ADMIN,
  };

  const sampleEvent = {
    id: "event-uuid-123",
    name: "Magnora’26 Finance Symposium",
    slug: "magnora-26",
    status: EventStatus.DRAFT,
    startsAt: new Date("2026-10-15T09:00:00.000Z"),
    endsAt: new Date("2026-10-15T17:00:00.000Z"),
    venue: "Crescent Auditorium",
    capacityMode: EventCapacityMode.UNLIMITED,
    capacity: null,
    registrationMode: RegistrationMode.NONE,
    registrationMethod: RegistrationMethod.NONE,
    eligibilityCrescent: false,
    eligibilityExternal: false,
    paymentMode: PaymentMode.FREE,
    paymentMethod: null,
    feeAmount: null,
    upiId: null,
    payeeName: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    content: {
      descriptionRich: "Symposium details",
      rulesRich: null,
      instructionsRich: null,
      eligibilityRich: null,
      notesRich: null,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. GET /api/admin/events (Listing)", () => {
    it("returns 401 Unauthorized when no admin session exists", async () => {
      vi.mocked(getCurrentAdmin).mockResolvedValue(null);

      const req = new NextRequest("http://localhost:3000/api/admin/events");
      const res = await listEvents(req);

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 200 and event list for authenticated CCF_ADMIN", async () => {
      vi.mocked(getCurrentAdmin).mockResolvedValue(mockAdmin);
      vi.mocked(prisma.event.findMany).mockResolvedValue([sampleEvent as any]);

      const req = new NextRequest("http://localhost:3000/api/admin/events");
      const res = await listEvents(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.events).toHaveLength(1);
      expect(data.events[0].name).toBe("Magnora’26 Finance Symposium");
    });

    it("supports IT_ADMIN with identical authorization permissions", async () => {
      vi.mocked(getCurrentAdmin).mockResolvedValue(mockItAdmin);
      vi.mocked(prisma.event.findMany).mockResolvedValue([]);

      const req = new NextRequest("http://localhost:3000/api/admin/events");
      const res = await listEvents(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.events).toEqual([]);
    });

    it("passes status query filter into Prisma where clause", async () => {
      vi.mocked(getCurrentAdmin).mockResolvedValue(mockAdmin);
      vi.mocked(prisma.event.findMany).mockResolvedValue([]);

      const req = new NextRequest("http://localhost:3000/api/admin/events?status=PUBLISHED");
      await listEvents(req);

      expect(prisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: EventStatus.PUBLISHED,
          }),
        })
      );
    });
  });

  describe("2. POST /api/admin/events (Creation)", () => {
    const validCreatePayload = {
      name: "FinRise’26 Workshop",
      slug: "finrise-26",
      status: EventStatus.DRAFT,
      startsAt: "2026-11-10T10:00:00.000Z",
      endsAt: "2026-11-10T16:00:00.000Z",
      venue: "Business School Hall",
      capacityMode: EventCapacityMode.PARTICIPANTS,
      capacity: 120,
      registrationMode: RegistrationMode.INTERNAL,
      registrationMethod: RegistrationMethod.BUILT_IN,
      eligibilityCrescent: true,
      eligibilityExternal: false,
      paymentMode: PaymentMode.FREE,
      descriptionRich: "Workshop overview",
    };

    it("returns 401 when unauthenticated", async () => {
      vi.mocked(getCurrentAdmin).mockResolvedValue(null);

      const req = new NextRequest("http://localhost:3000/api/admin/events", {
        method: "POST",
        body: JSON.stringify(validCreatePayload),
      });
      const res = await createEvent(req);
      expect(res.status).toBe(401);
    });

    it("returns 400 Bad Request on invalid input", async () => {
      vi.mocked(getCurrentAdmin).mockResolvedValue(mockAdmin);

      const req = new NextRequest("http://localhost:3000/api/admin/events", {
        method: "POST",
        body: JSON.stringify({ ...validCreatePayload, name: "" }), // empty name
      });
      const res = await createEvent(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Validation Error");
      expect(data.details.name).toBeDefined();
    });

    it("returns 409 Conflict when slug already exists", async () => {
      vi.mocked(getCurrentAdmin).mockResolvedValue(mockAdmin);
      vi.mocked(prisma.event.findUnique).mockResolvedValue({ id: "existing-uuid" } as any);

      const req = new NextRequest("http://localhost:3000/api/admin/events", {
        method: "POST",
        body: JSON.stringify(validCreatePayload),
      });
      const res = await createEvent(req);
      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.error).toContain("slug already exists");
    });

    it("creates event and logs audit trail with allowlist metadata on success", async () => {
      vi.mocked(getCurrentAdmin).mockResolvedValue(mockAdmin);
      vi.mocked(prisma.event.findUnique).mockResolvedValue(null);

      const mockTxEventCreate = vi.fn().mockResolvedValue({
        id: "new-event-uuid",
        ...validCreatePayload,
        startsAt: new Date(validCreatePayload.startsAt),
        endsAt: new Date(validCreatePayload.endsAt),
      });

      const mockTxAuditCreate = vi.fn().mockResolvedValue({ id: "audit-1" });

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        return callback({
          event: { create: mockTxEventCreate },
          auditLog: { create: mockTxAuditCreate },
        });
      });

      const req = new NextRequest("http://localhost:3000/api/admin/events", {
        method: "POST",
        body: JSON.stringify(validCreatePayload),
      });
      const res = await createEvent(req);

      expect(res.status).toBe(201);
      expect(mockTxEventCreate).toHaveBeenCalled();
      expect(mockTxAuditCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "EVENT_CREATED",
            entityType: "Event",
            entityId: "new-event-uuid",
            metadata: {
              eventId: "new-event-uuid",
              eventName: "FinRise’26 Workshop",
              slug: "finrise-26",
              status: EventStatus.DRAFT,
            },
          }),
        })
      );
    });
  });

  describe("3. GET /api/admin/events/[id] (Detail Retrieval)", () => {
    const routeParams = { params: Promise.resolve({ id: "event-uuid-123" }) };

    it("returns 401 when unauthenticated", async () => {
      vi.mocked(getCurrentAdmin).mockResolvedValue(null);

      const req = new NextRequest("http://localhost:3000/api/admin/events/event-uuid-123");
      const res = await getEvent(req, routeParams);
      expect(res.status).toBe(401);
    });

    it("returns 404 when event does not exist", async () => {
      vi.mocked(getCurrentAdmin).mockResolvedValue(mockAdmin);
      vi.mocked(prisma.event.findUnique).mockResolvedValue(null);

      const req = new NextRequest("http://localhost:3000/api/admin/events/event-uuid-123");
      const res = await getEvent(req, routeParams);
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe("Event not found");
    });

    it("returns 200 and event details when found", async () => {
      vi.mocked(getCurrentAdmin).mockResolvedValue(mockAdmin);
      vi.mocked(prisma.event.findUnique).mockResolvedValue(sampleEvent as any);

      const req = new NextRequest("http://localhost:3000/api/admin/events/event-uuid-123");
      const res = await getEvent(req, routeParams);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.event.id).toBe("event-uuid-123");
      expect(data.event.name).toBe("Magnora’26 Finance Symposium");
    });
  });

  describe("4. PATCH /api/admin/events/[id] (Update & Lifecycle Transitions)", () => {
    const routeParams = { params: Promise.resolve({ id: "event-uuid-123" }) };

    it("returns 401 when unauthenticated", async () => {
      vi.mocked(getCurrentAdmin).mockResolvedValue(null);

      const req = new NextRequest("http://localhost:3000/api/admin/events/event-uuid-123", {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated Name" }),
      });
      const res = await patchEvent(req, routeParams);
      expect(res.status).toBe(401);
    });

    it("returns 404 when event to patch does not exist", async () => {
      vi.mocked(getCurrentAdmin).mockResolvedValue(mockAdmin);
      vi.mocked(prisma.event.findUnique).mockResolvedValue(null);

      const req = new NextRequest("http://localhost:3000/api/admin/events/event-uuid-123", {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated Name" }),
      });
      const res = await patchEvent(req, routeParams);
      expect(res.status).toBe(404);
    });

    it("rejects modifications if event is in terminal ARCHIVED state", async () => {
      vi.mocked(getCurrentAdmin).mockResolvedValue(mockAdmin);
      vi.mocked(prisma.event.findUnique).mockResolvedValue({
        ...sampleEvent,
        status: EventStatus.ARCHIVED,
      } as any);

      const req = new NextRequest("http://localhost:3000/api/admin/events/event-uuid-123", {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated Name" }),
      });
      const res = await patchEvent(req, routeParams);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("Archived events cannot be modified");
    });

    it("rejects invalid lifecycle transition (Correction 1)", async () => {
      vi.mocked(getCurrentAdmin).mockResolvedValue(mockAdmin);
      vi.mocked(prisma.event.findUnique).mockResolvedValue({
        ...sampleEvent,
        status: EventStatus.DRAFT,
      } as any);

      // Attempting DRAFT -> CLOSED is invalid (must publish first)
      const req = new NextRequest("http://localhost:3000/api/admin/events/event-uuid-123", {
        method: "PATCH",
        body: JSON.stringify({ status: EventStatus.CLOSED }),
      });
      const res = await patchEvent(req, routeParams);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("Invalid status transition");
    });

    it("enforces cross-field validation after merging patch with existing state (Correction 2)", async () => {
      vi.mocked(getCurrentAdmin).mockResolvedValue(mockAdmin);
      vi.mocked(prisma.event.findUnique).mockResolvedValue({
        ...sampleEvent,
        startsAt: new Date("2026-10-15T09:00:00.000Z"),
        endsAt: new Date("2026-10-15T17:00:00.000Z"),
      } as any);

      // Patch provides an endsAt that is BEFORE the existing startsAt!
      const req = new NextRequest("http://localhost:3000/api/admin/events/event-uuid-123", {
        method: "PATCH",
        body: JSON.stringify({ endsAt: "2026-10-15T08:00:00.000Z" }),
      });
      const res = await patchEvent(req, routeParams);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Validation Error");
      expect(data.details.endsAt).toContain("after the start date");
    });

    it("updates event and records EVENT_STATUS_CHANGED in audit log when status changes", async () => {
      vi.mocked(getCurrentAdmin).mockResolvedValue(mockAdmin);
      vi.mocked(prisma.event.findUnique).mockResolvedValue({
        ...sampleEvent,
        status: EventStatus.DRAFT,
      } as any);

      const mockTxUpdate = vi.fn().mockResolvedValue({
        ...sampleEvent,
        status: EventStatus.PUBLISHED,
      });
      const mockTxAudit = vi.fn().mockResolvedValue({ id: "audit-2" });

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        return callback({
          event: { update: mockTxUpdate },
          auditLog: { create: mockTxAudit },
        });
      });

      const req = new NextRequest("http://localhost:3000/api/admin/events/event-uuid-123", {
        method: "PATCH",
        body: JSON.stringify({ status: EventStatus.PUBLISHED }),
      });
      const res = await patchEvent(req, routeParams);

      expect(res.status).toBe(200);
      expect(mockTxUpdate).toHaveBeenCalled();
      expect(mockTxAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "EVENT_STATUS_CHANGED",
            metadata: {
              eventId: "event-uuid-123",
              fromStatus: EventStatus.DRAFT,
              toStatus: EventStatus.PUBLISHED,
            },
          }),
        })
      );
    });
  });
});
