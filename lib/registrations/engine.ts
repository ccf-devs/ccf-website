import { prisma } from "@/lib/db/client";
import {
  RegistrationStatus,
  RegistrationType,
  ParticipantType,
  EventCapacityMode,
  RegistrationMode,
  RegistrationMethod,
  PaymentMode,
  PaymentMethod,
  PaymentStatus,
  EventStatus,
  FieldScope,
  Prisma,
} from "@prisma/client";
import { toEventFieldDomain } from "@/lib/forms/types";
import { createAuditLog } from "@/lib/audit/log";
import { buildUpiUri } from "@/lib/payments/upi";
import {
  RegistrationErrorCode,
  RegistrationDomainError,
  RegistrationSubmissionInput,
  RegistrationConfirmation,
  AdminRegistrationView,
} from "./types";
import {
  extractAndNormalizeIdentity,
  validateDynamicResponses,
} from "./validation";
import {
  generateRegistrationCode,
  normalizeCrescentRrn,
  normalizeCollege,
  normalizeExternalRoll,
  normalizeName,
} from "./normalization";

/**
 * Tight check for Prisma unique constraint violation (P2002).
 * Strictly distinguishes P2002 from arbitrary Prisma KnownRequestErrors.
 */
function isPrismaUniqueConstraintError(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return err.code === "P2002";
  }
  return (
    typeof err === "object" &&
    err !== null &&
    (err as Record<string, unknown>).code === "P2002"
  );
}

/**
 * Core transactional registration engine.
 *
 * Implements the Handbook-defined 14-step validation and execution pipeline:
 * 1. Load event with active published FormVersion and EventFields.
 * 2. Verify publication state, registration mode, and method.
 * 3. Verify registration window (opensAt, closesAt).
 * 4. Verify participant eligibility (CRESCENT vs EXTERNAL).
 * 5. Extract and normalize participant identity.
 * 6. Validate submitted responses against active form schema and conditional logic.
 * 7. Validate team parameters if team mode.
 * 8. Execute authoritative database transaction:
 *    - Acquire exclusive PostgreSQL row-level lock on the event (SELECT ... FOR UPDATE)
 *      to serialize all concurrent registrations attempting to reserve capacity.
 *    - Re-check capacity after acquiring the lock (PARTICIPANTS / TEAMS / UNLIMITED).
 *    - Enforce active participant identity uniqueness in EventParticipant
 *      (pre-check + database partial unique index P2002 error mapping).
 *    - Insert Registration (permanently referencing active FormVersion).
 *    - Insert RegistrationResponses.
 *    - Insert EventParticipant lock(s).
 *    - Insert Team / TeamMembers if applicable.
 *    - Insert Payment record (status: PENDING) if event is PAID.
 * 9. Return safe public registration confirmation.
 *
 * Fail Closed:
 * In production, if the database is unavailable or any constraint fails, the operation
 * fails closed with a safe error; no fake successful registrations are ever generated.
 */
