import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  executeRegistration,
  deleteRegistrationByAdmin,
  getEventRegistrationsForAdmin,
} from "@/lib/registrations/engine";
import {
  RegistrationDomainError,
  RegistrationErrorCode,
} from "@/lib/registrations/types";
import {
  EventStatus,
  RegistrationMode,
  RegistrationMethod,
  ParticipantType,
  RegistrationType,
  EventCapacityMode,
  PaymentMode,
  PaymentMethod,
  PaymentStatus,
  FieldType,
  FieldScope,
} from "@prisma/client";
import { prisma } from "@/lib/db/client";

// Mock Prisma client
vi.mock("@/lib/db/client", () => ({
  prisma: {
    event: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    registration: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    registrationResponse: {
      create: vi.fn(),
    },
    eventParticipant: {
      create: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
    },
    team: {
      create: vi.fn(),
    },
    teamMember: {
      create: vi.fn(),
    },
    payment: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// Mock audit log
vi.mock("@/lib/audit/log", () => ({
  createAuditLog: vi.fn().mockResolvedValue({ id: "audit-uuid" }),
}));

describe("Phase 8: Registration Engine (Areas A, B, C, F, G, H, K, L)", () => {
  const baseEvent = {
    id: "event-uuid-1",
    slug: "magnora-26",
    name: "Magnora’26",
    status: EventStatus.PUBLISHED,
    registrationMode: RegistrationMode.INTERNAL,
    registrationMethod: RegistrationMethod.BUILT_IN,
    eligibilityCrescent: true,
    eligibilityExternal: true,
    capacity: 100,
    capacityMode: EventCapacityMode.PARTICIPANTS,
    paymentMode: PaymentMode.FREE,
    paymentMethod: null,
    feeAmount: null,
    upiId: null,
    payeeName: null,
    registrationOpensAt: new Date(Date.now() - 3600000), // 1 hour ago
    registrationClosesAt: new Date(Date.now() + 86400000), // 1 day future
    activeFormVersionId: "fv-uuid-1",
    activeFormVersion: {
      id: "fv-uuid-1",
      versionNumber: 1,
      eventFields: [
        {
          id: "field-type-id",
          formVersionId: "fv-uuid-1",
          key: "participant_type",
          label: "Category",
          type: FieldType.RADIO,
          fieldScope: FieldScope.PARTICIPANT,
          required: true,
          displayOrder: 1,
          config: { options: ["CRESCENT", "EXTERNAL"], isSystem: true, systemKey: "participant_type" },
          validation: null,
          conditionalLogic: null,
        },
        {
          id: "field-name-id",
          formVersionId: "fv-uuid-1",
          key: "participant_name",
          label: "Full Name",
          type: FieldType.TEXT,
          fieldScope: FieldScope.PARTICIPANT,
          required: true,
          displayOrder: 2,
          config: { isSystem: true, systemKey: "name" },
          validation: null,
          conditionalLogic: null,
        },
        {
          id: "field-rrn-id",
          formVersionId: "fv-uuid-1",
          key: "crescent_rrn",
          label: "Crescent RRN",
          type: FieldType.TEXT,
          fieldScope: FieldScope.PARTICIPANT,
          required: true,
          displayOrder: 3,
          config: { isSystem: true, systemKey: "crescent_rrn" },
          validation: { pattern: "^2\\d{11}$" },
          conditionalLogic: {
            dependsOn: "participant_type",
            operator: "equals",
            value: "CRESCENT",
          },
        },
        {
          id: "field-college-id",
          formVersionId: "fv-uuid-1",
          key: "college_name",
          label: "College Name",
          type: FieldType.TEXT,
          fieldScope: FieldScope.PARTICIPANT,
          required: true,
          displayOrder: 4,
          config: { isSystem: true, systemKey: "college" },
          validation: null,
          conditionalLogic: {
            dependsOn: "participant_type",
            operator: "equals",
            value: "EXTERNAL",
          },
        },
        {
          id: "field-roll-id",
          formVersionId: "fv-uuid-1",
          key: "external_roll_number",
          label: "College Roll Number",
          type: FieldType.TEXT,
          fieldScope: FieldScope.PARTICIPANT,
          required: true,
          displayOrder: 5,
          config: { isSystem: true, systemKey: "external_roll" },
          validation: null,
          conditionalLogic: {
            dependsOn: "participant_type",
            operator: "equals",
            value: "EXTERNAL",
          },
        },
      ],
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default transaction implementation
    (prisma.$transaction as any).mockImplementation(async (callback: any) => {
      return callback({
        $queryRaw: vi.fn().mockResolvedValue([
          {
            id: "event-uuid-1",
            capacity: 100,
            capacity_mode: EventCapacityMode.PARTICIPANTS,
            status: EventStatus.PUBLISHED,
          },
        ]),
        eventParticipant: {
          count: vi.fn().mockResolvedValue(10),
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({ id: "ep-1" }),
        },
        registration: {
          count: vi.fn().mockResolvedValue(10),
          create: vi.fn().mockResolvedValue({
            id: "reg-uuid-1",
            eventId: "event-uuid-1",
            formVersionId: "fv-uuid-1",
            registrationCode: "CCF-MAGNORA2-A1B2C3D4",
            participantName: "Test Student",
            participantType: ParticipantType.CRESCENT,
            status: "ACTIVE",
            registrationType: "INDIVIDUAL",
            createdAt: new Date(),
          }),
          findUnique: vi.fn().mockResolvedValue({
            id: "reg-uuid-1",
            eventId: "event-uuid-1",
            participantName: "Test Student",
            participantType: ParticipantType.CRESCENT,
            registrationCode: "CCF-MAGNORA2-A1B2C3D4",
            event: { id: "event-uuid-1", name: "Magnora’26", slug: "magnora-26" },
          }),
          delete: vi.fn().mockResolvedValue({ id: "reg-uuid-1" }),
        },
        registrationResponse: {
          create: vi.fn().mockResolvedValue({ id: "resp-1" }),
        },
        team: {
          create: vi.fn().mockResolvedValue({ id: "team-1" }),
        },
        teamMember: {
          create: vi.fn().mockResolvedValue({ id: "member-1" }),
        },
        payment: {
          create: vi.fn().mockImplementation(async ({ data }: any) => ({
            id: "pay-1",
            ...data,
          })),
        },
      });
    });
  });

  describe("Basic Registration (Area A) & Form Version Association (Area B)", () => {
    it("successfully creates a Crescent registration referencing active FormVersion", async () => {
      (prisma.event.findUnique as any).mockResolvedValue(baseEvent);

      const result = await executeRegistration("magnora-26", {
        participantType: ParticipantType.CRESCENT,
        responses: {
          participant_type: "CRESCENT",
          participant_name: "John Crescent",
          crescent_rrn: "210071601001",
        },
      });

      expect(result).toBeDefined();
      expect(result.id).toBe("reg-uuid-1");
      expect(result.registrationCode).toBe("CCF-MAGNORA2-A1B2C3D4");
      expect(result.event.slug).toBe("magnora-26");
      expect(result.status).toBe("ACTIVE");
      expect(result.payment).toBeNull(); // FREE event
    });

    it("successfully creates an External registration", async () => {
      (prisma.event.findUnique as any).mockResolvedValue(baseEvent);

      const result = await executeRegistration("magnora-26", {
        participantType: ParticipantType.EXTERNAL,
        responses: {
          participant_type: "EXTERNAL",
          participant_name: "External Student",
          college_name: "Loyola College",
          external_roll_number: "22-CS-101",
        },
      });

      expect(result).toBeDefined();
      expect(result.id).toBe("reg-uuid-1");
    });

    it("rejects registration if event has no active published form version", async () => {
      (prisma.event.findUnique as any).mockResolvedValue({
        ...baseEvent,
        activeFormVersionId: null,
        activeFormVersion: null,
      });

      await expect(
        executeRegistration("magnora-26", {
          participantType: ParticipantType.CRESCENT,
          responses: {},
        })
      ).rejects.toThrow(RegistrationDomainError);
    });
  });

  describe("Eligibility Validation (Area C)", () => {
    it("rejects Crescent participant when eligibilityCrescent is false", async () => {
      (prisma.event.findUnique as any).mockResolvedValue({
        ...baseEvent,
        eligibilityCrescent: false,
      });

      await expect(
        executeRegistration("magnora-26", {
          participantType: ParticipantType.CRESCENT,
          responses: {
            participant_type: "CRESCENT",
            participant_name: "John Crescent",
            crescent_rrn: "210071601001",
          },
        })
      ).rejects.toThrowError(/not open to Crescent students/);
    });

    it("rejects External participant when eligibilityExternal is false", async () => {
      (prisma.event.findUnique as any).mockResolvedValue({
        ...baseEvent,
        eligibilityExternal: false,
      });

      await expect(
        executeRegistration("magnora-26", {
          participantType: ParticipantType.EXTERNAL,
          responses: {
            participant_type: "EXTERNAL",
            participant_name: "External Student",
            college_name: "IIT Madras",
            external_roll_number: "CS2101",
          },
        })
      ).rejects.toThrowError(/not open to external participants/);
    });
  });

  describe("Registration Window (Area G)", () => {
    it("rejects registration before opening window", async () => {
      (prisma.event.findUnique as any).mockResolvedValue({
        ...baseEvent,
        registrationOpensAt: new Date(Date.now() + 3600000), // 1 hour in future
      });

      await expect(
        executeRegistration("magnora-26", {
          participantType: ParticipantType.CRESCENT,
          responses: {
            participant_type: "CRESCENT",
            participant_name: "John",
            crescent_rrn: "210071601001",
          },
        })
      ).rejects.toThrowError(/not opened yet/);
    });

    it("rejects registration after closing window", async () => {
      (prisma.event.findUnique as any).mockResolvedValue({
        ...baseEvent,
        registrationClosesAt: new Date(Date.now() - 3600000), // 1 hour ago
      });

      await expect(
        executeRegistration("magnora-26", {
          participantType: ParticipantType.CRESCENT,
          responses: {
            participant_type: "CRESCENT",
            participant_name: "John",
            crescent_rrn: "210071601001",
          },
        })
      ).rejects.toThrowError(/has closed/);
    });
  });

  describe("Duplicate Protection & Identity Locking (Area F)", () => {
    it("rejects duplicate active Crescent registration for the same event", async () => {
      (prisma.event.findUnique as any).mockResolvedValue(baseEvent);

      (prisma.$transaction as any).mockImplementation(async (callback: any) => {
        return callback({
          $queryRaw: vi.fn().mockResolvedValue([
            {
              id: "event-uuid-1",
              capacity: 100,
              capacity_mode: EventCapacityMode.PARTICIPANTS,
              status: EventStatus.PUBLISHED,
            },
          ]),
          eventParticipant: {
            count: vi.fn().mockResolvedValue(10),
            findFirst: vi.fn().mockResolvedValue({ id: "existing-ep" }), // duplicate found!
          },
        });
      });

      await expect(
        executeRegistration("magnora-26", {
          participantType: ParticipantType.CRESCENT,
          responses: {
            participant_type: "CRESCENT",
            participant_name: "John",
            crescent_rrn: "210071601001",
          },
        })
      ).rejects.toThrowError(/already actively registered/);
    });

    it("rejects duplicate active External registration for the same event + college + roll", async () => {
      (prisma.event.findUnique as any).mockResolvedValue(baseEvent);

      (prisma.$transaction as any).mockImplementation(async (callback: any) => {
        return callback({
          $queryRaw: vi.fn().mockResolvedValue([
            {
              id: "event-uuid-1",
              capacity: 100,
              capacity_mode: EventCapacityMode.PARTICIPANTS,
              status: EventStatus.PUBLISHED,
            },
          ]),
          eventParticipant: {
            count: vi.fn().mockResolvedValue(10),
            findFirst: vi.fn().mockResolvedValue({ id: "existing-ep-external" }),
          },
        });
      });

      await expect(
        executeRegistration("magnora-26", {
          participantType: ParticipantType.EXTERNAL,
          responses: {
            participant_type: "EXTERNAL",
            participant_name: "Jane",
            college_name: "Loyola College",
            external_roll_number: "22-CS-101",
          },
        })
      ).rejects.toThrowError(/already actively registered/);
    });

    it("intercepts database unique constraint violation (P2002) from partial unique index on primary participant and maps to DUPLICATE_REGISTRATION", async () => {
      (prisma.event.findUnique as any).mockResolvedValue(baseEvent);

      (prisma.$transaction as any).mockImplementation(async (callback: any) => {
        return callback({
          $queryRaw: vi.fn().mockResolvedValue([
            {
              id: "event-uuid-1",
              capacity: 100,
              capacity_mode: EventCapacityMode.PARTICIPANTS,
              status: EventStatus.PUBLISHED,
            },
          ]),
          eventParticipant: {
            count: vi.fn().mockResolvedValue(10),
            findFirst: vi.fn().mockResolvedValue(null), // passes application pre-check
            create: vi.fn().mockRejectedValue({
              code: "P2002",
              name: "PrismaClientKnownRequestError",
              meta: { target: ["ep_crescent_unique"] },
            }),
          },
          registration: {
            create: vi.fn().mockResolvedValue({
              id: "reg-uuid-1",
              eventId: "event-uuid-1",
              formVersionId: "fv-uuid-1",
              registrationCode: "CCF-MAGNORA2-A1B2C3D4",
              participantName: "Test Student",
              participantType: ParticipantType.CRESCENT,
              status: "ACTIVE",
              registrationType: "INDIVIDUAL",
              createdAt: new Date(),
            }),
          },
          registrationResponse: {
            create: vi.fn().mockResolvedValue({ id: "resp-1" }),
          },
        });
      });

      try {
        await executeRegistration("magnora-26", {
          participantType: ParticipantType.CRESCENT,
          responses: {
            participant_type: "CRESCENT",
            participant_name: "John Crescent",
            crescent_rrn: "210071601001",
          },
        });
        expect.unreachable("Should have thrown RegistrationDomainError");
      } catch (err: any) {
        expect(err).toBeInstanceOf(RegistrationDomainError);
        expect(err.code).toBe(RegistrationErrorCode.DUPLICATE_REGISTRATION);
        expect(err.statusCode).toBe(400);
      }
    });

    it("intercepts database unique constraint violation (P2002) on team member and maps to PARTICIPATION_LOCKED", async () => {
      (prisma.event.findUnique as any).mockResolvedValue({
        ...baseEvent,
        registrationType: RegistrationType.TEAM,
      });

      let epCallCount = 0;
      (prisma.$transaction as any).mockImplementation(async (callback: any) => {
        return callback({
          $queryRaw: vi.fn().mockResolvedValue([
            {
              id: "event-uuid-1",
              capacity: 100,
              capacity_mode: EventCapacityMode.PARTICIPANTS,
              status: EventStatus.PUBLISHED,
            },
          ]),
          eventParticipant: {
            count: vi.fn().mockResolvedValue(10),
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockImplementation(async () => {
              epCallCount++;
              if (epCallCount === 1) {
                return { id: "ep-1" };
              }
              throw {
                code: "P2002",
                name: "PrismaClientKnownRequestError",
                meta: { target: ["ep_crescent_unique"] },
              };
            }),
          },
          registration: {
            create: vi.fn().mockResolvedValue({
              id: "reg-uuid-1",
              eventId: "event-uuid-1",
              formVersionId: "fv-uuid-1",
              registrationCode: "CCF-MAGNORA2-A1B2C3D4",
              participantName: "Leader",
              participantType: ParticipantType.CRESCENT,
              status: "ACTIVE",
              registrationType: "TEAM",
              createdAt: new Date(),
            }),
          },
          registrationResponse: {
            create: vi.fn().mockResolvedValue({ id: "resp-1" }),
          },
          team: {
            create: vi.fn().mockResolvedValue({ id: "team-1" }),
          },
          teamMember: {
            create: vi.fn().mockResolvedValue({ id: "member-1" }),
          },
        });
      });

      try {
        await executeRegistration("magnora-26", {
          registrationType: RegistrationType.TEAM,
          participantType: ParticipantType.CRESCENT,
          team: {
            name: "Alpha Squad",
            members: [
              {
                name: "Leader",
                participantType: ParticipantType.CRESCENT,
                identifierNormalized: "210071601001",
                isLeader: true,
              },
              {
                name: "Member 2",
                participantType: ParticipantType.CRESCENT,
                identifierNormalized: "210071601002",
                isLeader: false,
              },
            ],
          },
          responses: {
            participant_type: "CRESCENT",
            participant_name: "Leader",
            crescent_rrn: "210071601001",
          },
        });
        expect.unreachable("Should have thrown RegistrationDomainError");
      } catch (err: any) {
        expect(err).toBeInstanceOf(RegistrationDomainError);
        expect(err.code).toBe(RegistrationErrorCode.PARTICIPATION_LOCKED);
        expect(err.statusCode).toBe(400);
      }
    });

    it("does not classify non-P2002 Prisma KnownRequestError as duplicate error and re-throws original error", async () => {
      (prisma.event.findUnique as any).mockResolvedValue(baseEvent);

      const nonP2002Error = {
        code: "P2003",
        name: "PrismaClientKnownRequestError",
        message: "Foreign key constraint failed",
      };

      (prisma.$transaction as any).mockImplementation(async (callback: any) => {
        return callback({
          $queryRaw: vi.fn().mockResolvedValue([
            {
              id: "event-uuid-1",
              capacity: 100,
              capacity_mode: EventCapacityMode.PARTICIPANTS,
              status: EventStatus.PUBLISHED,
            },
          ]),
          eventParticipant: {
            count: vi.fn().mockResolvedValue(10),
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockRejectedValue(nonP2002Error),
          },
          registration: {
            create: vi.fn().mockResolvedValue({
              id: "reg-uuid-1",
              eventId: "event-uuid-1",
              formVersionId: "fv-uuid-1",
              registrationCode: "CCF-MAGNORA2-A1B2C3D4",
              participantName: "Test Student",
              participantType: ParticipantType.CRESCENT,
              status: "ACTIVE",
              registrationType: "INDIVIDUAL",
              createdAt: new Date(),
            }),
          },
          registrationResponse: {
            create: vi.fn().mockResolvedValue({ id: "resp-1" }),
          },
        });
      });

      try {
        await executeRegistration("magnora-26", {
          participantType: ParticipantType.CRESCENT,
          responses: {
            participant_type: "CRESCENT",
            participant_name: "John Crescent",
            crescent_rrn: "210071601001",
          },
        });
        expect.unreachable("Should have rethrown non-P2002 error");
      } catch (err: any) {
        expect(err).not.toBeInstanceOf(RegistrationDomainError);
        expect(err.code).toBe("P2003");
      }
    });
  });

  describe("Team Semantics & Identity Locking (Area I)", () => {
    it("creates team registration with exactly one EventParticipant lock per unique student and no duplicate leader lock", async () => {
      (prisma.event.findUnique as any).mockResolvedValue({
        ...baseEvent,
        registrationType: RegistrationType.TEAM,
      });

      const epCreateMock = vi.fn().mockResolvedValue({ id: "ep-id" });
      const tmCreateMock = vi.fn().mockResolvedValue({ id: "tm-id" });

      (prisma.$transaction as any).mockImplementation(async (callback: any) => {
        return callback({
          $queryRaw: vi.fn().mockResolvedValue([
            {
              id: "event-uuid-1",
              capacity: 100,
              capacity_mode: EventCapacityMode.PARTICIPANTS,
              status: EventStatus.PUBLISHED,
            },
          ]),
          eventParticipant: {
            count: vi.fn().mockResolvedValue(10),
            findFirst: vi.fn().mockResolvedValue(null),
            create: epCreateMock,
          },
          registration: {
            create: vi.fn().mockResolvedValue({
              id: "reg-uuid-1",
              eventId: "event-uuid-1",
              formVersionId: "fv-uuid-1",
              registrationCode: "CCF-MAGNORA2-A1B2C3D4",
              participantName: "Leader Student",
              participantType: ParticipantType.CRESCENT,
              status: "ACTIVE",
              registrationType: "TEAM",
              createdAt: new Date(),
            }),
          },
          registrationResponse: {
            create: vi.fn().mockResolvedValue({ id: "resp-1" }),
          },
          team: {
            create: vi.fn().mockResolvedValue({ id: "team-1" }),
          },
          teamMember: {
            create: tmCreateMock,
          },
        });
      });

      const result = await executeRegistration("magnora-26", {
        registrationType: RegistrationType.TEAM,
        participantType: ParticipantType.CRESCENT,
        team: {
          name: "Finance Trio",
          members: [
            {
              name: "Leader Student",
              participantType: ParticipantType.CRESCENT,
              identifierNormalized: "210071601001",
              isLeader: true,
            },
            {
              name: "Member Two",
              participantType: ParticipantType.CRESCENT,
              identifierNormalized: "210071601002",
              isLeader: false,
            },
            {
              name: "Member Three",
              participantType: ParticipantType.CRESCENT,
              identifierNormalized: "210071601003",
              isLeader: false,
            },
          ],
        },
        responses: {
          participant_type: "CRESCENT",
          participant_name: "Leader Student",
          crescent_rrn: "210071601001",
        },
      });

      expect(result).toBeDefined();
      // Exactly 3 EventParticipant locks created: 1 for primary in Step H + 2 for additional members in Step I
      expect(epCreateMock).toHaveBeenCalledTimes(3);
      // Exactly 3 TeamMember records created
      expect(tmCreateMock).toHaveBeenCalledTimes(3);
      // Ensure leader is marked as leader in team members
      expect(tmCreateMock.mock.calls[0][0].data.isLeader).toBe(true);
    });

    it("rejects team registration when primary participant is not included in the team members roster", async () => {
      (prisma.event.findUnique as any).mockResolvedValue({
        ...baseEvent,
        registrationType: RegistrationType.TEAM,
      });

      await expect(
        executeRegistration("magnora-26", {
          registrationType: RegistrationType.TEAM,
          participantType: ParticipantType.CRESCENT,
          team: {
            name: "Orphaned Team",
            members: [
              {
                name: "Member Two",
                participantType: ParticipantType.CRESCENT,
                identifierNormalized: "210071601002",
                isLeader: true,
              },
              {
                name: "Member Three",
                participantType: ParticipantType.CRESCENT,
                identifierNormalized: "210071601003",
                isLeader: false,
              },
            ],
          },
          responses: {
            participant_type: "CRESCENT",
            participant_name: "Leader Student",
            crescent_rrn: "210071601001", // not in team.members!
          },
        })
      ).rejects.toThrowError(/primary participant \(team leader\) must be included/);
    });

    it("rejects team registration if another member has isLeader=true", async () => {
      (prisma.event.findUnique as any).mockResolvedValue({
        ...baseEvent,
        registrationType: RegistrationType.TEAM,
      });

      await expect(
        executeRegistration("magnora-26", {
          registrationType: RegistrationType.TEAM,
          participantType: ParticipantType.CRESCENT,
          team: {
            name: "Duplicate Leader Team",
            members: [
              {
                name: "Leader Student",
                participantType: ParticipantType.CRESCENT,
                identifierNormalized: "210071601001",
                isLeader: true,
              },
              {
                name: "Member Two",
                participantType: ParticipantType.CRESCENT,
                identifierNormalized: "210071601002",
                isLeader: true, // Invalid! Another member has isLeader=true
              },
            ],
          },
          responses: {
            participant_type: "CRESCENT",
            participant_name: "Leader Student",
            crescent_rrn: "210071601001",
          },
        })
      ).rejects.toThrowError(/Only the primary registrant can be designated as the team leader/);
    });

    it("normalizes primary participant isLeader to true even if submitted as false", async () => {
      (prisma.event.findUnique as any).mockResolvedValue({
        ...baseEvent,
        registrationType: RegistrationType.TEAM,
      });

      const tmCreateMock = vi.fn().mockResolvedValue({ id: "tm-id" });

      (prisma.$transaction as any).mockImplementation(async (callback: any) => {
        return callback({
          $queryRaw: vi.fn().mockResolvedValue([
            {
              id: "event-uuid-1",
              capacity: 100,
              capacity_mode: EventCapacityMode.PARTICIPANTS,
              status: EventStatus.PUBLISHED,
            },
          ]),
          eventParticipant: {
            count: vi.fn().mockResolvedValue(10),
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue({ id: "ep-id" }),
          },
          registration: {
            create: vi.fn().mockResolvedValue({
              id: "reg-uuid-1",
              eventId: "event-uuid-1",
              formVersionId: "fv-uuid-1",
              registrationCode: "CCF-MAGNORA2-A1B2C3D4",
              participantName: "Leader Student",
              participantType: ParticipantType.CRESCENT,
              status: "ACTIVE",
              registrationType: "TEAM",
              createdAt: new Date(),
            }),
          },
          registrationResponse: {
            create: vi.fn().mockResolvedValue({ id: "resp-1" }),
          },
          team: {
            create: vi.fn().mockResolvedValue({ id: "team-1" }),
          },
          teamMember: {
            create: tmCreateMock,
          },
        });
      });

      const result = await executeRegistration("magnora-26", {
        registrationType: RegistrationType.TEAM,
        participantType: ParticipantType.CRESCENT,
        team: {
          name: "Finance Duo",
          members: [
            {
              name: "Leader Student",
              participantType: ParticipantType.CRESCENT,
              identifierNormalized: "210071601001",
              isLeader: false, // Submitted as false
            },
            {
              name: "Member Two",
              participantType: ParticipantType.CRESCENT,
              identifierNormalized: "210071601002",
              isLeader: false,
            },
          ],
        },
        responses: {
          participant_type: "CRESCENT",
          participant_name: "Leader Student",
          crescent_rrn: "210071601001",
        },
      });

      expect(result).toBeDefined();
      // Primary participant is normalized to isLeader: true
      expect(tmCreateMock.mock.calls[0][0].data.isLeader).toBe(true);
      // Secondary participant remains isLeader: false
      expect(tmCreateMock.mock.calls[1][0].data.isLeader).toBe(false);
    });

    it("calculates participant-based capacity correctly using the full team roster", async () => {
      (prisma.event.findUnique as any).mockResolvedValue({
        ...baseEvent,
        capacity: 2, // Only 2 spots left
        capacityMode: EventCapacityMode.PARTICIPANTS,
      });

      (prisma.$transaction as any).mockImplementation(async (callback: any) => {
        return callback({
          $queryRaw: vi.fn().mockResolvedValue([
            {
              id: "event-uuid-1",
              capacity: 2,
              capacity_mode: EventCapacityMode.PARTICIPANTS,
              status: EventStatus.PUBLISHED,
            },
          ]),
          eventParticipant: {
            count: vi.fn().mockResolvedValue(0), // 0 existing + 3 incoming = 3 > 2!
            findFirst: vi.fn().mockResolvedValue(null),
          },
        });
      });

      await expect(
        executeRegistration("magnora-26", {
          registrationType: RegistrationType.TEAM,
          participantType: ParticipantType.CRESCENT,
          team: {
            name: "Three Musketeers",
            members: [
              {
                name: "Leader",
                participantType: ParticipantType.CRESCENT,
                identifierNormalized: "210071601001",
                isLeader: true,
              },
              {
                name: "Member 2",
                participantType: ParticipantType.CRESCENT,
                identifierNormalized: "210071601002",
                isLeader: false,
              },
              {
                name: "Member 3",
                participantType: ParticipantType.CRESCENT,
                identifierNormalized: "210071601003",
                isLeader: false,
              },
            ],
          },
          responses: {
            participant_type: "CRESCENT",
            participant_name: "Leader",
            crescent_rrn: "210071601001",
          },
        })
      ).rejects.toThrowError(/reached full capacity/);
    });

    it("supports mixed teams with Crescent and External participants without collision", async () => {
      (prisma.event.findUnique as any).mockResolvedValue({
        ...baseEvent,
        registrationType: RegistrationType.TEAM,
        eligibilityCrescent: true,
        eligibilityExternal: true,
      });

      const epCreateMock = vi.fn().mockResolvedValue({ id: "ep-id" });

      (prisma.$transaction as any).mockImplementation(async (callback: any) => {
        return callback({
          $queryRaw: vi.fn().mockResolvedValue([
            {
              id: "event-uuid-1",
              capacity: 100,
              capacity_mode: EventCapacityMode.PARTICIPANTS,
              status: EventStatus.PUBLISHED,
            },
          ]),
          eventParticipant: {
            count: vi.fn().mockResolvedValue(5),
            findFirst: vi.fn().mockResolvedValue(null),
            create: epCreateMock,
          },
          registration: {
            create: vi.fn().mockResolvedValue({
              id: "reg-uuid-1",
              eventId: "event-uuid-1",
              formVersionId: "fv-uuid-1",
              registrationCode: "CCF-MAGNORA2-A1B2C3D4",
              participantName: "Crescent Leader",
              participantType: ParticipantType.CRESCENT,
              status: "ACTIVE",
              registrationType: "TEAM",
              createdAt: new Date(),
            }),
          },
          registrationResponse: {
            create: vi.fn().mockResolvedValue({ id: "resp-1" }),
          },
          team: {
            create: vi.fn().mockResolvedValue({ id: "team-1" }),
          },
          teamMember: {
            create: vi.fn().mockResolvedValue({ id: "member-1" }),
          },
        });
      });

      const result = await executeRegistration("magnora-26", {
        registrationType: RegistrationType.TEAM,
        participantType: ParticipantType.CRESCENT,
        team: {
          name: "Inter-College Duo",
          members: [
            {
              name: "Crescent Leader",
              participantType: ParticipantType.CRESCENT,
              identifierNormalized: "210071601001",
              isLeader: true,
            },
            {
              name: "External Partner",
              participantType: ParticipantType.EXTERNAL,
              collegeNormalized: "LOYOLA COLLEGE",
              identifierNormalized: "22-CS-101",
              isLeader: false,
            },
          ],
        },
        responses: {
          participant_type: "CRESCENT",
          participant_name: "Crescent Leader",
          crescent_rrn: "210071601001",
        },
      });

      expect(result).toBeDefined();
      expect(epCreateMock).toHaveBeenCalledTimes(2);
      // Call 1: Crescent leader
      expect(epCreateMock.mock.calls[0][0].data.participantType).toBe(ParticipantType.CRESCENT);
      expect(epCreateMock.mock.calls[0][0].data.identifierNormalized).toBe("210071601001");
      // Call 2: External partner
      expect(epCreateMock.mock.calls[1][0].data.participantType).toBe(ParticipantType.EXTERNAL);
      expect(epCreateMock.mock.calls[1][0].data.collegeNormalized).toBe("LOYOLA COLLEGE");
      expect(epCreateMock.mock.calls[1][0].data.identifierNormalized).toBe("22-CS-101");
    });

    it("synchronizes team name from dynamic responses (team_name field) if input.team.name is omitted", async () => {
      (prisma.event.findUnique as any).mockResolvedValue(baseEvent);
      const teamCreateMock = vi.fn().mockResolvedValue({ id: "team-synced", name: "Dynamic Quants" });

      (prisma.$transaction as any).mockImplementation(async (callback: any) => {
        return callback({
          $queryRaw: vi.fn().mockResolvedValue([
            {
              id: "event-uuid-1",
              capacity: 100,
              capacity_mode: EventCapacityMode.PARTICIPANTS,
              status: EventStatus.PUBLISHED,
            },
          ]),
          eventParticipant: {
            count: vi.fn().mockResolvedValue(0),
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue({ id: "ep-1" }),
          },
          registration: {
            create: vi.fn().mockResolvedValue({
              id: "reg-1",
              registrationCode: "TEST-REG-001",
              status: "ACTIVE",
              registrationType: RegistrationType.TEAM,
              participantType: ParticipantType.CRESCENT,
              participantName: "Primary Leader",
              createdAt: new Date(),
            }),
          },
          registrationResponse: {
            create: vi.fn().mockResolvedValue({ id: "resp-1" }),
          },
          team: {
            create: teamCreateMock,
          },
          teamMember: {
            create: vi.fn().mockResolvedValue({ id: "member-1" }),
          },
        });
      });

      const result = await executeRegistration("magnora-26", {
        registrationType: RegistrationType.TEAM,
        participantType: ParticipantType.CRESCENT,
        team: {
          // name intentionally omitted in input.team
          members: [
            {
              name: "Primary Leader",
              participantType: ParticipantType.CRESCENT,
              identifierNormalized: "210071601001",
              isLeader: true,
            },
          ],
        },
        responses: {
          participant_type: "CRESCENT",
          participant_name: "Primary Leader",
          crescent_rrn: "210071601001",
          team_name: "Dynamic Quants",
        },
      });

      expect(teamCreateMock).toHaveBeenCalledWith({
        data: {
          registrationId: "reg-1",
          name: "Dynamic Quants",
        },
      });
      expect(result.team?.name).toBe("Dynamic Quants");
      expect(result.team?.members.length).toBe(1);
    });

    it("enforces configured minimum team size when defined on the form version", async () => {
      const eventWithTeamSizeRule = {
        ...baseEvent,
        activeFormVersion: {
          ...baseEvent.activeFormVersion,
          eventFields: [
            ...baseEvent.activeFormVersion.eventFields,
            {
              id: "field-team-size",
              formVersionId: "fv-uuid-1",
              key: "team_members",
              label: "Team Members",
              type: "NUMBER",
              fieldScope: "TEAM_MEMBER",
              required: false,
              validation: { min: 3 },
              displayOrder: 10,
            },
          ],
        },
      };
      (prisma.event.findUnique as any).mockResolvedValue(eventWithTeamSizeRule);

      await expect(
        executeRegistration("magnora-26", {
          registrationType: RegistrationType.TEAM,
          participantType: ParticipantType.CRESCENT,
          team: {
            name: "Under-sized Team",
            members: [
              {
                name: "Primary Leader",
                participantType: ParticipantType.CRESCENT,
                identifierNormalized: "210071601001",
                isLeader: true,
              },
              {
                name: "Second Member",
                participantType: ParticipantType.CRESCENT,
                identifierNormalized: "210071601002",
                isLeader: false,
              },
            ],
          },
          responses: {
            participant_type: "CRESCENT",
            participant_name: "Primary Leader",
            crescent_rrn: "210071601001",
          },
        })
      ).rejects.toThrowError(/Team must have at least 3 members/);
    });

    it("enforces configured maximum team size when defined on the form version", async () => {
      const eventWithTeamSizeRule = {
        ...baseEvent,
        activeFormVersion: {
          ...baseEvent.activeFormVersion,
          eventFields: [
            ...baseEvent.activeFormVersion.eventFields,
            {
              id: "field-team-size",
              formVersionId: "fv-uuid-1",
              key: "team_members",
              label: "Team Members",
              type: "NUMBER",
              fieldScope: "TEAM_MEMBER",
              required: false,
              validation: { max: 2 },
              displayOrder: 10,
            },
          ],
        },
      };
      (prisma.event.findUnique as any).mockResolvedValue(eventWithTeamSizeRule);

      await expect(
        executeRegistration("magnora-26", {
          registrationType: RegistrationType.TEAM,
          participantType: ParticipantType.CRESCENT,
          team: {
            name: "Over-sized Team",
            members: [
              {
                name: "Primary Leader",
                participantType: ParticipantType.CRESCENT,
                identifierNormalized: "210071601001",
                isLeader: true,
              },
              {
                name: "Second Member",
                participantType: ParticipantType.CRESCENT,
                identifierNormalized: "210071601002",
                isLeader: false,
              },
              {
                name: "Third Member",
                participantType: ParticipantType.CRESCENT,
                identifierNormalized: "210071601003",
                isLeader: false,
              },
            ],
          },
          responses: {
            participant_type: "CRESCENT",
            participant_name: "Primary Leader",
            crescent_rrn: "210071601001",
          },
        })
      ).rejects.toThrowError(/Team cannot exceed 2 members/);
    });
  });

  describe("Capacity Limits & Concurrency Safety (Area H)", () => {
    it("acquires exclusive PostgreSQL row lock (FOR UPDATE) inside transaction to serialize capacity checks", async () => {
      (prisma.event.findUnique as any).mockResolvedValue(baseEvent);
      const queryRawMock = vi.fn().mockResolvedValue([
        {
          id: "event-uuid-1",
          capacity: 100,
          capacity_mode: EventCapacityMode.PARTICIPANTS,
          status: EventStatus.PUBLISHED,
        },
      ]);
      (prisma.$transaction as any).mockImplementation(async (callback: any) => {
        return callback({
          $queryRaw: queryRawMock,
          eventParticipant: {
            count: vi.fn().mockResolvedValue(10),
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue({ id: "ep-1" }),
          },
          registration: {
            create: vi.fn().mockResolvedValue({
              id: "reg-uuid-1",
              eventId: "event-uuid-1",
              formVersionId: "fv-uuid-1",
              registrationCode: "CCF-MAGNORA2-A1B2C3D4",
              participantName: "Test Student",
              participantType: ParticipantType.CRESCENT,
              status: "ACTIVE",
              registrationType: "INDIVIDUAL",
              createdAt: new Date(),
            }),
          },
          registrationResponse: {
            create: vi.fn().mockResolvedValue({ id: "resp-1" }),
          },
        });
      });

      await executeRegistration("magnora-26", {
        participantType: ParticipantType.CRESCENT,
        responses: {
          participant_type: "CRESCENT",
          participant_name: "John Crescent",
          crescent_rrn: "210071601001",
        },
      });

      expect(queryRawMock).toHaveBeenCalled();
    });

    it("rejects registration when participant capacity limit is reached", async () => {
      (prisma.event.findUnique as any).mockResolvedValue({
        ...baseEvent,
        capacity: 50,
        capacityMode: EventCapacityMode.PARTICIPANTS,
      });

      (prisma.$transaction as any).mockImplementation(async (callback: any) => {
        return callback({
          $queryRaw: vi.fn().mockResolvedValue([
            {
              id: "event-uuid-1",
              capacity: 50,
              capacity_mode: EventCapacityMode.PARTICIPANTS,
              status: EventStatus.PUBLISHED,
            },
          ]),
          eventParticipant: {
            count: vi.fn().mockResolvedValue(50), // At full capacity!
            findFirst: vi.fn().mockResolvedValue(null),
          },
        });
      });

      await expect(
        executeRegistration("magnora-26", {
          participantType: ParticipantType.CRESCENT,
          responses: {
            participant_type: "CRESCENT",
            participant_name: "John",
            crescent_rrn: "210071601001",
          },
        })
      ).rejects.toThrowError(/reached full capacity/);
    });

    it("accepts registration when event capacityMode is UNLIMITED", async () => {
      (prisma.event.findUnique as any).mockResolvedValue({
        ...baseEvent,
        capacity: null,
        capacityMode: EventCapacityMode.UNLIMITED,
      });

      const result = await executeRegistration("magnora-26", {
        participantType: ParticipantType.CRESCENT,
        responses: {
          participant_type: "CRESCENT",
          participant_name: "John",
          crescent_rrn: "210071601001",
        },
      });

      expect(result).toBeDefined();
    });

    it("fails closed when database transaction encounters an error and never fabricates registration", async () => {
      (prisma.event.findUnique as any).mockResolvedValue(baseEvent);
      (prisma.$transaction as any).mockRejectedValue(new Error("Database connection failure"));

      await expect(
        executeRegistration("magnora-26", {
          participantType: ParticipantType.CRESCENT,
          responses: {
            participant_type: "CRESCENT",
            participant_name: "John",
            crescent_rrn: "210071601001",
          },
        })
      ).rejects.toThrow("Database connection failure");
    });
  });

  describe("Payment Separation (Area K)", () => {
    it("creates PENDING manual UPI payment for PAID event without false verification", async () => {
      (prisma.event.findUnique as any).mockResolvedValue({
        ...baseEvent,
        paymentMode: PaymentMode.PAID,
        paymentMethod: PaymentMethod.MANUAL_UPI,
        feeAmount: 250,
        upiId: "ccf@okaxis",
        payeeName: "Crescent Club of Finance",
      });

      const result = await executeRegistration("magnora-26", {
        participantType: ParticipantType.CRESCENT,
        responses: {
          participant_type: "CRESCENT",
          participant_name: "Paid Student",
          crescent_rrn: "210071601001",
        },
        payment: {
          userReference: "UTR-1234567890",
        },
      });

      expect(result.payment).toBeDefined();
      expect(result.payment?.status).toBe(PaymentStatus.PENDING);
      expect(result.payment?.amount).toBe("250");
      expect(result.payment?.upiId).toBe("ccf@okaxis");
      expect(result.payment?.paymentUri).toContain("upi://pay");
    });
  });

  describe("Admin Deletion & Lock Release (Area L)", () => {
    it("deletes registration, releases participation locks, and logs audit trail", async () => {
      const result = await deleteRegistrationByAdmin("reg-uuid-1", "admin-uuid-1");

      expect(result.success).toBe(true);
      expect(result.releasedParticipantName).toBe("Test Student");
    });
  });
});
