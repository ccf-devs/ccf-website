import { describe, it, expect } from "vitest";
import { isFieldVisible } from "@/lib/forms/conditional-logic";
import { EventFieldConditionalLogic } from "@/lib/forms/types";

describe("Phase 7: Conditional Logic Evaluator (isFieldVisible)", () => {
  it("returns true when conditionalLogic is null or undefined", () => {
    expect(isFieldVisible(null, {})).toBe(true);
    expect(isFieldVisible(undefined, {})).toBe(true);
  });

  it("returns true when dependsOn is missing or empty string", () => {
    const logic: EventFieldConditionalLogic = {
      dependsOn: "",
      operator: "equals",
      value: "ANY",
    };
    expect(isFieldVisible(logic, {})).toBe(true);
  });

  describe("Operator: equals", () => {
    const logic: EventFieldConditionalLogic = {
      dependsOn: "participant_type",
      operator: "equals",
      value: "CRESCENT",
    };

    it("evaluates true when dependent field equals target value", () => {
      expect(isFieldVisible(logic, { participant_type: "CRESCENT" })).toBe(true);
    });

    it("evaluates false when dependent field does not equal target value", () => {
      expect(isFieldVisible(logic, { participant_type: "EXTERNAL" })).toBe(false);
    });

    it("evaluates false when dependent field is undefined or empty", () => {
      expect(isFieldVisible(logic, {})).toBe(false);
      expect(isFieldVisible(logic, { participant_type: "" })).toBe(false);
      expect(isFieldVisible(logic, { participant_type: null })).toBe(false);
    });

    it("evaluates boolean equals", () => {
      const boolLogic: EventFieldConditionalLogic = {
        dependsOn: "has_laptop",
        operator: "equals",
        value: true,
      };
      expect(isFieldVisible(boolLogic, { has_laptop: true })).toBe(true);
      expect(isFieldVisible(boolLogic, { has_laptop: false })).toBe(false);
      expect(isFieldVisible(boolLogic, { has_laptop: "true" })).toBe(true); // string representation
    });
  });

  describe("Operator: not_equals", () => {
    const logic: EventFieldConditionalLogic = {
      dependsOn: "category",
      operator: "not_equals",
      value: "BEGINNER",
    };

    it("evaluates true when dependent field is not equal", () => {
      expect(isFieldVisible(logic, { category: "ADVANCED" })).toBe(true);
      expect(isFieldVisible(logic, { category: "INTERMEDIATE" })).toBe(true);
    });

    it("evaluates false when dependent field equals target value", () => {
      expect(isFieldVisible(logic, { category: "BEGINNER" })).toBe(false);
    });
  });

  describe("Operator: in", () => {
    const logic: EventFieldConditionalLogic = {
      dependsOn: "academic_year",
      operator: "in",
      value: ["Year 2", "Year 3", "Year 4"],
    };

    it("evaluates true when dependent scalar value is in array", () => {
      expect(isFieldVisible(logic, { academic_year: "Year 3" })).toBe(true);
      expect(isFieldVisible(logic, { academic_year: "Year 2" })).toBe(true);
    });

    it("evaluates false when dependent scalar value is not in array", () => {
      expect(isFieldVisible(logic, { academic_year: "Year 1" })).toBe(false);
      expect(isFieldVisible(logic, { academic_year: "Year 5" })).toBe(false);
    });

    it("evaluates true when dependent value is an array with intersection", () => {
      const arrayLogic: EventFieldConditionalLogic = {
        dependsOn: "interests",
        operator: "in",
        value: ["FinTech", "Quantitative Trading"],
      };

      expect(
        isFieldVisible(arrayLogic, { interests: ["Investment Banking", "FinTech"] })
      ).toBe(true);
      expect(
        isFieldVisible(arrayLogic, { interests: ["Accounting", "Corporate Law"] })
      ).toBe(false);
    });
  });

  describe("Operator: not_in", () => {
    const logic: EventFieldConditionalLogic = {
      dependsOn: "academic_level",
      operator: "not_in",
      value: ["School", "High School"],
    };

    it("evaluates true when value is not in excluded list", () => {
      expect(isFieldVisible(logic, { academic_level: "Undergraduate" })).toBe(true);
      expect(isFieldVisible(logic, { academic_level: "Postgraduate" })).toBe(true);
    });

    it("evaluates false when value is in excluded list", () => {
      expect(isFieldVisible(logic, { academic_level: "School" })).toBe(false);
    });
  });

  describe("Branch Testing: Crescent vs External Student Path", () => {
    const crescentLogic: EventFieldConditionalLogic = {
      dependsOn: "participant_type",
      operator: "equals",
      value: "CRESCENT",
    };

    const externalLogic: EventFieldConditionalLogic = {
      dependsOn: "participant_type",
      operator: "equals",
      value: "EXTERNAL",
    };

    it("shows Crescent fields and hides External fields for Crescent student", () => {
      const form = { participant_type: "CRESCENT" };
      expect(isFieldVisible(crescentLogic, form)).toBe(true);
      expect(isFieldVisible(externalLogic, form)).toBe(false);
    });

    it("shows External fields and hides Crescent fields for External student", () => {
      const form = { participant_type: "EXTERNAL" };
      expect(isFieldVisible(crescentLogic, form)).toBe(false);
      expect(isFieldVisible(externalLogic, form)).toBe(true);
    });

    it("hides both when participant_type has not been selected yet", () => {
      const form = {};
      expect(isFieldVisible(crescentLogic, form)).toBe(false);
      expect(isFieldVisible(externalLogic, form)).toBe(false);
    });
  });
});