export async function executeRegistration(
  eventSlug: string,
  input: RegistrationSubmissionInput
): Promise<RegistrationConfirmation> {
  const now = new Date();

  // 1. Load event
  const event = await prisma.event.findUnique({
    where: { slug: eventSlug },
    include: {
      activeFormVersion: {
        include: {
          eventFields: {
            orderBy: { displayOrder: "asc" },
          },
        },
      },
    },
  });

  if (!event) {
    throw new RegistrationDomainError(
      "Event not found.",
      RegistrationErrorCode.EVENT_NOT_FOUND,
      404
    );
  }

  // 2. Verify event status & registration mode
  if (event.status !== EventStatus.PUBLISHED) {
    throw new RegistrationDomainError(
      "This event is not accepting registrations.",
      RegistrationErrorCode.REGISTRATION_NOT_ALLOWED,
      400
    );
  }

  if (event.registrationMode !== RegistrationMode.INTERNAL) {
    throw new RegistrationDomainError(
      event.registrationMode === RegistrationMode.EXTERNAL
        ? "This event uses external registration. No internal registration is accepted."
        : "This event does not accept registrations.",
      event.registrationMode === RegistrationMode.EXTERNAL
        ? RegistrationErrorCode.EXTERNAL_REGISTRATION_MODE
        : RegistrationErrorCode.REGISTRATION_MODE_NOT_INTERNAL,
      400
    );
  }

  if (event.registrationMethod !== RegistrationMethod.BUILT_IN) {
    throw new RegistrationDomainError(
      "This event does not support built-in form registration.",
      RegistrationErrorCode.REGISTRATION_NOT_ALLOWED,
      400
    );
  }

  // 3. Verify active FormVersion
  if (!event.activeFormVersion || !event.activeFormVersionId) {
    throw new RegistrationDomainError(
      "Registration form has not yet been published for this event.",
      RegistrationErrorCode.NO_ACTIVE_FORM_VERSION,
      400
    );
  }

  const activeFormVersion = event.activeFormVersion;

  // 4. Verify registration window
  if (event.registrationOpensAt && now < event.registrationOpensAt) {
    throw new RegistrationDomainError(
      "Registration for this event has not opened yet.",
      RegistrationErrorCode.REGISTRATION_NOT_OPEN,
      400
    );
  }

  if (event.registrationClosesAt && now > event.registrationClosesAt) {
    throw new RegistrationDomainError(
      "Registration for this event has closed.",
      RegistrationErrorCode.REGISTRATION_CLOSED,
      400
    );
  }

  // 5. Verify eligibility
  if (
    input.participantType === ParticipantType.CRESCENT &&
    !event.eligibilityCrescent
  ) {
    throw new RegistrationDomainError(
      "This event is not open to Crescent students.",
      RegistrationErrorCode.NOT_ELIGIBLE,
      400
    );
  }

  if (
    input.participantType === ParticipantType.EXTERNAL &&
    !event.eligibilityExternal
  ) {
    throw new RegistrationDomainError(
      "This event is not open to external participants.",
      RegistrationErrorCode.NOT_ELIGIBLE,
      400
    );
  }

  // 6. Map form fields to domain models
  const domainFields = activeFormVersion.eventFields.map(toEventFieldDomain);

  // 7. Validate dynamic responses against form schema & conditional logic
  const validatedResponses = validateDynamicResponses(
    domainFields,
    input.responses || {}
  );

  // 8. Extract & normalize primary participant identity
  const identity = extractAndNormalizeIdentity(
    input.participantType,
    validatedResponses,
    domainFields
  );

  const registrationType = input.registrationType || RegistrationType.INDIVIDUAL;

  // 9. Validate team members if team registration
  const normalizedTeamMembers: Array<{
    name: string;
    participantType: ParticipantType;
    collegeNormalized: string | null;
    identifierNormalized: string;
    phone?: string;
    academicDepartment?: string;
    year?: string;
    position?: string;
    isLeader: boolean;
  }> = [];

  let teamName: string | null = null;

  if (registrationType === RegistrationType.TEAM) {
    if (!input.team?.members || input.team.members.length === 0) {
      throw new RegistrationDomainError(
        "Team registration requires a team member roster.",
        RegistrationErrorCode.INVALID_PARTICIPANT,
        400
      );
    }

    // Resolve team name from input or dynamic response (team_name or FieldScope.TEAM field)
    const teamNameFromResponse =
      validatedResponses["team_name"] ??
      validatedResponses["teamName"] ??
      validatedResponses[
        domainFields.find(
          (f) =>
            f.fieldScope === FieldScope.TEAM ||
            (f.config?.isSystem && f.config.systemKey === "team_name")
        )?.key || ""
      ];

    teamName =
      (input.team?.name && input.team.name.trim()) ||
      (typeof teamNameFromResponse === "string" && teamNameFromResponse.trim()) ||
      null;

    for (const member of input.team.members) {
      const memberName = normalizeName(member.name);
      let memberCollege: string | null = null;
      let memberIdentifier: string;

      if (member.participantType === ParticipantType.CRESCENT) {
        memberIdentifier = normalizeCrescentRrn(
          member.identifierNormalized ||
            (member as any).rrn ||
            (member as any).crescentRrn
        );
      } else {
        memberCollege = normalizeCollege(
          member.collegeNormalized ||
            (member as any).college ||
            (member as any).collegeName
        );
        memberIdentifier = normalizeExternalRoll(
          member.identifierNormalized ||
            (member as any).rollNumber ||
            (member as any).externalRollNumber
        );
      }

      normalizedTeamMembers.push({
        name: memberName,
        participantType: member.participantType,
        collegeNormalized: memberCollege,
        identifierNormalized: memberIdentifier,
        phone: member.phone,
        academicDepartment: member.academicDepartment,
        year: member.year,
        position: member.position,
        isLeader: member.isLeader || false,
      });
    }

    // Check team size validation ONLY if authoritative min/max bounds are configured in form
    const teamRosterField = domainFields.find(
      (f) =>
        f.fieldScope === FieldScope.TEAM_MEMBER ||
        (f.config?.isSystem && f.config.systemKey === "team_membership") ||
        f.key === "team_members" ||
        f.key === "team_membership"
    );

    const minTeamSize =
      teamRosterField?.validation?.min ??
      (teamRosterField?.config as any)?.minTeamSize;
    const maxTeamSize =
      teamRosterField?.validation?.max ??
      (teamRosterField?.config as any)?.maxTeamSize;

    if (typeof minTeamSize === "number" && normalizedTeamMembers.length < minTeamSize) {
      throw new RegistrationDomainError(
        `Team must have at least ${minTeamSize} members.`,
        RegistrationErrorCode.INVALID_PARTICIPANT,
        400
      );
    }

    if (typeof maxTeamSize === "number" && normalizedTeamMembers.length > maxTeamSize) {
      throw new RegistrationDomainError(
        `Team cannot exceed ${maxTeamSize} members.`,
        RegistrationErrorCode.INVALID_PARTICIPANT,
        400
      );
    }

    // Check duplicate identities within the submitted team
    const seen = new Set<string>();
    for (const m of normalizedTeamMembers) {
      const key = `${m.participantType}:${m.collegeNormalized || ""}:${m.identifierNormalized}`;
      if (seen.has(key)) {
        throw new RegistrationDomainError(
          "Duplicate member found within the team submission.",
          RegistrationErrorCode.INVALID_PARTICIPANT,
          400
        );
      }
      seen.add(key);
    }

    // Enforce that the primary participant (team leader) is included in the team roster
    const primaryKey = `${identity.participantType}:${identity.collegeNormalized || ""}:${identity.identifierNormalized}`;
    const primaryIndex = normalizedTeamMembers.findIndex(
      (m) =>
        `${m.participantType}:${m.collegeNormalized || ""}:${m.identifierNormalized}` === primaryKey
    );

    if (primaryIndex === -1) {
      throw new RegistrationDomainError(
        "The primary participant (team leader) must be included in the team members roster.",
        RegistrationErrorCode.INVALID_PARTICIPANT,
        400
      );
    }

    // Reject if any non-primary team member is marked as leader
    for (let i = 0; i < normalizedTeamMembers.length; i++) {
      if (i !== primaryIndex && normalizedTeamMembers[i].isLeader) {
        throw new RegistrationDomainError(
          "Only the primary registrant can be designated as the team leader.",
          RegistrationErrorCode.INVALID_PARTICIPANT,
          400
        );
      }
    }

    // Ensure the primary participant is marked as leader in the roster
    normalizedTeamMembers[primaryIndex].isLeader = true;
  }

  // 10. Start authoritative transaction with row-level serialization
  return await prisma.$transaction(async (tx) => {
    // A. Acquire exclusive row lock on events table (SELECT ... FOR UPDATE).
    // This serializes all concurrent registration requests for this event at the DB level.
    const lockedRows = await tx.$queryRaw<
      Array<{
        id: string;
        capacity: number | null;
        capacity_mode: EventCapacityMode;
        status: EventStatus;
      }>
    >`
      SELECT id, capacity, capacity_mode, status
      FROM events
      WHERE id = ${event.id}::uuid
      FOR UPDATE
    `;

    const lockedEvent = lockedRows[0] || {
      id: event.id,
      capacity: event.capacity,
      capacity_mode: event.capacityMode,
      status: event.status,
    };

    if (lockedEvent.status !== EventStatus.PUBLISHED) {
      throw new RegistrationDomainError(
        "This event is no longer accepting registrations.",
        RegistrationErrorCode.REGISTRATION_NOT_ALLOWED,
        400
      );
    }

    // B. Concurrency-safe capacity check: evaluated under the row lock
    if (
      lockedEvent.capacity_mode === EventCapacityMode.PARTICIPANTS &&
      lockedEvent.capacity !== null
    ) {
      const currentActiveCount = await tx.eventParticipant.count({
        where: {
          eventId: event.id,
          registration: { status: RegistrationStatus.ACTIVE },
        },
      });

      const incomingCount =
        registrationType === RegistrationType.TEAM &&
        normalizedTeamMembers.length > 0
          ? normalizedTeamMembers.length
          : 1;

      if (currentActiveCount + incomingCount > lockedEvent.capacity) {
        throw new RegistrationDomainError(
          "This event has reached full capacity.",
          RegistrationErrorCode.EVENT_FULL,
          400
        );
      }
    } else if (
      lockedEvent.capacity_mode === EventCapacityMode.TEAMS &&
      lockedEvent.capacity !== null
    ) {
      const currentActiveTeams = await tx.registration.count({
        where: {
          eventId: event.id,
          status: RegistrationStatus.ACTIVE,
        },
      });

      if (currentActiveTeams + 1 > lockedEvent.capacity) {
        throw new RegistrationDomainError(
          "This event has reached full team capacity.",
          RegistrationErrorCode.EVENT_FULL,
          400
        );
      }
    }

    // C. Enforce active participation uniqueness for primary participant (application pre-check)
    if (identity.participantType === ParticipantType.CRESCENT) {
      const existing = await tx.eventParticipant.findFirst({
        where: {
          eventId: event.id,
          participantType: ParticipantType.CRESCENT,
          identifierNormalized: identity.identifierNormalized,
          registration: { status: RegistrationStatus.ACTIVE },
        },
      });

      if (existing) {
        throw new RegistrationDomainError(
          "A participant with this Crescent RRN is already actively registered for this event.",
          RegistrationErrorCode.DUPLICATE_REGISTRATION,
          400
        );
      }
    } else {
      const existing = await tx.eventParticipant.findFirst({
        where: {
          eventId: event.id,
          participantType: ParticipantType.EXTERNAL,
          collegeNormalized: identity.collegeNormalized,
          identifierNormalized: identity.identifierNormalized,
          registration: { status: RegistrationStatus.ACTIVE },
        },
      });

      if (existing) {
        throw new RegistrationDomainError(
          "A participant from this institution with this roll number is already actively registered for this event.",
          RegistrationErrorCode.DUPLICATE_REGISTRATION,
          400
        );
      }
    }

    // D. Enforce active participation uniqueness for team members
    for (const member of normalizedTeamMembers) {
      const isPrimary =
        member.participantType === identity.participantType &&
        member.identifierNormalized === identity.identifierNormalized &&
        (member.collegeNormalized || null) === (identity.collegeNormalized || null);

      if (isPrimary) {
        continue; // Already verified in step C
      }

      if (member.participantType === ParticipantType.CRESCENT) {
        const existingMember = await tx.eventParticipant.findFirst({
          where: {
            eventId: event.id,
            participantType: ParticipantType.CRESCENT,
            identifierNormalized: member.identifierNormalized,
            registration: { status: RegistrationStatus.ACTIVE },
          },
        });

        if (existingMember) {
          throw new RegistrationDomainError(
            `Team member with RRN ${member.identifierNormalized} is already actively registered for this event.`,
            RegistrationErrorCode.PARTICIPATION_LOCKED,
            400
          );
        }
      } else {
        const existingMember = await tx.eventParticipant.findFirst({
          where: {
            eventId: event.id,
            participantType: ParticipantType.EXTERNAL,
            collegeNormalized: member.collegeNormalized,
            identifierNormalized: member.identifierNormalized,
            registration: { status: RegistrationStatus.ACTIVE },
          },
        });

        if (existingMember) {
          throw new RegistrationDomainError(
            `Team member from ${member.collegeNormalized} with roll number ${member.identifierNormalized} is already actively registered for this event.`,
            RegistrationErrorCode.PARTICIPATION_LOCKED,
            400
          );
        }
      }
    }

    // E. Generate registration code
    const registrationCode = generateRegistrationCode(event.slug);

    // F. Create Registration record (permanently pinning activeFormVersionId)
    const registration = await tx.registration.create({
      data: {
        eventId: event.id,
        formVersionId: activeFormVersion.id,
        registrationType,
        participantType: identity.participantType,
        participantName: identity.participantName,
        collegeNormalized: identity.collegeNormalized,
        identifierNormalized: identity.identifierNormalized,
        status: RegistrationStatus.ACTIVE,
        registrationCode,
      },
    });

    // G. Create RegistrationResponse records
    for (const field of activeFormVersion.eventFields) {
      const val = validatedResponses[field.key];
      if (val !== undefined && val !== null && val !== "") {
        const isObj = typeof val === "object";
        await tx.registrationResponse.create({
          data: {
            registrationId: registration.id,
            eventFieldId: field.id,
            valueText: isObj ? JSON.stringify(val) : String(val),
            valueJson: isObj ? val : null,
          },
        });
      }
    }

    // H. Create EventParticipant identity lock for primary participant.
    // Database partial unique index (ep_crescent_unique / ep_external_unique) is the final guard.
    try {
      await tx.eventParticipant.create({
        data: {
          eventId: event.id,
          registrationId: registration.id,
          participantType: identity.participantType,
          collegeNormalized: identity.collegeNormalized,
          identifierNormalized: identity.identifierNormalized,
        },
      });
    } catch (insertErr: unknown) {
      if (isPrismaUniqueConstraintError(insertErr)) {
        throw new RegistrationDomainError(
          identity.participantType === ParticipantType.CRESCENT
            ? "A participant with this Crescent RRN is already actively registered for this event."
            : "A participant from this institution with this roll number is already actively registered for this event.",
          RegistrationErrorCode.DUPLICATE_REGISTRATION,
          400
        );
      }
      throw insertErr;
    }

    // I. Create Team and TeamMembers if team registration
    let teamRecord: { id: string; name: string | null } | null = null;

    if (registrationType === RegistrationType.TEAM) {
      const team = await tx.team.create({
        data: {
          registrationId: registration.id,
          name: teamName,
        },
      });
      teamRecord = team;

      for (const m of normalizedTeamMembers) {
        await tx.teamMember.create({
          data: {
            teamId: team.id,
            name: m.name,
            participantType: m.participantType,
            collegeNormalized: m.collegeNormalized,
            identifierNormalized: m.identifierNormalized,
            phone: m.phone || null,
            academicDepartment: m.academicDepartment || null,
            year: m.year || null,
            position: m.position || null,
            isLeader: m.isLeader,
          },
        });

        const isPrimary =
          m.participantType === identity.participantType &&
          m.identifierNormalized === identity.identifierNormalized &&
          (m.collegeNormalized || null) === (identity.collegeNormalized || null);

        // Only insert EventParticipant identity lock if not already inserted for primary participant in Step H
        if (!isPrimary) {
          try {
            await tx.eventParticipant.create({
              data: {
                eventId: event.id,
                registrationId: registration.id,
                participantType: m.participantType,
                collegeNormalized: m.collegeNormalized,
                identifierNormalized: m.identifierNormalized,
              },
            });
          } catch (memberErr: unknown) {
            if (isPrismaUniqueConstraintError(memberErr)) {
              throw new RegistrationDomainError(
                m.participantType === ParticipantType.CRESCENT
                  ? `Team member with RRN ${m.identifierNormalized} is already actively registered for this event.`
                  : `Team member from ${m.collegeNormalized} with roll number ${m.identifierNormalized} is already actively registered for this event.`,
                RegistrationErrorCode.PARTICIPATION_LOCKED,
                400
              );
            }
            throw memberErr;
          }
        }
      }
    }

    // J. Handle payment separation
    let paymentConfirmation: RegistrationConfirmation["payment"] = null;

    if (event.paymentMode === PaymentMode.PAID) {
      const feeAmount = event.feeAmount ? Number(event.feeAmount) : 0;
      const paymentMethod = event.paymentMethod || PaymentMethod.MANUAL_UPI;
      const upiId = event.upiId || null;
      const payeeName = event.payeeName || "Crescent Club of Finance";
      const paymentUri = upiId
        ? buildUpiUri(
            upiId,
            payeeName,
            feeAmount,
            `Registration ${registrationCode}`
          )
        : null;

      const payment = await tx.payment.create({
        data: {
          registrationId: registration.id,
          method: paymentMethod,
          status: PaymentStatus.PENDING,
          amount: feeAmount,
          currency: "INR",
          upiId,
          payeeName,
          paymentUri,
          userReference: input.payment?.userReference || null,
        },
      });

      paymentConfirmation = {
        status: payment.status,
        method: payment.method,
        amount: String(feeAmount),
        currency: "INR",
        upiId: payment.upiId !== undefined ? payment.upiId : upiId,
        payeeName: payment.payeeName !== undefined ? payment.payeeName : payeeName,
        paymentUri: payment.paymentUri !== undefined ? payment.paymentUri : paymentUri,
        userReference:
          payment.userReference !== undefined
            ? payment.userReference
            : input.payment?.userReference || null,
      };
    }

    return {
      id: registration.id,
      registrationCode: registration.registrationCode,
      status: registration.status,
      registrationType: registration.registrationType,
      participantType: registration.participantType,
      participantName: registration.participantName,
      createdAt: registration.createdAt.toISOString(),
      event: {
        id: event.id,
        slug: event.slug,
        name: event.name,
      },
      team:
        registrationType === RegistrationType.TEAM && teamRecord
          ? {
              id: teamRecord.id,
              name: teamRecord.name,
              members: normalizedTeamMembers.map((m) => ({
                name: m.name,
                participantType: m.participantType,
                isLeader: m.isLeader,
                identifierNormalized: m.identifierNormalized,
                collegeNormalized: m.collegeNormalized,
              })),
            }
          : null,
      payment: paymentConfirmation,
    };
  });
}

