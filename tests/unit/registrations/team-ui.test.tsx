import React from "react";
import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RegistrationForm } from "@/components/registration/registration-form";
import { TeamRosterBuilder } from "@/components/registration/team-roster-builder";
import { RegistrationSuccess } from "@/components/registration/registration-success";
import { TeamRosterDialog } from "@/components/admin/registrations/team-roster-dialog";
import { FieldType, FieldScope, EventFieldDomain } from "@/lib/forms/types";
import {
  EventStatus,
  RegistrationMode,
  RegistrationMethod,
  EventCapacityMode,
  PaymentMode,
  ParticipantType,
  RegistrationType,
} from "@prisma/client";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

describe("Phase 9: Team Registration UI Components", () => {
  const baseEvent = {
    id: "evt-uuid-1",
    slug: "magnora-26",
    name: "Magnora '26",
    status: EventStatus.PUBLISHED,
    registrationMode: RegistrationMode.INTERNAL,
    registrationMethod: RegistrationMethod.BUILT_IN,
    eligibilityCrescent: true,
    eligibilityExternal: true,
    capacity: 100,
    capacityMode: EventCapacityMode.PARTICIPANTS,
    paymentMode: PaymentMode.FREE,
    registrationOpensAt: new Date("2026-01-01"),
    registrationClosesAt: new Date("2026-12-31"),
  };

  const sampleFields: EventFieldDomain[] = [
    {
      id: "f1",
      key: "participant_type",
      label: "Participant Category",
      type: FieldType.RADIO,
      fieldScope: FieldScope.PARTICIPANT,
      required: true,
      displayOrder: 1,
      config: {
        options: ["CRESCENT", "EXTERNAL"],
        isSystem: true,
        systemKey: "participant_type",
      },
    },
    {
      id: "f2",
      key: "participant_name",
      label: "Full Name",
      type: FieldType.TEXT,
      fieldScope: FieldScope.PARTICIPANT,
      required: true,
      displayOrder: 2,
      config: {
        isSystem: true,
        systemKey: "name",
      },
    },
    {
      id: "f3",
      key: "crescent_rrn",
      label: "Crescent RRN",
      type: FieldType.TEXT,
      fieldScope: FieldScope.PARTICIPANT,
      required: true,
      displayOrder: 3,
      config: {
        isSystem: true,
        systemKey: "crescent_rrn",
      },
      conditionalLogic: {
        dependsOn: "participant_type",
        operator: "equals",
        value: "CRESCENT",
      },
    },
  ];

  describe("TeamRosterBuilder", () => {
    it("renders Member 1 as Primary Registrant / Team Leader locked from removal", () => {
      const html = renderToStaticMarkup(
        <TeamRosterBuilder
          teamName="Apex Quants"
          onTeamNameChange={() => {}}
          primaryParticipant={{
            name: "Fatima Khan",
            participantType: "CRESCENT",
            identifierNormalized: "210071601005",
          }}
          additionalMembers={[]}
          onAdditionalMembersChange={() => {}}
          eligibilityCrescent={true}
          eligibilityExternal={true}
          errors={{}}
        />
      );

      // Primary registrant info
      expect(html).toContain("Fatima Khan");
      expect(html).toContain("Team Leader");
      expect(html).toContain("210071601005");
      expect(html).toContain("Primary Registrant");
      expect(html).not.toContain("Remove Member 1");
    });

    it("renders additional team members with Crescent and External identity controls", () => {
      const html = renderToStaticMarkup(
        <TeamRosterBuilder
          teamName="Alpha Capital"
          onTeamNameChange={() => {}}
          primaryParticipant={{
            name: "Leader Name",
            participantType: "CRESCENT",
            identifierNormalized: "210071601001",
          }}
          additionalMembers={[
            {
              name: "Crescent Member",
              participantType: "CRESCENT",
              identifierNormalized: "210071601002",
              isLeader: false,
            },
            {
              name: "External Member",
              participantType: "EXTERNAL",
              collegeNormalized: "Loyola College",
              identifierNormalized: "LC-2024-88",
              isLeader: false,
            },
          ]}
          onAdditionalMembersChange={() => {}}
          eligibilityCrescent={true}
          eligibilityExternal={true}
          errors={{}}
        />
      );

      // Verify Member 2 and Member 3
      expect(html).toContain("Member 2");
      expect(html).toContain("Member 3");
      expect(html).toContain("Crescent Member");
      expect(html).toContain("External Member");
      expect(html).toContain("Loyola College");
      expect(html).toContain("LC-2024-88");
      expect(html).toContain("Add Team Member");
    });

    it("respects maxTeamSize and disables or hides Add Member when full", () => {
      const html = renderToStaticMarkup(
        <TeamRosterBuilder
          teamName="Full Squad"
          onTeamNameChange={() => {}}
          primaryParticipant={{
            name: "Leader Name",
            participantType: "CRESCENT",
            identifierNormalized: "210071601001",
          }}
          additionalMembers={[
            {
              name: "Member 2",
              participantType: "CRESCENT",
              identifierNormalized: "210071601002",
              isLeader: false,
            },
          ]}
          onAdditionalMembersChange={() => {}}
          eligibilityCrescent={true}
          eligibilityExternal={true}
          maxTeamSize={2}
          errors={{}}
        />
      );

      // With leader + 1 additional member = 2 total, maxTeamSize of 2 is reached
      expect(html).toContain("Maximum team size of 2 members reached.");
    });
  });

  describe("RegistrationForm", () => {
    it("renders mode selector when allowModeChoice is true", () => {
      const html = renderToStaticMarkup(
        <RegistrationForm
          event={baseEvent}
          fields={sampleFields}
          teamConfig={{
            isTeamRegistration: false,
            allowModeChoice: true,
          }}
        />
      );

      expect(html).toContain("Registration Mode");
      expect(html).toContain("Individual");
      expect(html).toContain("Team");
    });

    it("defaults to TEAM registration and renders TeamRosterBuilder when isTeamRegistration is true", () => {
      const html = renderToStaticMarkup(
        <RegistrationForm
          event={baseEvent}
          fields={sampleFields}
          teamConfig={{
            isTeamRegistration: true,
            allowModeChoice: false,
            minTeamSize: 2,
            maxTeamSize: 4,
          }}
        />
      );

      expect(html).toContain("Team Configuration &amp; Roster");
      expect(html).toContain("Team Name");
      expect(html).toContain("Team Leader");
      expect(html).toContain("Add Team Member");
    });
  });

  describe("RegistrationSuccess with Team Roster", () => {
    it("renders verified team card with leader badge and roster details", () => {
      const confirmation = {
        id: "reg-uuid-1",
        registrationCode: "CCF-MAG-2026-T01",
        registrationType: RegistrationType.TEAM,
        participantType: ParticipantType.CRESCENT,
        participantName: "Zoya Patel",
        event: {
          id: "evt-uuid-1",
          slug: "magnora-26",
          name: "Magnora '26",
        },
        createdAt: new Date().toISOString(),
        status: "ACTIVE" as const,
        team: {
          id: "team-uuid-1",
          name: "Quant Alpha",
          members: [
            {
              id: "m-1",
              name: "Zoya Patel",
              isLeader: true,
              participantType: ParticipantType.CRESCENT,
              crescentRrn: "210071601009",
            },
            {
              id: "m-2",
              name: "Rohan Varma",
              isLeader: false,
              participantType: ParticipantType.EXTERNAL,
              collegeName: "IIT Madras",
              externalRollNumber: "EE21B001",
            },
          ],
        },
      };

      const html = renderToStaticMarkup(
        <RegistrationSuccess confirmation={confirmation as any} />
      );

      expect(html).toContain("REGISTRATION SUCCESSFUL");
      expect(html).toContain("CCF-MAG-2026-T01");
      expect(html).toContain("Team Registration");
      expect(html).toContain("Quant Alpha");
      expect(html).toContain("2 Members");
      expect(html).toContain("Zoya Patel");
      expect(html).toContain("Leader");
      expect(html).toContain("CRESCENT");
      expect(html).toContain("Rohan Varma");
      expect(html).toContain("EXTERNAL");
    });
  });

  describe("Admin TeamRosterDialog", () => {
    it("renders admin modal with complete member breakdown and badges", () => {
      const mockTeam = {
        id: "team-uuid-1",
        name: "Valuation Titans",
        createdAt: new Date(),
        members: [
          {
            id: "m-1",
            name: "Adil Hussain",
            isLeader: true,
            participantType: "CRESCENT",
            identifierNormalized: "210071601099",
            collegeNormalized: null,
            phone: "9876543210",
            academicDepartment: "Computer Science",
            year: "4",
          },
          {
            id: "m-2",
            name: "Maya Nair",
            isLeader: false,
            participantType: "EXTERNAL",
            identifierNormalized: "AU-2023-CS-04",
            collegeNormalized: "Anna University",
            phone: "9123456780",
            academicDepartment: "Finance",
            year: "3",
          },
        ],
      };

      const html = renderToStaticMarkup(
        <TeamRosterDialog
          isOpen={true}
          onClose={() => {}}
          team={mockTeam}
          eventName="Magnora '26"
          registrationCode="CCF-VAL-001"
        />
      );

      expect(html).toContain("Team Roster");
      expect(html).toContain("Valuation Titans");
      expect(html).toContain("CCF-VAL-001");
      expect(html).toContain("Adil Hussain");
      expect(html).toContain("Leader");
      expect(html).toContain("Maya Nair");
      expect(html).toContain("Anna University");
      expect(html).toContain("AU-2023-CS-04");
    });
  });
});
