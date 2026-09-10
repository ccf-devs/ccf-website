import { describe, it, expect } from "vitest";
import {
  transformRegistrationsToCsvRows,
  resolveDynamicColumns,
  formatFieldValueForCsv,
} from "@/lib/csv/registrations";
import { AdminRegistrationView } from "@/lib/registrations/types";
import {
  RegistrationStatus,
  RegistrationType,
  ParticipantType,
  PaymentStatus,
  PaymentMethod,
} from "@prisma/client";

describe("Registration CSV Transformer Unit Tests", () => {
  const sampleEvent = {
    id: "event-uuid-1",
    name: "FinVibe Fiesta 2026",
    slug: "finvibe-fiesta-2026",
  };

  /* -------------------------------------------------------------------------- */
  /* 1. Value Formatter                                                         */
  /* -------------------------------------------------------------------------- */
  describe("1. Value Formatter", () => {
    it("returns valueText directly when present", () => {
      expect(formatFieldValueForCsv("Sample Text", null)).toBe("Sample Text");
    });

    it("formats array values as comma-separated string", () => {
      expect(formatFieldValueForCsv(null, ["Stocks", "Cryptocurrency", "Forex"])).toBe(
        "Stocks, Cryptocurrency, Forex"
      );
    });

    it("formats booleans as Yes / No", () => {
      expect(formatFieldValueForCsv(null, true)).toBe("Yes");
      expect(formatFieldValueForCsv(null, false)).toBe("No");
    });

    it("serializes nested objects safely", () => {
      const obj = { college: "Crescent", year: "3" };
      expect(formatFieldValueForCsv(null, obj)).toBe(JSON.stringify(obj));
    });

    it("returns empty string for null/undefined", () => {
      expect(formatFieldValueForCsv(null, null)).toBe("");
      expect(formatFieldValueForCsv(undefined, undefined)).toBe("");
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 2. Individual Registration -> Exactly 1 Row                                 */
  /* -------------------------------------------------------------------------- */
  describe("2. Individual Registration", () => {
    const individualReg: AdminRegistrationView = {
      id: "reg-1",
      registrationCode: "CCF-FIN-001",
      status: RegistrationStatus.ACTIVE,
      registrationType: RegistrationType.INDIVIDUAL,
      participantType: ParticipantType.CRESCENT,
      participantName: "Rohith Y",
      collegeNormalized: null,
      identifierNormalized: "210011601001",
      formVersionId: "fv-1",
      formVersionNumber: 1,
      createdAt: "2026-09-08T10:00:00.000Z",
      updatedAt: "2026-09-08T10:00:00.000Z",
      responses: [
        {
          fieldId: "f-1",
          fieldKey: "department",
          fieldLabel: "Academic Department",
          valueText: "Information Technology",
          valueJson: null,
        },
      ],
      team: null,
      payment: {
        id: "pay-1",
        status: PaymentStatus.VERIFIED,
        method: PaymentMethod.MANUAL_UPI,
        amount: "150.00",
        currency: "INR",
        upiId: "ccf@upi",
        payeeName: "CCF Treasurer",
        paymentUri: null,
        userReference: "UTR987654321",
        verifiedBy: "admin-1",
        verifiedAt: "2026-09-08T11:00:00.000Z",
      },
    };

    it("transforms individual registration to exactly one row", () => {
      const { columns, rows } = transformRegistrationsToCsvRows({
        event: sampleEvent,
        registrations: [individualReg],
      });

      expect(rows).toHaveLength(1);
      const row = rows[0];

      // Columns check
      expect(columns).toContain("Event");
      expect(columns).toContain("Registration Code");
      expect(columns).toContain("Member Role");
      expect(columns).toContain("Member Name");
      expect(columns).toContain("Member Identifier / RRN");
      expect(columns).toContain("Payment Status");
      expect(columns).toContain("Payment Amount");
      expect(columns).toContain("Academic Department");

      // Shared & Individual values
      const codeIndex = columns.indexOf("Registration Code");
      const nameIndex = columns.indexOf("Member Name");
      const rrnIndex = columns.indexOf("Member Identifier / RRN");
      const roleIndex = columns.indexOf("Member Role");
      const payStatusIndex = columns.indexOf("Payment Status");
      const amountIndex = columns.indexOf("Payment Amount");
      const deptIndex = columns.indexOf("Academic Department");

      expect(row[codeIndex]).toBe("CCF-FIN-001");
      expect(row[nameIndex]).toBe("Rohith Y");
      expect(row[rrnIndex]).toBe("210011601001");
      expect(row[roleIndex]).toBe("Individual");
      expect(row[payStatusIndex]).toBe("VERIFIED");
      expect(row[amountIndex]).toBe("150.00");
      expect(row[deptIndex]).toBe("Information Technology");
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 3. Team Registration -> Exactly 1 Row Per Team Member                       */
  /* -------------------------------------------------------------------------- */
  describe("3. Team Registration & Member Ordinals", () => {
    const teamReg: AdminRegistrationView = {
      id: "reg-team-1",
      registrationCode: "CCF-TEAM-001",
      status: RegistrationStatus.ACTIVE,
      registrationType: RegistrationType.TEAM,
      participantType: ParticipantType.CRESCENT,
      participantName: "Kaleem",
      collegeNormalized: null,
      identifierNormalized: "210011601002",
      formVersionId: "fv-1",
      formVersionNumber: 1,
      createdAt: "2026-09-08T10:00:00.000Z",
      updatedAt: "2026-09-08T10:00:00.000Z",
      responses: [
        {
          fieldId: "f-1",
          fieldKey: "strategy",
          fieldLabel: "Trading Strategy",
          valueText: "Value Investing",
          valueJson: null,
        },
      ],
      team: {
        id: "team-1",
        name: "Alpha Traders",
        members: [
          {
            id: "m-2",
            name: "Member Two",
            participantType: ParticipantType.EXTERNAL,
            identifierNormalized: "EXT-888",
            collegeNormalized: "Loyola College",
            phone: "9876543210",
            academicDepartment: "Commerce",
            year: "2nd Year",
            position: "Analyst",
            isLeader: false,
          },
          {
            id: "m-1",
            name: "Leader Kaleem",
            participantType: ParticipantType.CRESCENT,
            identifierNormalized: "210011601002",
            collegeNormalized: "BSA Crescent",
            phone: "9123456780",
            academicDepartment: "Management Studies",
            year: "3rd Year",
            position: "Team Lead",
            isLeader: true,
          },
        ],
      },
      payment: {
        id: "pay-team",
        status: PaymentStatus.VERIFIED,
        method: PaymentMethod.MANUAL_UPI,
        amount: "300.00",
        currency: "INR",
        upiId: "ccf@upi",
        payeeName: "CCF Treasurer",
        paymentUri: null,
        userReference: "UTR-TEAM-123",
        verifiedBy: "admin-1",
        verifiedAt: "2026-09-08T11:00:00.000Z",
      },
    };

    it("transforms team registration into exactly one row per team member", () => {
      const { columns, rows } = transformRegistrationsToCsvRows({
        event: sampleEvent,
        registrations: [teamReg],
      });

      // 2 team members -> exactly 2 rows
      expect(rows).toHaveLength(2);

      const leaderRow = rows[0];
      const memberRow = rows[1];

      const teamNameIdx = columns.indexOf("Team Name");
      const ordinalIdx = columns.indexOf("Member Ordinal");
      const roleIdx = columns.indexOf("Member Role");
      const memberNameIdx = columns.indexOf("Member Name");
      const memberCollegeIdx = columns.indexOf("Member College");
      const memberTypeIdx = columns.indexOf("Member Participant Type");
      const regCodeIdx = columns.indexOf("Registration Code");
      const strategyIdx = columns.indexOf("Trading Strategy");
      const payAmountIdx = columns.indexOf("Payment Amount");

      // Leader (Ordinal 1, sorted first)
      expect(leaderRow[ordinalIdx]).toBe(1);
      expect(leaderRow[roleIdx]).toBe("Leader");
      expect(leaderRow[memberNameIdx]).toBe("Leader Kaleem");
      expect(leaderRow[memberCollegeIdx]).toBe("BSA Crescent");
      expect(leaderRow[memberTypeIdx]).toBe("CRESCENT");

      // Member 2 (Ordinal 2, sorted second)
      expect(memberRow[ordinalIdx]).toBe(2);
      expect(memberRow[roleIdx]).toBe("Member");
      expect(memberRow[memberNameIdx]).toBe("Member Two");
      expect(memberRow[memberCollegeIdx]).toBe("Loyola College");
      expect(memberRow[memberTypeIdx]).toBe("EXTERNAL");

      // Repeated shared fields
      expect(leaderRow[regCodeIdx]).toBe("CCF-TEAM-001");
      expect(memberRow[regCodeIdx]).toBe("CCF-TEAM-001");

      expect(leaderRow[teamNameIdx]).toBe("Alpha Traders");
      expect(memberRow[teamNameIdx]).toBe("Alpha Traders");

      expect(leaderRow[payAmountIdx]).toBe("300.00");
      expect(memberRow[payAmountIdx]).toBe("300.00");

      expect(leaderRow[strategyIdx]).toBe("Value Investing");
      expect(memberRow[strategyIdx]).toBe("Value Investing");
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 4. Multiple Form Versions & Column Union                                    */
  /* -------------------------------------------------------------------------- */
  describe("4. Multiple Form Versions & Dynamic Column Union", () => {
    // Registration from Version 1 (had "Experience Level")
    const regV1: AdminRegistrationView = {
      id: "reg-v1",
      registrationCode: "CCF-V1-001",
      status: RegistrationStatus.ACTIVE,
      registrationType: RegistrationType.INDIVIDUAL,
      participantType: ParticipantType.CRESCENT,
      participantName: "Old Participant",
      collegeNormalized: null,
      identifierNormalized: "210011601005",
      formVersionId: "fv-1",
      formVersionNumber: 1,
      createdAt: "2026-09-01T10:00:00.000Z",
      updatedAt: "2026-09-01T10:00:00.000Z",
      responses: [
        {
          fieldId: "f-v1-1",
          fieldKey: "experience_level",
          fieldLabel: "Experience Level",
          valueText: "Intermediate",
          valueJson: null,
        },
      ],
      team: null,
      payment: null,
    };

    // Registration from Version 2 (added "Portfolio URL", kept "Experience Level")
    const regV2: AdminRegistrationView = {
      id: "reg-v2",
      registrationCode: "CCF-V2-002",
      status: RegistrationStatus.ACTIVE,
      registrationType: RegistrationType.INDIVIDUAL,
      participantType: ParticipantType.CRESCENT,
      participantName: "New Participant",
      collegeNormalized: null,
      identifierNormalized: "210011601006",
      formVersionId: "fv-2",
      formVersionNumber: 2,
      createdAt: "2026-09-05T10:00:00.000Z",
      updatedAt: "2026-09-05T10:00:00.000Z",
      responses: [
        {
          fieldId: "f-v2-1",
          fieldKey: "experience_level",
          fieldLabel: "Experience Level",
          valueText: "Advanced",
          valueJson: null,
        },
        {
          fieldId: "f-v2-2",
          fieldKey: "portfolio_url",
          fieldLabel: "Portfolio URL",
          valueText: "https://github.com/newparticipant",
          valueJson: null,
        },
      ],
      team: null,
      payment: null,
    };

    it("creates a stable union of dynamic columns across form versions", () => {
      const { columns, rows } = transformRegistrationsToCsvRows({
        event: sampleEvent,
        registrations: [regV1, regV2],
      });

      expect(columns).toContain("Experience Level");
      expect(columns).toContain("Portfolio URL");

      expect(rows).toHaveLength(2);
      const rowV1 = rows[0];
      const rowV2 = rows[1];

      const expIndex = columns.indexOf("Experience Level");
      const portIndex = columns.indexOf("Portfolio URL");

      // Older version has Experience Level, but empty cell for Portfolio URL
      expect(rowV1[expIndex]).toBe("Intermediate");
      expect(rowV1[portIndex]).toBe("");

      // Newer version has both
      expect(rowV2[expIndex]).toBe("Advanced");
      expect(rowV2[portIndex]).toBe("https://github.com/newparticipant");
    });

    it("disambiguates fields with identical labels but different keys", () => {
      const conflictingReg: AdminRegistrationView = {
        id: "reg-conflict",
        registrationCode: "CCF-CONF-001",
        status: RegistrationStatus.ACTIVE,
        registrationType: RegistrationType.INDIVIDUAL,
        participantType: ParticipantType.CRESCENT,
        participantName: "Collision Test",
        collegeNormalized: null,
        identifierNormalized: "210011601007",
        formVersionId: "fv-1",
        formVersionNumber: 1,
        createdAt: "2026-09-01T10:00:00.000Z",
        updatedAt: "2026-09-01T10:00:00.000Z",
        responses: [
          {
            fieldId: "f-p1",
            fieldKey: "personal_phone",
            fieldLabel: "Phone Number",
            valueText: "9876543210",
            valueJson: null,
          },
          {
            fieldId: "f-p2",
            fieldKey: "emergency_phone",
            fieldLabel: "Phone Number",
            valueText: "9123456789",
            valueJson: null,
          },
        ],
        team: null,
        payment: null,
      };

      const { columns, rows } = transformRegistrationsToCsvRows({
        event: sampleEvent,
        registrations: [conflictingReg],
      });

      expect(columns).toContain("Phone Number (personal_phone)");
      expect(columns).toContain("Phone Number (emergency_phone)");

      const row = rows[0];
      const p1Idx = columns.indexOf("Phone Number (personal_phone)");
      const p2Idx = columns.indexOf("Phone Number (emergency_phone)");

      expect(row[p1Idx]).toBe("9876543210");
      expect(row[p2Idx]).toBe("9123456789");
    });
  });

  /* -------------------------------------------------------------------------- */
  /* 5. Deterministic Row Ordering (createdAt ascending)                        */
  /* -------------------------------------------------------------------------- */
  describe("5. Deterministic Ordering", () => {
    it("sorts registrations by createdAt ascending", () => {
      const regEarly: AdminRegistrationView = {
        id: "reg-early",
        registrationCode: "CCF-EARLY",
        status: RegistrationStatus.ACTIVE,
        registrationType: RegistrationType.INDIVIDUAL,
        participantType: ParticipantType.CRESCENT,
        participantName: "Early Bird",
        collegeNormalized: null,
        identifierNormalized: "210011601010",
        formVersionId: "fv-1",
        formVersionNumber: 1,
        createdAt: "2026-09-01T08:00:00.000Z",
        updatedAt: "2026-09-01T08:00:00.000Z",
        responses: [],
        team: null,
        payment: null,
      };

      const regLate: AdminRegistrationView = {
        id: "reg-late",
        registrationCode: "CCF-LATE",
        status: RegistrationStatus.ACTIVE,
        registrationType: RegistrationType.INDIVIDUAL,
        participantType: ParticipantType.CRESCENT,
        participantName: "Late Comer",
        collegeNormalized: null,
        identifierNormalized: "210011601011",
        formVersionId: "fv-1",
        formVersionNumber: 1,
        createdAt: "2026-09-09T18:00:00.000Z",
        updatedAt: "2026-09-09T18:00:00.000Z",
        responses: [],
        team: null,
        payment: null,
      };

      // Input in reverse order
      const { columns, rows } = transformRegistrationsToCsvRows({
        event: sampleEvent,
        registrations: [regLate, regEarly],
      });

      const codeIndex = columns.indexOf("Registration Code");
      expect(rows[0][codeIndex]).toBe("CCF-EARLY");
      expect(rows[1][codeIndex]).toBe("CCF-LATE");
    });
  });
});