/**
 * Admin deletion of a registration.
 *
 * Cascading delete removes Registration and all child records:
 * - RegistrationResponse
 * - EventParticipant (releasing identity lock & capacity)
 * - Team & TeamMember
 * - Payment
 *
 * Auditable via createAuditLog.
 */
export async function deleteRegistrationByAdmin(
  registrationId: string,
  adminId: string
): Promise<{ success: boolean; releasedParticipantName: string }> {
  return await prisma.$transaction(async (tx) => {
    const registration = await tx.registration.findUnique({
      where: { id: registrationId },
      include: {
        event: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    if (!registration) {
      throw new RegistrationDomainError(
        "Registration not found.",
        RegistrationErrorCode.REGISTRATION_NOT_FOUND,
        404
      );
    }

    // Cascade delete via Prisma
    await tx.registration.delete({
      where: { id: registrationId },
    });

    // Record audit log
    await createAuditLog({
      actorId: adminId,
      action: "REGISTRATION_DELETED",
      entityType: "Registration",
      entityId: registrationId,
      metadata: {
        eventId: registration.eventId,
        eventSlug: registration.event.slug,
        eventName: registration.event.name,
        registrationCode: registration.registrationCode,
        participantName: registration.participantName,
        participantType: registration.participantType,
      },
    });

    return {
      success: true,
      releasedParticipantName: registration.participantName,
    };
  });
}

/**
 * Fetches registrations for an event for admin view.
 */
export async function getEventRegistrationsForAdmin(
  eventId: string
): Promise<AdminRegistrationView[]> {
  const registrations = await prisma.registration.findMany({
    where: { eventId },
    orderBy: { createdAt: "desc" },
    include: {
      formVersion: {
        select: {
          id: true,
          versionNumber: true,
        },
      },
      responses: {
        include: {
          eventField: {
            select: {
              id: true,
              key: true,
              label: true,
            },
          },
        },
      },
      team: {
        include: {
          members: true,
        },
      },
      payment: true,
    },
  });

  return registrations.map((reg) => ({
    id: reg.id,
    registrationCode: reg.registrationCode,
    status: reg.status,
    registrationType: reg.registrationType,
    participantType: reg.participantType,
    participantName: reg.participantName,
    collegeNormalized: reg.collegeNormalized,
    identifierNormalized: reg.identifierNormalized,
    formVersionId: reg.formVersionId,
    formVersionNumber: reg.formVersion.versionNumber,
    createdAt: reg.createdAt.toISOString(),
    updatedAt: reg.updatedAt.toISOString(),
    responses: reg.responses.map((resp) => ({
      fieldId: resp.eventFieldId,
      fieldKey: resp.eventField.key,
      fieldLabel: resp.eventField.label,
      valueText: resp.valueText,
      valueJson: resp.valueJson,
    })),
    team: reg.team
      ? {
          id: reg.team.id,
          name: reg.team.name,
          members: reg.team.members.map((m) => ({
            id: m.id,
            name: m.name,
            participantType: m.participantType,
            identifierNormalized: m.identifierNormalized,
            collegeNormalized: m.collegeNormalized,
            phone: m.phone,
            academicDepartment: m.academicDepartment,
            year: m.year,
            position: m.position,
            isLeader: m.isLeader,
          })),
        }
      : null,
    payment: reg.payment
      ? {
          id: reg.payment.id,
          status: reg.payment.status,
          method: reg.payment.method,
          amount: String(reg.payment.amount),
          currency: reg.payment.currency,
          upiId: reg.payment.upiId,
          payeeName: reg.payment.payeeName,
          paymentUri: reg.payment.paymentUri,
          userReference: reg.payment.userReference,
          verifiedBy: reg.payment.verifiedBy,
          verifiedAt: reg.payment.verifiedAt?.toISOString() || null,
        }
      : null,
  }));
}
