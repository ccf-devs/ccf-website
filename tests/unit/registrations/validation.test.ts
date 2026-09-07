import { describe, it, expect } from "vitest";
import { ParticipantType, RegistrationType } from "@prisma/client";
import { FieldType, FieldScope, EventFieldDomain } from "@/lib/forms/types";
import {
  RegistrationSubmissionSchema,
  TeamMemberSchema,
  extractAndNormalizeIdentity,
  validateDynamicResponses,
} from "@/lib/registrations/validation";
import { RegistrationDomainError, RegistrationErrorCode } from "@/lib/registrations/types";

describe("Phase 8: Registration Validation & Dynamic Form Integration", () => {
  const mockFields: EventFieldDomain[] = [
    {
      id: "field-1",
      formVersionId: "fv-1",
      key: "participant_type",
      label: "Participant Category",
      type: FieldType.RADIO,
      fieldScope: FieldScope.PARTICIPANT,
      required: true,
      displayOrder: 1,
      config: { options: ["CRESCENT", "EXTERNAL"], isSystem: true, systemKey: "participant_type" },
    },
    {
      id: "field-2",
      formVersionId: "fv-1",
      key: "participant_name",
      label: "Full Name",
      type: FieldType.TEXT,
      fieldScope: FieldScope.PARTICIPANT,
      required: true,
      displayOrder: 2,
      config: { isSystem: true, systemKey: "name" },
      validation: { min: 2, max: 200 },
    },
    {
      id: "field-3",
      formVersionId: "fv-1",
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
      id: "field-4",
      formVersionId: "fv-1",
      key: "college_name",
      label: "College Name",
      type: FieldType.TEXT,
      fieldScope: FieldScope.PARTICIPANT,
      required: true,
      displayOrder: 4,
      config: { isSystem: true, systemKey: "college" },
      validation: { min: 3, max: 250 },
      conditionalLogic: {
        dependsOn: "participant_type",
        operator: "equals",
        value: "EXTERNAL",
      },
    },
    {
      id: "field-5",
      formVersionId: "fv-1",
      key: "external_roll_number",
      label: "College Roll Number",
      type: FieldType.TEXT,
      fieldScope: FieldScope.PARTICIPANT,
      required: true,
      displayOrder: 5,
      config: { isSystem: true, systemKey: "external_roll" },
      validation: { min: 2, max: 100 },
      conditionalLogic: {
        dependsOn: "participant_type",
        operator: "equals",
        value: "EXTERNAL",
      },
    },
    {
      id: "field-6",
      formVersionId: "fv-1",
      key: "phone_number",
      label: "Phone",
      type: FieldType.PHONE,
      fieldScope: FieldScope.PARTICIPANT,
      required: true,
      displayOrder: 6,
      config: { isSystem: true, systemKey: "phone" },
    },
  ];

  describe("Request Payload Schema (RegistrationSubmissionSchema)", () => {
    it("validates a well-formed Crescent submission payload", () => {
      const payload = {
        participantType: ParticipantType.CRESCENT,
        registrationType: RegistrationType.INDIVIDUAL,
        responses: {
          participant_type: "CRESCENT",
          participant_name: "John Doe",
          crescent_rrn: "210071601001",
          phone_number: "9876543210",
        },
      };

      const result = RegistrationSubmissionSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it("validates a well-formed External submission payload", () => {
      const payload = {
        participantType: ParticipantType.EXTERNAL,
        registrationType: RegistrationType.INDIVIDUAL,
        responses: {
          participant_type: "EXTERNAL",
          participant_name: "Jane Smith",
          college_name: "Loyola College",
          external_roll_number: "22-CS-101",
          phone_number: "9876543210",
        },
      };

      const result = RegistrationSubmissionSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it("rejects invalid participantType", () => {
      const payload = {
        participantType: "OTHER",
        responses: {},
      };

      const result = RegistrationSubmissionSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it("rejects missing responses object", () => {
      const payload = {
        participantType: ParticipantType.CRESCENT,
      };

      const result = RegistrationSubmissionSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe("extractAndNormalizeIdentity", () => {
    it("extracts and normalizes Crescent identity properly", () => {
      const responses = {
        participant_name: "  Sarah Connor  ",
        crescent_rrn: " 210071601001 ",
      };

      const identity = extractAndNormalizeIdentity(
        ParticipantType.CRESCENT,
        responses,
        mockFields
      );

      expect(identity.participantType).toBe(ParticipantType.CRESCENT);
      expect(identity.participantName).toBe("Sarah Connor");
      expect(identity.collegeNormalized).toBeNull();
      expect(identity.identifierNormalized).toBe("210071601001");
    });

    it("extracts and normalizes External identity properly", () => {
      const responses = {
        participant_name: "  Alan Turing ",
        college_name: "  Cambridge   University ",
        external_roll_number: " math - 1936 ",
      };

      const identity = extractAndNormalizeIdentity(
        ParticipantType.EXTERNAL,
        responses,
        mockFields
      );

      expect(identity.participantType).toBe(ParticipantType.EXTERNAL);
      expect(identity.participantName).toBe("Alan Turing");
      expect(identity.collegeNormalized).toBe("CAMBRIDGE UNIVERSITY");
      expect(identity.identifierNormalized).toBe("MATH-1936");
    });

    it("throws when Crescent RRN is malformed", () => {
      const responses = {
        participant_name: "Bad RRN Student",
        crescent_rrn: "12345",
      };

      expect(() =>
        extractAndNormalizeIdentity(ParticipantType.CRESCENT, responses, mockFields)
      ).toThrow(RegistrationDomainError);
    });
  });

  describe("validateDynamicResponses & Conditional Visibility (Areas I & J)", () => {
    it("validates Crescent branch successfully without requiring External fields", () => {
      const responses = {
        participant_type: "CRESCENT",
        participant_name: "Valid Crescent",
        crescent_rrn: "210071601001",
        phone_number: "9876543210",
      };

      const validated = validateDynamicResponses(mockFields, responses);
      expect(validated.participant_name).toBe("Valid Crescent");
      expect(validated.crescent_rrn).toBe("210071601001");
    });

    it("validates External branch successfully without requiring Crescent RRN", () => {
      const responses = {
        participant_type: "EXTERNAL",
        participant_name: "Valid External",
        college_name: "IIT Madras",
        external_roll_number: "ME21B001",
        phone_number: "9876543210",
      };

      const validated = validateDynamicResponses(mockFields, responses);
      expect(validated.participant_name).toBe("Valid External");
      expect(validated.college_name).toBe("IIT Madras");
    });

    it("throws when a visible required field is missing", () => {
      const responses = {
        participant_type: "CRESCENT",
        participant_name: "Incomplete Crescent",
        // crescent_rrn missing!
        phone_number: "9876543210",
      };

      expect(() => validateDynamicResponses(mockFields, responses)).toThrow(
        RegistrationDomainError
      );
    });

    it("throws when a field fails pattern validation", () => {
      const responses = {
        participant_type: "CRESCENT",
        participant_name: "Invalid Pattern",
        crescent_rrn: "21007160100A", // Letters invalid
        phone_number: "9876543210",
      };

      expect(() => validateDynamicResponses(mockFields, responses)).toThrow(
        RegistrationDomainError
      );
    });
  });

  describe("Phase 9: Team Member & Team Roster Validation", () => {
    it("validates valid Crescent team member schema", () => {
      const parsed = TeamMemberSchema.safeParse({
        name: "Crescent Member",
        participantType: ParticipantType.CRESCENT,
        identifierNormalized: "210071601002",
        phone: "9876543210",
        academicDepartment: "Computer Science",
        year: "3",
        isLeader: false,
      });

      expect(parsed.success).toBe(true);
    });

    it("validates valid External team member schema", () => {
      const parsed = TeamMemberSchema.safeParse({
        name: "External Member",
        participantType: ParticipantType.EXTERNAL,
        collegeNormalized: "IIT Madras",
        identifierNormalized: "CS21B001",
        phone: "9876543211",
        academicDepartment: "Data Science",
        year: "2",
        isLeader: false,
      });

      expect(parsed.success).toBe(true);
    });

    it("rejects team member with invalid name length (<2 chars)", () => {
      const parsed = TeamMemberSchema.safeParse({
        name: "A",
        participantType: ParticipantType.CRESCENT,
        identifierNormalized: "210071601002",
      });

      expect(parsed.success).toBe(false);
    });

    it("validates full team registration submission payload with mixed members", () => {
      const parsed = RegistrationSubmissionSchema.safeParse({
        participantType: ParticipantType.CRESCENT,
        registrationType: RegistrationType.TEAM,
        responses: {
          participant_name: "Leader Crescent",
          crescent_rrn: "210071601001",
        },
        team: {
          name: "Alpha Quants",
          members: [
            {
              name: "Leader Crescent",
              participantType: ParticipantType.CRESCENT,
              identifierNormalized: "210071601001",
              isLeader: true,
            },
            {
              name: "External Member",
              participantType: ParticipantType.EXTERNAL,
              collegeNormalized: "IIT Madras",
              identifierNormalized: "CS21B001",
              isLeader: false,
            },
          ],
        },
      });

      expect(parsed.success).toBe(true);
      expect(parsed.data?.registrationType).toBe(RegistrationType.TEAM);
      expect(parsed.data?.team?.members?.length).toBe(2);
    });

    it("rejects team registration submission with invalid member structure", () => {
      const parsed = RegistrationSubmissionSchema.safeParse({
        participantType: ParticipantType.CRESCENT,
        registrationType: RegistrationType.TEAM,
        responses: {},
        team: {
          name: "Faulty Team",
          members: [
            {
              name: "",
              participantType: "UNKNOWN_TYPE",
            },
          ],
        },
      });

      expect(parsed.success).toBe(false);
    });
  });
});
