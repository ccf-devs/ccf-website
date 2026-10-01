import { describe, it, expect } from "vitest";
import {
  createEventSchema,
  updateEventPatchSchema,
  completeEventSchema,
  mergeEventWithPatch,
  isValidEventStatusTransition,
  validateEventDateUpdates,
  ALLOWED_STATUS_TRANSITIONS,
} from "@/lib/validation/event";
import {
  EventStatus,
  EventCapacityMode,
  RegistrationMode,
  RegistrationMethod,
  PaymentMode,
  PaymentMethod,
} from "@prisma/client";

describe("Event Validation & Lifecycle Specification (Phase 6)", () => {
  const validBaseEvent = {
    name: "Magnora’26 Finance Symposium",
    slug: "magnora-26",
    status: EventStatus.DRAFT,
    startsAt: "2026-10-15T09:00:00.000Z",
    endsAt: "2026-10-15T17:00:00.000Z",
    venue: "Crescent Auditorium, Vandalur",
    capacityMode: EventCapacityMode.PARTICIPANTS,
    capacity: 250,
    registrationMode: RegistrationMode.INTERNAL,
    registrationMethod: RegistrationMethod.BUILT_IN,
    eligibilityCrescent: true,
    eligibilityExternal: true,
    registrationOpensAt: "2026-10-05T00:00:00.000Z",
    registrationClosesAt: "2026-10-10T23:59:59.000Z",
    paymentMode: PaymentMode.FREE,
    descriptionRich: "Symposium on algorithmic finance and quantitative trading.",
    rulesRich: "Must present valid student ID.",
    instructionsRich: "Laptops required for workshop sessions.",
    eligibilityRich: "Open to all undergraduate students.",
    notesRich: "Audio-visual equipment reserved.",
  };

  describe("A. Event Validation Schemas", () => {
    it("accepts a completely valid event payload", () => {
      const result = createEventSchema.safeParse(validBaseEvent);
      expect(result.success).toBe(true);
    });

    it("rejects empty or whitespace-only event names", () => {
      const result = createEventSchema.safeParse({
        ...validBaseEvent,
        name: "   ",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("Event name cannot be empty");
      }
    });

    it("rejects event names exceeding 200 characters", () => {
      const result = createEventSchema.safeParse({
        ...validBaseEvent,
        name: "A".repeat(201),
      });
      expect(result.success).toBe(false);
    });

    it("enforces valid slug syntax (lowercase alphanumeric and hyphens)", () => {
      // Valid slugs
      expect(createEventSchema.safeParse({ ...validBaseEvent, slug: "finrise-25" }).success).toBe(true);
      expect(createEventSchema.safeParse({ ...validBaseEvent, slug: "symposium-2026-v2" }).success).toBe(true);

      // Invalid slugs
      expect(createEventSchema.safeParse({ ...validBaseEvent, slug: "Finrise 25" }).success).toBe(false);
      expect(createEventSchema.safeParse({ ...validBaseEvent, slug: "symposium_2026" }).success).toBe(false);
      expect(createEventSchema.safeParse({ ...validBaseEvent, slug: "-leading-hyphen" }).success).toBe(false);
      expect(createEventSchema.safeParse({ ...validBaseEvent, slug: "trailing-hyphen-" }).success).toBe(false);
    });

    it("enforces date consistency: endsAt must be after startsAt", () => {
      const result = createEventSchema.safeParse({
        ...validBaseEvent,
        startsAt: "2026-10-15T18:00:00.000Z",
        endsAt: "2026-10-15T09:00:00.000Z", // Earlier than start!
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues.find((i) => i.path.includes("endsAt"));
        expect(issue).toBeDefined();
        expect(issue?.message).toContain("after the start date and time");
      }
    });

    it("enforces registration window consistency: closesAt must be after opensAt", () => {
      const result = createEventSchema.safeParse({
        ...validBaseEvent,
        registrationOpensAt: "2026-10-10T00:00:00.000Z",
        registrationClosesAt: "2026-10-05T00:00:00.000Z", // Earlier than opens!
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues.find((i) => i.path.includes("registrationClosesAt"));
        expect(issue).toBeDefined();
        expect(issue?.message).toContain("closing date must be after opening date");
      }
    });

    it("enforces capacity rules according to capacityMode", () => {
      // PARTICIPANTS mode requires positive capacity
      const invalidParticipants = createEventSchema.safeParse({
        ...validBaseEvent,
        capacityMode: EventCapacityMode.PARTICIPANTS,
        capacity: 0,
      });
      expect(invalidParticipants.success).toBe(false);

      const validParticipants = createEventSchema.safeParse({
        ...validBaseEvent,
        capacityMode: EventCapacityMode.PARTICIPANTS,
        capacity: 100,
      });
      expect(validParticipants.success).toBe(true);

      // UNLIMITED mode allows null capacity
      const validUnlimited = createEventSchema.safeParse({
        ...validBaseEvent,
        capacityMode: EventCapacityMode.UNLIMITED,
        capacity: null,
      });
      expect(validUnlimited.success).toBe(true);
    });

    it("enforces registration mode vs method consistency (Correction 3)", () => {
      // NONE mode must have NONE method
      const validNone = createEventSchema.safeParse({
        ...validBaseEvent,
        registrationMode: RegistrationMode.NONE,
        registrationMethod: RegistrationMethod.NONE,
        eligibilityCrescent: false,
        eligibilityExternal: false,
      });
      expect(validNone.success).toBe(true);

      const invalidNone = createEventSchema.safeParse({
        ...validBaseEvent,
        registrationMode: RegistrationMode.NONE,
        registrationMethod: RegistrationMethod.BUILT_IN,
      });
      expect(invalidNone.success).toBe(false);

      // Non-NONE mode must specify a method other than NONE
      const invalidActive = createEventSchema.safeParse({
        ...validBaseEvent,
        registrationMode: RegistrationMode.INTERNAL,
        registrationMethod: RegistrationMethod.NONE,
      });
      expect(invalidActive.success).toBe(false);

      // Non-NONE mode requires at least one eligibility flag
      const noEligibility = createEventSchema.safeParse({
        ...validBaseEvent,
        registrationMode: RegistrationMode.INTERNAL,
        registrationMethod: RegistrationMethod.BUILT_IN,
        eligibilityCrescent: false,
        eligibilityExternal: false,
      });
      expect(noEligibility.success).toBe(false);
    });

    it("enforces payment consistency for FREE and PAID events", () => {
      // FREE event must have 0 or null fee
      const invalidFree = createEventSchema.safeParse({
        ...validBaseEvent,
        paymentMode: PaymentMode.FREE,
        feeAmount: 250,
      });
      expect(invalidFree.success).toBe(false);

      // PAID event requires positive fee amount and payment method
      const invalidPaidNoFee = createEventSchema.safeParse({
        ...validBaseEvent,
        paymentMode: PaymentMode.PAID,
        paymentMethod: PaymentMethod.MANUAL_UPI,
        feeAmount: 0,
      });
      expect(invalidPaidNoFee.success).toBe(false);

      const invalidPaidNoMethod = createEventSchema.safeParse({
        ...validBaseEvent,
        paymentMode: PaymentMode.PAID,
        feeAmount: 150,
        paymentMethod: null,
      });
      expect(invalidPaidNoMethod.success).toBe(false);

      // PAID MANUAL_UPI requires upiId and payeeName
      const invalidUpi = createEventSchema.safeParse({
        ...validBaseEvent,
        paymentMode: PaymentMode.PAID,
        paymentMethod: PaymentMethod.MANUAL_UPI,
        feeAmount: 100,
        upiId: "",
        payeeName: "CCF",
      });
      expect(invalidUpi.success).toBe(false);

      const validPaid = createEventSchema.safeParse({
        ...validBaseEvent,
        paymentMode: PaymentMode.PAID,
        paymentMethod: PaymentMethod.MANUAL_UPI,
        feeAmount: 100,
        upiId: "crescent@upi",
        payeeName: "Crescent Club of Finance",
      });
      expect(validPaid.success).toBe(true);
    });
  });

  describe("B. Lifecycle State Machine & Publication Rules (Correction 1)", () => {
    it("permits standard lifecycle forward transitions", () => {
      expect(isValidEventStatusTransition(EventStatus.DRAFT, EventStatus.PUBLISHED)).toBe(true);
      expect(isValidEventStatusTransition(EventStatus.PUBLISHED, EventStatus.CLOSED)).toBe(true);
      expect(isValidEventStatusTransition(EventStatus.CLOSED, EventStatus.ARCHIVED)).toBe(true);
      expect(isValidEventStatusTransition(EventStatus.DRAFT, EventStatus.ARCHIVED)).toBe(true);
    });

    it("permits legitimate reopening transitions (CLOSED -> PUBLISHED)", () => {
      expect(isValidEventStatusTransition(EventStatus.CLOSED, EventStatus.PUBLISHED)).toBe(true);
    });

    it("permits draft reversion prior to launch (PUBLISHED -> DRAFT)", () => {
      expect(isValidEventStatusTransition(EventStatus.PUBLISHED, EventStatus.DRAFT)).toBe(true);
    });

    it("treats ARCHIVED as strictly terminal (no outgoing transitions)", () => {
      expect(ALLOWED_STATUS_TRANSITIONS[EventStatus.ARCHIVED]).toEqual([]);
      expect(isValidEventStatusTransition(EventStatus.ARCHIVED, EventStatus.DRAFT)).toBe(false);
      expect(isValidEventStatusTransition(EventStatus.ARCHIVED, EventStatus.PUBLISHED)).toBe(false);
      expect(isValidEventStatusTransition(EventStatus.ARCHIVED, EventStatus.CLOSED)).toBe(false);
    });

    it("permits same-state transitions as no-ops", () => {
      expect(isValidEventStatusTransition(EventStatus.DRAFT, EventStatus.DRAFT)).toBe(true);
      expect(isValidEventStatusTransition(EventStatus.PUBLISHED, EventStatus.PUBLISHED)).toBe(true);
      expect(isValidEventStatusTransition(EventStatus.CLOSED, EventStatus.CLOSED)).toBe(true);
      expect(isValidEventStatusTransition(EventStatus.ARCHIVED, EventStatus.ARCHIVED)).toBe(true);
    });

    it("enforces that publishing an event requires valid start timing", () => {
      const invalidPublish = completeEventSchema.safeParse({
        ...validBaseEvent,
        status: EventStatus.PUBLISHED,
        startsAt: "invalid-date",
      });
      expect(invalidPublish.success).toBe(false);
    });
  });

  describe("C. Cross-Field PATCH Validation & Merging (Correction 2)", () => {
    it("successfully merges partial patch with existing event record", () => {
      const existing = {
        id: "evt-123",
        name: "Existing Event",
        slug: "existing-event",
        status: EventStatus.DRAFT,
        startsAt: new Date("2026-10-15T09:00:00.000Z"),
        endsAt: new Date("2026-10-15T17:00:00.000Z"),
        capacityMode: EventCapacityMode.UNLIMITED,
        capacity: null,
        registrationMode: RegistrationMode.NONE,
        registrationMethod: RegistrationMethod.NONE,
        paymentMode: PaymentMode.FREE,
        eligibilityCrescent: false,
        eligibilityExternal: false,
      };

      const patch = {
        venue: "New Seminar Hall",
        capacityMode: EventCapacityMode.PARTICIPANTS,
        capacity: 100,
        registrationMode: RegistrationMode.INTERNAL,
        registrationMethod: RegistrationMethod.BUILT_IN,
        eligibilityCrescent: true,
      };

      const merged = mergeEventWithPatch(existing, patch);
      expect(merged.name).toBe("Existing Event");
      expect(merged.venue).toBe("New Seminar Hall");
      expect(merged.capacityMode).toBe(EventCapacityMode.PARTICIPANTS);
      expect(merged.capacity).toBe(100);

      // Validate the merged configuration
      const result = completeEventSchema.safeParse(merged);
      expect(result.success).toBe(true);
    });

    it("rejects a patch if the resulting merged state violates cross-field consistency", () => {
      const existing = {
        name: "Existing Event",
        slug: "existing-event",
        status: EventStatus.DRAFT,
        startsAt: new Date("2026-10-15T09:00:00.000Z"),
        endsAt: new Date("2026-10-15T17:00:00.000Z"),
        capacityMode: EventCapacityMode.UNLIMITED,
        registrationMode: RegistrationMode.NONE,
        registrationMethod: RegistrationMethod.NONE,
        paymentMode: PaymentMode.FREE,
      };

      // Patch sets startsAt AFTER existing endsAt!
      const patch = {
        startsAt: "2026-10-15T20:00:00.000Z",
      };

      const merged = mergeEventWithPatch(existing, patch);
      const result = completeEventSchema.safeParse(merged);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("End date and time must be after the start date");
      }
    });
  });

  describe("D. Past Date Validation on Create and Edit (Issue 5)", () => {
    const oneDayAgo = new Date(Date.now() - 86400000).toISOString();
    const oneWeekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const twoWeeksAgo = new Date(Date.now() - 14 * 86400000).toISOString();
    const futureOpen = new Date(Date.now() + 10 * 86400000).toISOString();
    const futureClose = new Date(Date.now() + 20 * 86400000).toISOString();
    const futureStart = new Date(Date.now() + 30 * 86400000).toISOString();
    const futureEnd = new Date(Date.now() + 31 * 86400000).toISOString();

    const futureBaseEvent = {
      ...validBaseEvent,
      startsAt: futureStart,
      endsAt: futureEnd,
      registrationOpensAt: futureOpen,
      registrationClosesAt: futureClose,
    };

    it("accepts event creation when all four date fields are in the future", () => {
      const result = createEventSchema.safeParse(futureBaseEvent);
      expect(result.success).toBe(true);
    });

    it("rejects event creation when startsAt is in the past", () => {
      const result = createEventSchema.safeParse({
        ...futureBaseEvent,
        startsAt: oneDayAgo,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes("startsAt"))).toBe(true);
      }
    });

    it("rejects event creation when endsAt is in the past", () => {
      const result = createEventSchema.safeParse({
        ...futureBaseEvent,
        endsAt: oneDayAgo,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes("endsAt"))).toBe(true);
      }
    });

    it("rejects event creation when registrationOpensAt is in the past", () => {
      const result = createEventSchema.safeParse({
        ...futureBaseEvent,
        registrationOpensAt: oneDayAgo,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes("registrationOpensAt"))).toBe(true);
      }
    });

    it("rejects event creation when registrationClosesAt is in the past", () => {
      const result = createEventSchema.safeParse({
        ...futureBaseEvent,
        registrationClosesAt: oneDayAgo,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes("registrationClosesAt"))).toBe(true);
      }
    });

    it("blocks modifying date fields to a new past date during event editing", () => {
      const existing = {
        id: "evt-uuid-1",
        startsAt: futureStart,
        endsAt: futureEnd,
        registrationOpensAt: futureOpen,
        registrationClosesAt: futureClose,
      };

      // Trying to change startsAt to a past date
      const checkStartsAt = validateEventDateUpdates(existing, { startsAt: oneDayAgo });
      expect(checkStartsAt.valid).toBe(false);
      expect(checkStartsAt.errors.startsAt).toContain("cannot be set to a past date");

      // Trying to change endsAt to a past date
      const checkEndsAt = validateEventDateUpdates(existing, { endsAt: oneDayAgo });
      expect(checkEndsAt.valid).toBe(false);
      expect(checkEndsAt.errors.endsAt).toContain("cannot be set to a past date");

      // Trying to change registrationOpensAt to a past date
      const checkRegOpens = validateEventDateUpdates(existing, { registrationOpensAt: oneDayAgo });
      expect(checkRegOpens.valid).toBe(false);
      expect(checkRegOpens.errors.registrationOpensAt).toContain("cannot be set to a past date");

      // Trying to change registrationClosesAt to a past date
      const checkRegCloses = validateEventDateUpdates(existing, { registrationClosesAt: oneDayAgo });
      expect(checkRegCloses.valid).toBe(false);
      expect(checkRegCloses.errors.registrationClosesAt).toContain("cannot be set to a past date");
    });

    it("permits editing historical events when existing past dates are not changed", () => {
      const historicalExisting = {
        id: "hist-1",
        name: "FinRise 2025",
        slug: "finrise-2025",
        startsAt: twoWeeksAgo,
        endsAt: oneWeekAgo,
        registrationOpensAt: twoWeeksAgo,
        registrationClosesAt: oneWeekAgo,
        venue: "Old Hall",
        capacityMode: EventCapacityMode.UNLIMITED,
        registrationMode: RegistrationMode.NONE,
        registrationMethod: RegistrationMethod.NONE,
        paymentMode: PaymentMode.FREE,
      };

      // Editing non-date fields (e.g. venue name)
      const patchNonDate = { venue: "Renovated Auditorium" };
      const dateCheck = validateEventDateUpdates(historicalExisting, patchNonDate);
      expect(dateCheck.valid).toBe(true);

      // Sending unchanged dates in patch is also accepted
      const patchUnchangedDates = {
        venue: "Renovated Auditorium",
        startsAt: twoWeeksAgo,
        endsAt: oneWeekAgo,
      };
      const dateCheck2 = validateEventDateUpdates(historicalExisting, patchUnchangedDates);
      expect(dateCheck2.valid).toBe(true);

      // Merging and validating complete object succeeds without corrupting historical event
      const merged = mergeEventWithPatch(historicalExisting, patchUnchangedDates);
      const result = completeEventSchema.safeParse(merged);
      expect(result.success).toBe(true);
    });

    it("permits updating existing events to valid future dates", () => {
      const existing = {
        id: "evt-uuid-2",
        startsAt: futureStart,
        endsAt: futureEnd,
      };

      const newFutureStart = new Date(Date.now() + 40 * 86400000).toISOString();
      const newFutureEnd = new Date(Date.now() + 41 * 86400000).toISOString();

      const patch = {
        startsAt: newFutureStart,
        endsAt: newFutureEnd,
      };

      const dateCheck = validateEventDateUpdates(existing, patch);
      expect(dateCheck.valid).toBe(true);
    });
  });
});

