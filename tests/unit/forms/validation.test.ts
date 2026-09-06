import { describe, it, expect } from "vitest";
import {
  EventFieldInputSchema,
  EventFieldUpdateSchema,
  FormVersionCreateSchema,
  FieldReorderSchema,
  validateFormSubmission,
} from "@/lib/forms/validation";
import { FieldType, FieldScope, EventFieldDomain } from "@/lib/forms/types";

describe("Phase 7: Dynamic Form Engine Validation Specification", () => {
  describe("A. EventFieldInputSchema", () => {
    it("accepts a valid text field configuration", () => {
      const payload = {
        key: "participant_name",
        label: "Full Name",
        type: FieldType.TEXT,
        fieldScope: FieldScope.PARTICIPANT,
        required: true,
        config: {
          placeholder: "e.g. John Doe",
          helpText: "Enter your official name as per college ID",
          isSystem: true,
        },
      };

      const result = EventFieldInputSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it("rejects invalid field keys (uppercase, spaces, special chars)", () => {
      const invalidKeys = [
        "ParticipantName",
        "participant name",
        "participant-name",
        "participant@name",
        "123participant",
        "",
      ];

      invalidKeys.forEach((key) => {
        const result = EventFieldInputSchema.safeParse({
          key,
          label: "Test Label",
          type: FieldType.TEXT,
          fieldScope: FieldScope.PARTICIPANT,
        });
        expect(result.success).toBe(false);
      });
    });

    it("accepts all 13 finalized Handbook Field Types", () => {
      const allTypes = [
        FieldType.TEXT,
        FieldType.TEXTAREA,
        FieldType.NUMBER,
        FieldType.EMAIL,
        FieldType.PHONE,
        FieldType.DATE,
        FieldType.TIME,
        FieldType.DATETIME,
        FieldType.SELECT,
        FieldType.MULTI_SELECT,
        FieldType.RADIO,
        FieldType.CHECKBOX,
        FieldType.FILE,
      ];

      expect(allTypes).toHaveLength(13);

      allTypes.forEach((type) => {
        const requiresOptions = (
          [FieldType.SELECT, FieldType.MULTI_SELECT, FieldType.RADIO] as FieldType[]
        ).includes(type);
        const result = EventFieldInputSchema.safeParse({
          key: `field_${type.toLowerCase()}`,
          label: `Test ${type}`,
          type,
          fieldScope: FieldScope.PARTICIPANT,
          config: requiresOptions ? { options: ["Option A", "Option B"] } : {},
        });
        expect(result.success).toBe(true);
      });
    });

    it("enforces options for SELECT, MULTI_SELECT, and RADIO fields", () => {
      const optionTypes = [FieldType.SELECT, FieldType.MULTI_SELECT, FieldType.RADIO];

      optionTypes.forEach((type) => {
        // Missing options
        const resultEmpty = EventFieldInputSchema.safeParse({
          key: `test_${type.toLowerCase()}`,
          label: `Test ${type}`,
          type,
          fieldScope: FieldScope.PARTICIPANT,
          config: { options: [] },
        });
        expect(resultEmpty.success).toBe(false);

        // Valid options
        const resultValid = EventFieldInputSchema.safeParse({
          key: `test_${type.toLowerCase()}`,
          label: `Test ${type}`,
          type,
          fieldScope: FieldScope.PARTICIPANT,
          config: { options: ["Option 1", "Option 2"] },
        });
        expect(resultValid.success).toBe(true);
      });
    });

    it("accepts all 4 finalized Field Scopes", () => {
      const scopes = [
        FieldScope.REGISTRATION,
        FieldScope.PARTICIPANT,
        FieldScope.TEAM,
        FieldScope.TEAM_MEMBER,
      ];

      scopes.forEach((fieldScope) => {
        const result = EventFieldInputSchema.safeParse({
          key: `scope_${fieldScope.toLowerCase()}`,
          label: `Scope ${fieldScope}`,
          type: FieldType.TEXT,
          fieldScope,
        });
        expect(result.success).toBe(true);
      });
    });

    it("validates conditional logic structure correctly", () => {
      const validConditional = {
        key: "crescent_rrn",
        label: "Crescent RRN",
        type: FieldType.TEXT,
        fieldScope: FieldScope.PARTICIPANT,
        conditionalLogic: {
          dependsOn: "participant_type",
          operator: "equals" as const,
          value: "CRESCENT",
        },
      };

      const result = EventFieldInputSchema.safeParse(validConditional);
      expect(result.success).toBe(true);

      const invalidConditional = {
        key: "crescent_rrn",
        label: "Crescent RRN",
        type: FieldType.TEXT,
        fieldScope: FieldScope.PARTICIPANT,
        conditionalLogic: {
          dependsOn: "",
          operator: "invalid_operator",
          value: "CRESCENT",
        },
      };

      const invalidResult = EventFieldInputSchema.safeParse(invalidConditional);
      expect(invalidResult.success).toBe(false);
    });
  });

  describe("B. FieldReorderSchema", () => {
    it("accepts valid reorder list with positive displayOrder values", () => {
      const valid = {
        items: [
          { id: "field-1", displayOrder: 1 },
          { id: "field-2", displayOrder: 2 },
        ],
      };
      expect(FieldReorderSchema.safeParse(valid).success).toBe(true);
    });

    it("rejects non-positive displayOrder", () => {
      const invalid = {
        items: [{ id: "field-1", displayOrder: 0 }],
      };
      expect(FieldReorderSchema.safeParse(invalid).success).toBe(false);
    });

    it("rejects duplicate field IDs in reorder list", () => {
      const duplicateIds = {
        items: [
          { id: "field-1", displayOrder: 1 },
          { id: "field-1", displayOrder: 2 },
        ],
      };
      const result = FieldReorderSchema.safeParse(duplicateIds);
      expect(result.success).toBe(false);
    });

    it("rejects duplicate displayOrder values in reorder list", () => {
      const duplicateOrders = {
        items: [
          { id: "field-1", displayOrder: 1 },
          { id: "field-2", displayOrder: 1 },
        ],
      };
      const result = FieldReorderSchema.safeParse(duplicateOrders);
      expect(result.success).toBe(false);
    });
  });

  describe("C. Dynamic Submission Validation (validateFormSubmission)", () => {
    const fields: EventFieldDomain[] = [
      {
        id: "f1",
        versionId: "v1",
        key: "participant_type",
        label: "Participant Type",
        type: FieldType.RADIO,
        fieldScope: FieldScope.PARTICIPANT,
        required: true,
        displayOrder: 1,
        config: { options: ["CRESCENT", "EXTERNAL"] },
        validation: {},
        conditionalLogic: null,
      },
      {
        id: "f2",
        versionId: "v1",
        key: "participant_name",
        label: "Full Name",
        type: FieldType.TEXT,
        fieldScope: FieldScope.PARTICIPANT,
        required: true,
        displayOrder: 2,
        config: {},
        validation: { minLength: 2, maxLength: 50 },
        conditionalLogic: null,
      },
      {
        id: "f3",
        versionId: "v1",
        key: "email_address",
        label: "Email",
        type: FieldType.EMAIL,
        fieldScope: FieldScope.PARTICIPANT,
        required: true,
        displayOrder: 3,
        config: {},
        validation: {},
        conditionalLogic: null,
      },
      {
        id: "f4",
        versionId: "v1",
        key: "phone_number",
        label: "Phone",
        type: FieldType.PHONE,
        fieldScope: FieldScope.PARTICIPANT,
        required: true,
        displayOrder: 4,
        config: {},
        validation: {},
        conditionalLogic: null,
      },
      {
        id: "f5",
        versionId: "v1",
        key: "crescent_rrn",
        label: "Crescent RRN",
        type: FieldType.TEXT,
        fieldScope: FieldScope.PARTICIPANT,
        required: true,
        displayOrder: 5,
        config: {},
        validation: {
          pattern: "^2\\d{11}$",
          customErrorMessage: "RRN must be 12 digits starting with 2",
        },
        conditionalLogic: {
          dependsOn: "participant_type",
          operator: "equals",
          value: "CRESCENT",
        },
      },
      {
        id: "f6",
        versionId: "v1",
        key: "college_name",
        label: "Institution / College Name",
        type: FieldType.TEXT,
        fieldScope: FieldScope.PARTICIPANT,
        required: true,
        displayOrder: 6,
        config: {},
        validation: {},
        conditionalLogic: {
          dependsOn: "participant_type",
          operator: "equals",
          value: "EXTERNAL",
        },
      },
      {
        id: "f7",
        versionId: "v1",
        key: "agree_terms",
        label: "I agree to rules",
        type: FieldType.CHECKBOX,
        fieldScope: FieldScope.REGISTRATION,
        required: true,
        displayOrder: 7,
        config: {},
        validation: {},
        conditionalLogic: null,
      },
    ];

    it("passes for valid Crescent participant submission", () => {
      const values = {
        participant_type: "CRESCENT",
        participant_name: "Aadhya Sharma",
        email_address: "aadhya@crescent.education",
        phone_number: "+919876543210",
        crescent_rrn: "210011601045",
        agree_terms: true,
      };

      const result = validateFormSubmission(fields, values);
      expect(result.success).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it("passes for valid External participant submission (does NOT require crescent_rrn)", () => {
      const values = {
        participant_type: "EXTERNAL",
        participant_name: "Rahul Verma",
        email_address: "rahul@othercollege.edu",
        phone_number: "+919876543222",
        college_name: "Loyola College",
        agree_terms: true,
      };

      const result = validateFormSubmission(fields, values);
      expect(result.success).toBe(true);
    });

    it("fails when required crescent_rrn is missing for Crescent participant", () => {
      const values = {
        participant_type: "CRESCENT",
        participant_name: "Aadhya Sharma",
        email_address: "aadhya@crescent.education",
        phone_number: "+919876543210",
        crescent_rrn: "",
        agree_terms: true,
      };

      const result = validateFormSubmission(fields, values);
      expect(result.success).toBe(false);
      expect(result.errors?.crescent_rrn).toBeDefined();
    });

    it("enforces regex pattern validation and custom error message", () => {
      const values = {
        participant_type: "CRESCENT",
        participant_name: "Aadhya Sharma",
        email_address: "aadhya@crescent.education",
        phone_number: "+919876543210",
        crescent_rrn: "12345", // Invalid RRN format
        agree_terms: true,
      };

      const result = validateFormSubmission(fields, values);
      expect(result.success).toBe(false);
      expect(result.errors?.crescent_rrn).toContain("RRN must be 12 digits starting with 2");
    });

    it("enforces email format validation", () => {
      const values = {
        participant_type: "EXTERNAL",
        participant_name: "Rahul Verma",
        email_address: "not-an-email",
        phone_number: "+919876543222",
        college_name: "Loyola College",
        agree_terms: true,
      };

      const result = validateFormSubmission(fields, values);
      expect(result.success).toBe(false);
      expect(result.errors?.email_address).toContain("valid email");
    });

    it("enforces checkbox required status (must be true)", () => {
      const values = {
        participant_type: "EXTERNAL",
        participant_name: "Rahul Verma",
        email_address: "rahul@loyola.edu",
        phone_number: "+919876543222",
        college_name: "Loyola College",
        agree_terms: false,
      };

      const result = validateFormSubmission(fields, values);
      expect(result.success).toBe(false);
      expect(result.errors?.agree_terms).toBeDefined();
    });

    it("preserves submission values for hidden fields without clearing them (per constraint)", () => {
      // User constraint: Do not silently clear/remove hidden values
      const values = {
        participant_type: "EXTERNAL",
        participant_name: "Rahul Verma",
        email_address: "rahul@loyola.edu",
        phone_number: "+919876543222",
        college_name: "Loyola College",
        crescent_rrn: "210011601099", // Previously filled value for hidden branch
        agree_terms: true,
      };

      const result = validateFormSubmission(fields, values);
      expect(result.success).toBe(true);
      // Validated values preserve the submitted crescent_rrn
      expect(result.validatedValues.crescent_rrn).toBe("210011601099");
    });
  });
});
