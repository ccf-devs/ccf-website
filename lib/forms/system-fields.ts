import { FieldType, FieldScope, EventFieldConfig, EventFieldValidation, EventFieldConditionalLogic } from "./types";

export interface SystemFieldPreset {
  key: string;
  label: string;
  type: FieldType;
  fieldScope: FieldScope;
  required: boolean;
  config: EventFieldConfig;
  validation?: EventFieldValidation;
  conditionalLogic?: EventFieldConditionalLogic;
  description: string;
}

/**
 * Platform standard presets for CCF events based on Handbook Section 17.5 & 17.6
 */
export const CCF_SYSTEM_FIELD_PRESETS: readonly SystemFieldPreset[] = [
  {
    key: "participant_type",
    label: "Participant Category",
    type: FieldType.RADIO,
    fieldScope: FieldScope.PARTICIPANT,
    required: true,
    config: {
      options: ["CRESCENT", "EXTERNAL"],
      isSystem: true,
      systemKey: "participant_type",
      helpText: "Select whether you are a Crescent student or from an external institution",
    },
    description: "Determines whether participant follows Crescent or External verification branch",
  },
  {
    key: "participant_name",
    label: "Full Name",
    type: FieldType.TEXT,
    fieldScope: FieldScope.PARTICIPANT,
    required: true,
    config: {
      placeholder: "Enter your full official name",
      isSystem: true,
      systemKey: "name",
    },
    validation: {
      min: 2,
      max: 200,
    },
    description: "Participant's official registered name",
  },
  {
    key: "crescent_rrn",
    label: "Crescent RRN",
    type: FieldType.TEXT,
    fieldScope: FieldScope.PARTICIPANT,
    required: true,
    config: {
      placeholder: "e.g. 210071601001",
      helpText: "12-digit Crescent student registration number starting with 2",
      isSystem: true,
      systemKey: "crescent_rrn",
    },
    validation: {
      pattern: "^2\\d{11}$",
      customErrorMessage: "Crescent RRN must be exactly 12 digits beginning with 2",
    },
    conditionalLogic: {
      dependsOn: "participant_type",
      operator: "equals",
      value: "CRESCENT",
    },
    description: "Crescent-specific 12-digit identity key starting with 2",
  },
  {
    key: "college_name",
    label: "College / University Name",
    type: FieldType.TEXT,
    fieldScope: FieldScope.PARTICIPANT,
    required: true,
    config: {
      placeholder: "Enter your college or university name",
      isSystem: true,
      systemKey: "college",
    },
    validation: {
      min: 3,
      max: 250,
    },
    conditionalLogic: {
      dependsOn: "participant_type",
      operator: "equals",
      value: "EXTERNAL",
    },
    description: "External institution name for non-Crescent participants",
  },
  {
    key: "external_roll_number",
    label: "College Roll / Register Number",
    type: FieldType.TEXT,
    fieldScope: FieldScope.PARTICIPANT,
    required: true,
    config: {
      placeholder: "e.g. 2022-CS-401",
      helpText: "Official roll number assigned by your college",
      isSystem: true,
      systemKey: "external_roll",
    },
    validation: {
      min: 2,
      max: 100,
    },
    conditionalLogic: {
      dependsOn: "participant_type",
      operator: "equals",
      value: "EXTERNAL",
    },
    description: "External participant's college roll number",
  },
  {
    key: "academic_department",
    label: "Department / Degree",
    type: FieldType.TEXT,
    fieldScope: FieldScope.PARTICIPANT,
    required: true,
    config: {
      placeholder: "e.g. Department of Commerce, B.Com (General)",
      isSystem: true,
      systemKey: "department",
    },
    description: "Academic department or degree program",
  },
  {
    key: "academic_year",
    label: "Year of Study",
    type: FieldType.SELECT,
    fieldScope: FieldScope.PARTICIPANT,
    required: true,
    config: {
      options: ["1st Year", "2nd Year", "3rd Year", "4th Year", "Postgraduate"],
      isSystem: true,
      systemKey: "year",
    },
    description: "Current academic year level",
  },
  {
    key: "academic_level",
    label: "Academic Level",
    type: FieldType.RADIO,
    fieldScope: FieldScope.PARTICIPANT,
    required: true,
    config: {
      options: ["Undergraduate (UG)", "Postgraduate (PG)"],
      isSystem: true,
      systemKey: "academic_level",
    },
    description: "UG or PG classification",
  },
  {
    key: "phone_number",
    label: "WhatsApp Number",
    type: FieldType.PHONE,
    fieldScope: FieldScope.PARTICIPANT,
    required: true,
    config: {
      placeholder: "10-digit mobile number",
      helpText: "Used for official event updates and WhatsApp group coordination",
      isSystem: true,
      systemKey: "phone",
    },
    description: "10-digit phone number with WhatsApp capability",
  },
  {
    key: "email_address",
    label: "Email Address",
    type: FieldType.EMAIL,
    fieldScope: FieldScope.PARTICIPANT,
    required: false,
    config: {
      placeholder: "name@example.com",
      isSystem: true,
      systemKey: "email",
    },
    description: "Optional or required contact email",
  },
  {
    key: "team_name",
    label: "Team Name",
    type: FieldType.TEXT,
    fieldScope: FieldScope.TEAM,
    required: true,
    config: {
      placeholder: "e.g. Alpha Quants",
      isSystem: true,
      systemKey: "team_name",
    },
    validation: {
      min: 2,
      max: 200,
    },
    description: "Team name for team-based events",
  },
];
