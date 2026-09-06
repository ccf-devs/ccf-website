import { EventFieldConditionalLogic } from "./types";

/**
 * Evaluates whether a field should be visible based on its conditional logic configuration
 * and the current form values.
 *
 * Handbook semantics:
 * - If no conditional logic is defined on the field, it is unconditionally visible.
 * - If conditional logic is defined, it evaluates the rule against the dependent field's value.
 * - This controls presentation visibility and conditional validation scope.
 * - Per user constraint: does not mutate or silently clear values from formValues.
 */
export function isFieldVisible(
  conditionalLogic: EventFieldConditionalLogic | null | undefined,
  formValues: Record<string, any>
): boolean {
  if (!conditionalLogic || !conditionalLogic.dependsOn) {
    return true;
  }

  const { dependsOn, operator, value: expectedValue } = conditionalLogic;
  const actualValue = formValues[dependsOn];

  // If dependent field has not been answered yet
  if (actualValue === undefined || actualValue === null || actualValue === "") {
    if (operator === "not_equals") {
      return expectedValue !== undefined && expectedValue !== null && expectedValue !== "";
    }
    return false;
  }

  const normalize = (v: any): string => String(v).trim().toLowerCase();

  switch (operator) {
    case "equals":
      return normalize(actualValue) === normalize(expectedValue);

    case "not_equals":
      return normalize(actualValue) !== normalize(expectedValue);

    case "in": {
      const allowed = Array.isArray(expectedValue)
        ? expectedValue.map(normalize)
        : [normalize(expectedValue)];
      if (Array.isArray(actualValue)) {
        const actualNorm = actualValue.map(normalize);
        return actualNorm.some((a) => allowed.includes(a));
      }
      return allowed.includes(normalize(actualValue));
    }

    case "not_in": {
      const forbidden = Array.isArray(expectedValue)
        ? expectedValue.map(normalize)
        : [normalize(expectedValue)];
      if (Array.isArray(actualValue)) {
        const actualNorm = actualValue.map(normalize);
        return !actualNorm.some((a) => forbidden.includes(a));
      }
      return !forbidden.includes(normalize(actualValue));
    }

    default:
      return true;
  }
}
