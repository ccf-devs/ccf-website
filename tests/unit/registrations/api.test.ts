import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as registerHandler } from "@/app/api/events/[slug]/register/route";
import { GET as listRegistrationsHandler } from "@/app/api/admin/events/[id]/registrations/route";
import { DELETE as deleteRegistrationHandler } from "@/app/api/admin/events/[id]/registrations/[registrationId]/route";
import { getCurrentAdmin } from "@/lib/auth/session";
import { AdminRole, ParticipantType, RegistrationStatus } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import * as engine from "@/lib/registrations/engine";
import { RegistrationDomainError, RegistrationErrorCode } from "@/lib/registrations/types";

vi.mock("@/lib/auth/session", () => ({
  getCurrentAdmin: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  prisma: {
    event: {
      findUnique: vi.fn(),
    },
    registration: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/registrations/engine", () => ({
  executeRegistration: vi.fn(),
  deleteRegistrationByAdmin: vi.fn(),
  getEventRegistrationsForAdmin: vi.fn(),
}));

describe("Phase 8: API Route Handlers & Security (Areas J & L)", () => {
  const mockAdmin = {
    id: "admin-uuid-1",
    name: "Lead Admin",
    email: "lead@crescent.education",
    role: AdminRole.CCF_ADMIN,
    active: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/events/[slug]/register", () => {
    it("returns 201 with confirmation for valid registration", async () => {
      const mockConfirmation = {
        id: "reg-1",
        registrationCode: "CCF-MAGNORA2-A1B2C3D4",
        status: RegistrationStatus.ACTIVE,
        participantName: "John Doe",
        participantType: ParticipantType.CRESCENT,
        createdAt: new Date().toISOString(),
        event: { id: "ev-1", slug: "magnora-26", name: "Magnora’26" },
        payment: null,
      };

      (engine.executeRegistration as any).mockResolvedValue(mockConfirmation);

      const req = new NextRequest("http://localhost:3000/api/events/magnora-26/register", {
        method: "POST",
        body: JSON.stringify({
          participantType: "CRESCENT",
          responses: {
            participant_name: "John Doe",
            crescent_rrn: "210071601001",
          },
        }),
      });

      const res = await registerHandler(req, {
        params: Promise.resolve({ slug: "magnora-26" }),
      });
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.registration.registrationCode).toBe("CCF-MAGNORA2-A1B2C3D4");
    });

    it("returns 400 for malformed JSON request", async () => {
      const req = new NextRequest("http://localhost:3000/api/events/magnora-26/register", {
        method: "POST",
        body: "NOT_VALID_JSON",
      });

      const res = await registerHandler(req, {
        params: Promise.resolve({ slug: "magnora-26" }),
      });
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.code).toBe(RegistrationErrorCode.INVALID_REQUEST);
    });

    it("returns domain error status and code when engine throws RegistrationDomainError", async () => {
      (engine.executeRegistration as any).mockRejectedValue(
        new RegistrationDomainError(
          "This event has reached full capacity.",
          RegistrationErrorCode.EVENT_FULL,
          400
        )
      );

      const req = new NextRequest("http://localhost:3000/api/events/magnora-26/register", {
        method: "POST",
        body: JSON.stringify({
          participantType: "CRESCENT",
          responses: {
            participant_name: "John",
            crescent_rrn: "210071601001",
          },
        }),
      });

      const res = await registerHandler(req, {
        params: Promise.resolve({ slug: "magnora-26" }),
      });
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.code).toBe("EVENT_FULL");
      expect(data.error).toContain("reached full capacity");
    });

    it("suppresses internal database/Prisma errors and returns generic 500", async () => {
      // Raw SQL or Prisma exception simulation
      (engine.executeRegistration as any).mockRejectedValue(
        new Error("PrismaClientKnownRequestError: Unique constraint failed on the fields: (`registration_code`)")
      );

      const req = new NextRequest("http://localhost:3000/api/events/magnora-26/register", {
        method: "POST",
        body: JSON.stringify({
          participantType: "CRESCENT",
          responses: {
            participant_name: "John",
            crescent_rrn: "210071601001",
          },
        }),
      });

      const res = await registerHandler(req, {
        params: Promise.resolve({ slug: "magnora-26" }),
      });
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.code).toBe("INTERNAL_ERROR");
      expect(data.error).toBe("An internal error occurred while processing your registration.");
      // MUST NOT contain Prisma, SQL, or constraint details in response!
      expect(JSON.stringify(data)).not.toContain("Prisma");
      expect(JSON.stringify(data)).not.toContain("Unique constraint");
    });
  });

  describe("GET /api/admin/events/[id]/registrations", () => {
    it("rejects unauthenticated requests with 401", async () => {
      (getCurrentAdmin as any).mockResolvedValue(null);

      const req = new NextRequest("http://localhost:3000/api/admin/events/ev-1/registrations");
      const res = await listRegistrationsHandler(req, {
        params: Promise.resolve({ id: "ev-1" }),
      });

      expect(res.status).toBe(401);
    });

    it("returns registrations list for authorized admin", async () => {
      (getCurrentAdmin as any).mockResolvedValue(mockAdmin);
      (prisma.event.findUnique as any).mockResolvedValue({
        id: "ev-1",
        name: "Magnora’26",
        slug: "magnora-26",
        capacity: 100,
        capacityMode: "PARTICIPANTS",
      });
      (engine.getEventRegistrationsForAdmin as any).mockResolvedValue([
        {
          id: "reg-1",
          registrationCode: "CCF-MAGNORA2-A1B2C3D4",
          participantName: "Alice",
          status: "ACTIVE",
        },
      ]);

      const req = new NextRequest("http://localhost:3000/api/admin/events/ev-1/registrations");
      const res = await listRegistrationsHandler(req, {
        params: Promise.resolve({ id: "ev-1" }),
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.count).toBe(1);
      expect(data.registrations[0].participantName).toBe("Alice");
    });
  });

  describe("DELETE /api/admin/events/[id]/registrations/[registrationId]", () => {
    it("rejects unauthenticated deletion with 401", async () => {
      (getCurrentAdmin as any).mockResolvedValue(null);

      const req = new NextRequest("http://localhost:3000/api/admin/events/ev-1/registrations/reg-1", {
        method: "DELETE",
      });
      const res = await deleteRegistrationHandler(req, {
        params: Promise.resolve({ id: "ev-1", registrationId: "reg-1" }),
      });

      expect(res.status).toBe(401);
    });

    it("returns 404 if registration belongs to a different event", async () => {
      (getCurrentAdmin as any).mockResolvedValue(mockAdmin);
      (prisma.registration.findUnique as any).mockResolvedValue({
        id: "reg-1",
        eventId: "other-event-id", // Mismatched event!
      });

      const req = new NextRequest("http://localhost:3000/api/admin/events/ev-1/registrations/reg-1", {
        method: "DELETE",
      });
      const res = await deleteRegistrationHandler(req, {
        params: Promise.resolve({ id: "ev-1", registrationId: "reg-1" }),
      });

      expect(res.status).toBe(404);
    });

    it("successfully deletes registration and releases participation lock", async () => {
      (getCurrentAdmin as any).mockResolvedValue(mockAdmin);
      (prisma.registration.findUnique as any).mockResolvedValue({
        id: "reg-1",
        eventId: "ev-1",
      });
      (engine.deleteRegistrationByAdmin as any).mockResolvedValue({
        success: true,
        releasedParticipantName: "John Doe",
      });

      const req = new NextRequest("http://localhost:3000/api/admin/events/ev-1/registrations/reg-1", {
        method: "DELETE",
      });
      const res = await deleteRegistrationHandler(req, {
        params: Promise.resolve({ id: "ev-1", registrationId: "reg-1" }),
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain("John Doe");
    });
  });
});
