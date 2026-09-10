import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/admin/events/[id]/registrations/export/route";
import * as authSession from "@/lib/auth/session";
import * as auditLog from "@/lib/audit/log";
import * as regEngine from "@/lib/registrations/engine";
import { prisma } from "@/lib/db/client";
import { AdminRole, RegistrationStatus, RegistrationType, ParticipantType } from "@prisma/client";

// Mock dependencies
vi.mock("@/lib/auth/session", () => ({
  getCurrentAdmin: vi.fn(),
}));

vi.mock("@/lib/audit/log", () => ({
  createAuditLog: vi.fn().mockResolvedValue({ id: "audit-1" }),
  REGISTRATION_AUDIT_ACTIONS: {
    EXPORTED: "REGISTRATION_EXPORTED",
  },
  sanitizeAuditMetadata: vi.fn((meta) => meta),
}));

vi.mock("@/lib/registrations/engine", () => ({
  getEventRegistrationsForAdmin: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    event: {
      findUnique: vi.fn(),
    },
    eventField: {
      findMany: vi.fn(),
    },
  },
}));

describe("Admin Registrations Export API Unit Tests", () => {
  const validEventId = "11111111-2222-3333-4444-555555555555";
  const mockAdminUser = {
    id: "admin-uuid-1",
    email: "developers.ccf@gmail.com",
    name: "CCF Devs",
    role: AdminRole.CCF_ADMIN,
  };

  const sampleEvent = {
    id: validEventId,
    name: "Stock Pitch 2026",
    slug: "stock-pitch-2026",
    status: "PUBLISHED",
  };

  const sampleRegistrations = [
    {
      id: "reg-1",
      registrationCode: "CCF-PITCH-001",
      status: RegistrationStatus.ACTIVE,
      registrationType: RegistrationType.INDIVIDUAL,
      participantType: ParticipantType.CRESCENT,
      participantName: "Rohith Y",
      collegeNormalized: null,
      identifierNormalized: "210011601001",
      formVersionId: "fv-1",
      formVersionNumber: 1,
      createdAt: "2026-09-08T10:00:00.000Z",
      updatedAt: "2026-09-08T10:00:00.000Z",
      responses: [
        {
          fieldId: "field-1",
          fieldKey: "department",
          fieldLabel: "Academic Department",
          valueText: "IT",
          valueJson: null,
        },
      ],
      team: null,
      payment: null,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createRequest = (id: string = validEventId) => {
    return new NextRequest(
      `http://localhost:3000/api/admin/events/${id}/registrations/export`,
      { method: "GET" }
    );
  };

  /* -------------------------------------------------------------------------- */
  /* 1. Authentication & Authorization                                          */
  /* -------------------------------------------------------------------------- */
  describe("1. Authentication & Authorization", () => {
    it("returns 401 when unauthenticated", async () => {
      vi.mocked(authSession.getCurrentAdmin).mockResolvedValue(null);

      const res = await GET(createRequest(), {
        params: Promise.resolve({ id: validEventId }),
      });
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe("Authentication required.");
    });

    it("returns 403 when user is not CCF_ADMIN or IT_ADMIN", async () => {
      vi.mocked(authSession.getCurrentAdmin).mockResolvedValue({
        ...mockAdminUser,
        role: "MEMBER" as unknown as AdminRole,
      });

      const res = await GET(createRequest(), {
        params: Promise.resolve({ id: validEventId }),
      });
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error).toBe("Insufficient administrative permissions.");
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 2. Parameter Validation & Event Lookup                                     */
  /* -------------------------------------------------------------------------- */
  describe("2. Parameter Validation & Event Lookup", () => {
    it("returns 400 when event ID is not a valid UUID", async () => {
      vi.mocked(authSession.getCurrentAdmin).mockResolvedValue(mockAdminUser);

      const res = await GET(createRequest("not-a-uuid"), {
        params: Promise.resolve({ id: "not-a-uuid" }),
      });
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain("Invalid event ID format");
    });

    it("returns 404 when event record is not found in database", async () => {
      vi.mocked(authSession.getCurrentAdmin).mockResolvedValue(mockAdminUser);
      vi.mocked(prisma.event.findUnique).mockResolvedValue(null);

      const res = await GET(createRequest(), {
        params: Promise.resolve({ id: validEventId }),
      });
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toBe("Event not found.");
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 3. Successful CSV Generation & Download Response                           */
  /* -------------------------------------------------------------------------- */
  describe("3. Successful CSV Generation & Download Response", () => {
    it("returns 200 with text/csv, attachment header, and CSV body", async () => {
      vi.mocked(authSession.getCurrentAdmin).mockResolvedValue(mockAdminUser);
      vi.mocked(prisma.event.findUnique).mockResolvedValue(sampleEvent as any);
      vi.mocked(regEngine.getEventRegistrationsForAdmin).mockResolvedValue(
        sampleRegistrations as any
      );
      vi.mocked(prisma.eventField.findMany).mockResolvedValue([
        {
          id: "field-1",
          formVersionId: "fv-1",
          key: "department",
          label: "Academic Department",
          displayOrder: 1,
        } as any,
      ]);

      const res = await GET(createRequest(), {
        params: Promise.resolve({ id: validEventId }),
      });

      expect(res.status).toBe(200);

      // Check Content-Type
      expect(res.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");

      // Check Content-Disposition
      const disposition = res.headers.get("Content-Disposition");
      expect(disposition).toContain("attachment; filename=");
      expect(disposition).toContain("CCF_stock-pitch-2026_Registrations_");
      expect(disposition).toContain(".csv");

      // Check CSV body content
      const buffer = Buffer.from(await res.arrayBuffer());
      // UTF-8 BOM is 0xEF, 0xBB, 0xBF
      expect(buffer[0]).toBe(0xef);
      expect(buffer[1]).toBe(0xbb);
      expect(buffer[2]).toBe(0xbf);

      const body = buffer.toString("utf-8");
      expect(body).toContain("Event,Event Slug,Registration Code");
      expect(body).toContain("Stock Pitch 2026");
      expect(body).toContain("CCF-PITCH-001");
      expect(body).toContain("Rohith Y");
      expect(body).toContain("Academic Department");
      expect(body).toContain("IT");
    });

    it("records REGISTRATION_EXPORTED audit log without participant PII", async () => {
      vi.mocked(authSession.getCurrentAdmin).mockResolvedValue(mockAdminUser);
      vi.mocked(prisma.event.findUnique).mockResolvedValue(sampleEvent as any);
      vi.mocked(regEngine.getEventRegistrationsForAdmin).mockResolvedValue(
        sampleRegistrations as any
      );
      vi.mocked(prisma.eventField.findMany).mockResolvedValue([]);

      const res = await GET(createRequest(), {
        params: Promise.resolve({ id: validEventId }),
      });

      expect(res.status).toBe(200);

      expect(auditLog.createAuditLog).toHaveBeenCalledTimes(1);
      const auditCall = vi.mocked(auditLog.createAuditLog).mock.calls[0][0];

      expect(auditCall.actorId).toBe("admin-uuid-1");
      expect(auditCall.action).toBe("REGISTRATION_EXPORTED");
      expect(auditCall.entityType).toBe("Event");
      expect(auditCall.entityId).toBe(validEventId);

      // Verify audit metadata strictly omits PII
      const metadata = auditCall.metadata as Record<string, any>;
      expect(metadata.eventId).toBe(validEventId);
      expect(metadata.eventSlug).toBe("stock-pitch-2026");
      expect(metadata.eventName).toBe("Stock Pitch 2026");
      expect(metadata.registrationCount).toBe(1);
      expect(metadata.format).toBe("csv");

      // Must NOT contain personal details
      expect(metadata.participantName).toBeUndefined();
      expect(metadata.identifierNormalized).toBeUndefined();
      expect(metadata.phone).toBeUndefined();
      expect(metadata.responses).toBeUndefined();
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 4. Failure Handling & Audit Safety                                         */
  /* -------------------------------------------------------------------------- */
  describe("4. Failure Handling & Audit Safety", () => {
    it("returns safe 500 and does NOT record audit log if database read throws", async () => {
      vi.mocked(authSession.getCurrentAdmin).mockResolvedValue(mockAdminUser);
      vi.mocked(prisma.event.findUnique).mockResolvedValue(sampleEvent as any);
      vi.mocked(regEngine.getEventRegistrationsForAdmin).mockRejectedValue(
        new Error("Postgres connection timeout")
      );

      const res = await GET(createRequest(), {
        params: Promise.resolve({ id: validEventId }),
      });
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe("Failed to export event registrations.");
      // Must NOT expose internal database error details
      expect(JSON.stringify(data)).not.toContain("Postgres connection timeout");

      // Must NOT emit a false positive audit record on failed export
      expect(auditLog.createAuditLog).not.toHaveBeenCalled();
    });
  });
});
