import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import EventRegistrationPage from "@/app/(public)/events/[slug]/register/page";
import { prisma } from "@/lib/db/client";
import {
  EventStatus,
  RegistrationMode,
  RegistrationMethod,
  EventCapacityMode,
  PaymentMode,
  FieldType,
  FieldScope,
} from "@prisma/client";

// Mock next/navigation
const mockNotFound = vi.fn();
vi.mock("next/navigation", () => ({
  notFound: () => {
    mockNotFound();
    throw new Error("NEXT_NOT_FOUND");
  },
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Mock Prisma
vi.mock("@/lib/db/client", () => ({
  prisma: {
    event: {
      findUnique: vi.fn(),
    },
    eventParticipant: {
      count: vi.fn(),
    },
    registration: {
      count: vi.fn(),
    },
  },
}));

describe("Public Registration Page Fail-Closed Production Behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fails closed on database failure and does NOT produce a fake registration form or invented capacity", async () => {
    // Simulate database query failure
    (prisma.event.findUnique as any).mockRejectedValue(
      new Error("PrismaClientInitializationError: Can't reach database server at localhost:5432")
    );

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const pageElement = await EventRegistrationPage({
      params: Promise.resolve({ slug: "magnora-26" }),
    });

    const html = renderToStaticMarkup(pageElement);

    // 1. MUST NOT render an active registration form
    expect(html).not.toContain("<form");
    expect(html).not.toContain('name="participant_name"');
    expect(html).not.toContain('name="crescent_rrn"');
    expect(html).not.toContain('name="team_name"');

    // 2. MUST NOT invent fake capacity or open registration
    expect(html).not.toContain("100 remaining");
    expect(html).not.toContain("Submit Registration");

    // 3. MUST render the safe unavailable notice
    expect(html).toContain("SERVICE UNAVAILABLE");
    expect(html).toContain("Registration Temporarily Unavailable");
    expect(html).toContain("Online registration is currently unavailable");

    // 4. MUST NOT leak raw database error details or stack traces to client HTML
    expect(html).not.toContain("PrismaClientInitializationError");
    expect(html).not.toContain("localhost:5432");

    consoleErrorSpy.mockRestore();
  });

  it("fails closed when database capacity query fails", async () => {
    const validEvent = {
      id: "event-uuid-1",
      slug: "magnora-26",
      name: "Magnora '26",
      status: EventStatus.PUBLISHED,
      registrationMode: RegistrationMode.INTERNAL,
      registrationMethod: RegistrationMethod.BUILT_IN,
      eligibilityCrescent: true,
      eligibilityExternal: true,
      capacity: 50,
      capacityMode: EventCapacityMode.PARTICIPANTS,
      paymentMode: PaymentMode.FREE,
      registrationOpensAt: new Date(Date.now() - 86400000),
      registrationClosesAt: new Date(Date.now() + 86400000),
      activeFormVersion: {
        id: "fv-1",
        versionNumber: 1,
        eventFields: [
          {
            id: "f-1",
            key: "participant_name",
            label: "Full Name",
            type: FieldType.TEXT,
            fieldScope: FieldScope.PARTICIPANT,
            required: true,
            displayOrder: 1,
            config: {},
          },
        ],
      },
    };

    (prisma.event.findUnique as any).mockResolvedValue(validEvent);
    // Simulate database capacity count failure
    (prisma.eventParticipant.count as any).mockRejectedValue(
      new Error("Query timeout on event_participants count")
    );

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const pageElement = await EventRegistrationPage({
      params: Promise.resolve({ slug: "magnora-26" }),
    });

    const html = renderToStaticMarkup(pageElement);

    // MUST NOT render form
    expect(html).not.toContain("<form");
    expect(html).not.toContain("Submit Registration");

    // MUST render safe unavailable notice
    expect(html).toContain("SERVICE UNAVAILABLE");
    expect(html).toContain("Registration Temporarily Unavailable");

    consoleErrorSpy.mockRestore();
  });

  it("calls notFound() when event is not found in database", async () => {
    (prisma.event.findUnique as any).mockResolvedValue(null);

    await expect(
      EventRegistrationPage({
        params: Promise.resolve({ slug: "non-existent-event" }),
      })
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(mockNotFound).toHaveBeenCalledTimes(1);
  });

  it("renders safe notice when event is at full capacity", async () => {
    const fullEvent = {
      id: "event-uuid-2",
      slug: "finrise-25",
      name: "FinRise '25",
      status: EventStatus.PUBLISHED,
      registrationMode: RegistrationMode.INTERNAL,
      registrationMethod: RegistrationMethod.BUILT_IN,
      eligibilityCrescent: true,
      eligibilityExternal: true,
      capacity: 10,
      capacityMode: EventCapacityMode.PARTICIPANTS,
      paymentMode: PaymentMode.FREE,
      registrationOpensAt: new Date(Date.now() - 86400000),
      registrationClosesAt: new Date(Date.now() + 86400000),
      activeFormVersion: {
        id: "fv-2",
        eventFields: [],
      },
    };

    (prisma.event.findUnique as any).mockResolvedValue(fullEvent);
    (prisma.eventParticipant.count as any).mockResolvedValue(10); // at full capacity

    const pageElement = await EventRegistrationPage({
      params: Promise.resolve({ slug: "finrise-25" }),
    });

    const html = renderToStaticMarkup(pageElement);

    expect(html).not.toContain("<form");
    expect(html).toContain("CAPACITY REACHED");
    expect(html).toContain("Event at Full Capacity");
  });
});
