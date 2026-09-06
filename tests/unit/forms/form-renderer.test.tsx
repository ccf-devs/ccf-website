import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { FormRenderer } from "@/components/forms/form-renderer";
import { FieldType, FieldScope, EventFieldDomain } from "@/lib/forms/types";

describe("Phase 7: FormRenderer Component Tests", () => {
  const sampleFields: EventFieldDomain[] = [
    {
      id: "f1",
      versionId: "v1",
      key: "participant_type",
      label: "Participant Classification",
      type: FieldType.RADIO,
      fieldScope: FieldScope.PARTICIPANT,
      required: true,
      displayOrder: 1,
      config: {
        options: ["CRESCENT", "EXTERNAL"],
        helpText: "Select whether you are from Crescent or another college",
        isSystem: true,
      },
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
      config: {
        placeholder: "e.g. Aadhya Sharma",
      },
      validation: {},
      conditionalLogic: null,
    },
    {
      id: "f3",
      versionId: "v1",
      key: "crescent_rrn",
      label: "Crescent RRN",
      type: FieldType.TEXT,
      fieldScope: FieldScope.PARTICIPANT,
      required: true,
      displayOrder: 3,
      config: {
        placeholder: "12-digit RRN",
      },
      validation: {},
      conditionalLogic: {
        dependsOn: "participant_type",
        operator: "equals",
        value: "CRESCENT",
      },
    },
    {
      id: "f4",
      versionId: "v1",
      key: "college_name",
      label: "External Institution Name",
      type: FieldType.TEXT,
      fieldScope: FieldScope.PARTICIPANT,
      required: true,
      displayOrder: 4,
      config: {
        placeholder: "e.g. Loyola College",
      },
      validation: {},
      conditionalLogic: {
        dependsOn: "participant_type",
        operator: "equals",
        value: "EXTERNAL",
      },
    },
    {
      id: "f5",
      versionId: "v1",
      key: "comments",
      label: "Additional Notes",
      type: FieldType.TEXTAREA,
      fieldScope: FieldScope.REGISTRATION,
      required: false,
      displayOrder: 5,
      config: {},
      validation: {},
      conditionalLogic: null,
    },
    {
      id: "f6",
      versionId: "v1",
      key: "student_id_card",
      label: "Student ID Card Photo",
      type: FieldType.FILE,
      fieldScope: FieldScope.PARTICIPANT,
      required: false,
      displayOrder: 6,
      config: {
        helpText: "Accepted formats: PNG, JPG, PDF (Max 5MB)",
      },
      validation: {},
      conditionalLogic: null,
    },
  ];

  it("renders the form container with proper accessibility attributes", () => {
    const html = renderToStaticMarkup(
      <FormRenderer
        fields={sampleFields}
        values={{}}
        onChange={() => {}}
      />
    );

    expect(html).toContain('aria-label="Event Registration Form"');
    expect(html.toLowerCase()).toContain("novalidate");
  });

  it("renders visible common fields and system badge", () => {
    const html = renderToStaticMarkup(
      <FormRenderer
        fields={sampleFields}
        values={{}}
        onChange={() => {}}
      />
    );

    expect(html).toContain("Participant Classification");
    expect(html).toContain("Full Name");
    expect(html).toContain("Additional Notes");
    expect(html).toContain("Student ID Card Photo");
    // System badge for participant_type
    expect(html).toContain("System");
    // Help text
    expect(html).toContain("Select whether you are from Crescent or another college");
  });

  it("dynamically shows Crescent fields and hides External fields when participant_type=CRESCENT", () => {
    const html = renderToStaticMarkup(
      <FormRenderer
        fields={sampleFields}
        values={{ participant_type: "CRESCENT" }}
        onChange={() => {}}
      />
    );

    expect(html).toContain("Crescent RRN");
    expect(html).toContain("12-digit RRN");
    expect(html).not.toContain("External Institution Name");
  });

  it("dynamically shows External fields and hides Crescent fields when participant_type=EXTERNAL", () => {
    const html = renderToStaticMarkup(
      <FormRenderer
        fields={sampleFields}
        values={{ participant_type: "EXTERNAL" }}
        onChange={() => {}}
      />
    );

    expect(html).toContain("External Institution Name");
    expect(html).toContain("Loyola College");
    expect(html).not.toContain("Crescent RRN");
  });

  it("hides conditional fields when no condition is met", () => {
    const html = renderToStaticMarkup(
      <FormRenderer
        fields={sampleFields}
        values={{}}
        onChange={() => {}}
      />
    );

    expect(html).not.toContain("Crescent RRN");
    expect(html).not.toContain("External Institution Name");
  });

  it("renders validation error messages and aria-invalid attributes", () => {
    const html = renderToStaticMarkup(
      <FormRenderer
        fields={sampleFields}
        values={{ participant_name: "" }}
        errors={{ participant_name: "Full Name is required" }}
        onChange={() => {}}
      />
    );

    expect(html).toContain('role="alert"');
    expect(html).toContain("Full Name is required");
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('aria-describedby="participant_name-error"');
  });

  it("renders disabled inputs when disabled or readOnly is true", () => {
    const html = renderToStaticMarkup(
      <FormRenderer
        fields={sampleFields}
        values={{ participant_name: "Test" }}
        disabled={true}
        onChange={() => {}}
      />
    );

    expect(html).toContain("disabled");
  });
});
