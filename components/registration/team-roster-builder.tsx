"use client";

import React from "react";
import { ParticipantType } from "@prisma/client";
import { TeamMemberInput } from "@/lib/registrations/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  UserPlus,
  Trash2,
  Crown,
  School,
  Building,
  AlertCircle,
} from "lucide-react";

export interface PrimaryParticipantInfo {
  name: string;
  participantType: "CRESCENT" | "EXTERNAL";
  identifierNormalized: string;
  collegeNormalized?: string | null;
  phone?: string;
  academicDepartment?: string;
  year?: string;
}

export interface TeamRosterBuilderProps {
  primaryParticipant: PrimaryParticipantInfo;
  teamName: string;
  onTeamNameChange: (val: string) => void;
  teamNameRequired?: boolean;
  additionalMembers: TeamMemberInput[];
  onAdditionalMembersChange: (members: TeamMemberInput[]) => void;
  eligibilityCrescent: boolean;
  eligibilityExternal: boolean;
  minTeamSize?: number;
  maxTeamSize?: number;
  errors?: Record<string, string>;
  disabled?: boolean;
}

export function TeamRosterBuilder({
  primaryParticipant,
  teamName,
  onTeamNameChange,
  teamNameRequired = true,
  additionalMembers,
  onAdditionalMembersChange,
  eligibilityCrescent,
  eligibilityExternal,
  minTeamSize,
  maxTeamSize,
  errors = {},
  disabled = false,
}: TeamRosterBuilderProps) {
  const isMixedEvent = eligibilityCrescent && eligibilityExternal;
  const defaultNewCategory: ParticipantType = eligibilityCrescent
    ? ParticipantType.CRESCENT
    : ParticipantType.EXTERNAL;

  const totalMembersCount = 1 + additionalMembers.length;

  const handleAddMember = () => {
    if (typeof maxTeamSize === "number" && totalMembersCount >= maxTeamSize) {
      return;
    }
    const newMember: TeamMemberInput = {
      name: "",
      participantType: defaultNewCategory,
      identifierNormalized: "",
      collegeNormalized: defaultNewCategory === ParticipantType.EXTERNAL ? "" : undefined,
      phone: "",
      academicDepartment: "",
      year: "",
      position: "",
      isLeader: false,
    };
    onAdditionalMembersChange([...additionalMembers, newMember]);
  };

  const handleRemoveMember = (index: number) => {
    const next = additionalMembers.filter((_, idx) => idx !== index);
    onAdditionalMembersChange(next);
  };

  const handleMemberFieldChange = (
    index: number,
    field: keyof TeamMemberInput,
    value: any
  ) => {
    const next = [...additionalMembers];
    next[index] = {
      ...next[index],
      [field]: value,
    };
    // Clear collegeNormalized if switched to CRESCENT
    if (field === "participantType" && value === ParticipantType.CRESCENT) {
      next[index].collegeNormalized = undefined;
    }
    onAdditionalMembersChange(next);
  };

  const canAddMore =
    typeof maxTeamSize === "number" ? totalMembersCount < maxTeamSize : true;

  return (
    <div className="space-y-6 pt-6 border-t border-border/40">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-ccf-gold" />
            <h2 className="text-base sm:text-lg font-semibold text-ccf-offwhite">
              Team Configuration & Roster
            </h2>
          </div>
          <p className="text-xs text-ccf-muted">
            Configure your team name and add all participating students.
            {typeof minTeamSize === "number" && typeof maxTeamSize === "number" && (
              <span className="ml-1 text-ccf-gold font-mono">
                ({minTeamSize} to {maxTeamSize} members required)
              </span>
            )}
            {typeof minTeamSize === "number" && typeof maxTeamSize !== "number" && (
              <span className="ml-1 text-ccf-gold font-mono">
                (Min {minTeamSize} members required)
              </span>
            )}
          </p>
        </div>
        <Badge variant="outline" className="font-mono text-xs w-fit">
          {totalMembersCount} {totalMembersCount === 1 ? "Member" : "Members"} Total
        </Badge>
      </div>

      {/* Team Name Input */}
      <div className="space-y-2 bg-ccf-surface-elevated/40 p-4 rounded-lg border border-border/40">
        <div className="flex items-center justify-between">
          <Label htmlFor="team_name" className="text-xs font-semibold text-ccf-offwhite">
            Team Name {teamNameRequired && <span className="text-red-400">*</span>}
          </Label>
          {!teamNameRequired && (
            <span className="text-[10px] text-ccf-muted uppercase font-mono">Optional</span>
          )}
        </div>
        <Input
          id="team_name"
          placeholder="e.g. Crescent Quants"
          value={teamName}
          onChange={(e) => onTeamNameChange(e.target.value)}
          disabled={disabled}
          className="bg-ccf-surface border-border/60 text-sm font-medium"
        />
        {errors["team.name"] && (
          <p className="text-xs text-red-400 flex items-center gap-1 mt-1">
            <AlertCircle className="h-3.5 w-3.5" />
            {errors["team.name"]}
          </p>
        )}
      </div>

      {/* Roster Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono uppercase tracking-wider text-ccf-muted">
            Team Members Roster
          </span>
          {errors["team.members"] && (
            <span className="text-xs text-red-400 flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" />
              {errors["team.members"]}
            </span>
          )}
        </div>

        {/* Member 1: Primary Registrant / Team Leader */}
        <div className="p-4 rounded-lg bg-ccf-surface-elevated/60 border border-ccf-gold/40 relative overflow-hidden space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-ccf-gold/10 border border-ccf-gold/30 flex items-center justify-center text-ccf-gold">
                <Crown className="h-4 w-4" />
              </div>
              <div>
                <span className="text-xs font-semibold text-ccf-offwhite">
                  Member 1 (You)
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant="gold" className="text-[10px] px-1.5 py-0">
                    Team Leader
                  </Badge>
                  <span className="text-[11px] text-ccf-muted">
                    Primary Registrant
                  </span>
                </div>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px] font-mono">
              {primaryParticipant.participantType}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-ccf-navy/50 p-3 rounded border border-border/30">
            <div>
              <span className="text-ccf-muted text-[11px] block">Full Name</span>
              <span className="text-ccf-offwhite font-medium">
                {primaryParticipant.name || "— (Filled in above form)"}
              </span>
            </div>
            <div>
              <span className="text-ccf-muted text-[11px] block">
                {primaryParticipant.participantType === "CRESCENT"
                  ? "Crescent RRN"
                  : "Institution & Roll No"}
              </span>
              <span className="text-ccf-offwhite font-mono font-medium truncate block">
                {primaryParticipant.participantType === "CRESCENT"
                  ? primaryParticipant.identifierNormalized || "—"
                  : `${primaryParticipant.collegeNormalized || "College"} • ${
                      primaryParticipant.identifierNormalized || "—"
                    }`}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-ccf-muted/80 italic">
            Note: The primary registrant is automatically the team leader. Details are populated from the primary form above.
          </p>
        </div>

        {/* Additional Team Members */}
        {additionalMembers.map((member, index) => {
          const memberIndex = index + 2;
          const memberErrorKey = `team.members.${index}`;

          return (
            <div
              key={index}
              className="p-4 rounded-lg bg-ccf-surface-elevated/40 border border-border/60 space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-border/40">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-ccf-surface border border-border/60 flex items-center justify-center text-xs font-mono font-bold text-ccf-muted">
                    {memberIndex}
                  </div>
                  <span className="text-xs font-semibold text-ccf-offwhite">
                    Member {memberIndex}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveMember(index)}
                  disabled={disabled}
                  className="h-7 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Remove
                </Button>
              </div>

              {/* Category Selector (If Mixed Event) */}
              {isMixedEvent && (
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-ccf-muted font-mono uppercase">
                    Participant Category
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleMemberFieldChange(
                          index,
                          "participantType",
                          ParticipantType.CRESCENT
                        )
                      }
                      disabled={disabled}
                      className={`p-2 rounded border text-left text-xs transition-all flex items-center gap-2 ${
                        member.participantType === ParticipantType.CRESCENT
                          ? "bg-ccf-gold/10 border-ccf-gold text-ccf-offwhite font-medium"
                          : "bg-ccf-surface border-border/50 text-ccf-muted hover:text-ccf-offwhite"
                      }`}
                    >
                      <School className="h-4 w-4 shrink-0 text-ccf-gold" />
                      <span>Crescent Student</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleMemberFieldChange(
                          index,
                          "participantType",
                          ParticipantType.EXTERNAL
                        )
                      }
                      disabled={disabled}
                      className={`p-2 rounded border text-left text-xs transition-all flex items-center gap-2 ${
                        member.participantType === ParticipantType.EXTERNAL
                          ? "bg-ccf-gold/10 border-ccf-gold text-ccf-offwhite font-medium"
                          : "bg-ccf-surface border-border/50 text-ccf-muted hover:text-ccf-offwhite"
                      }`}
                    >
                      <Building className="h-4 w-4 shrink-0 text-ccf-gold" />
                      <span>External College</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Member Form Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Member Name */}
                <div className="space-y-1">
                  <Label
                    htmlFor={`member_${index}_name`}
                    className="text-xs text-ccf-offwhite"
                  >
                    Full Name <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id={`member_${index}_name`}
                    placeholder="e.g. Jane Doe"
                    value={member.name}
                    onChange={(e) =>
                      handleMemberFieldChange(index, "name", e.target.value)
                    }
                    disabled={disabled}
                    className="bg-ccf-surface border-border/60 text-xs h-9"
                  />
                  {errors[`${memberErrorKey}.name`] && (
                    <p className="text-[11px] text-red-400">
                      {errors[`${memberErrorKey}.name`]}
                    </p>
                  )}
                </div>

                {/* Member Identity: Crescent RRN or External Roll */}
                {member.participantType === ParticipantType.CRESCENT ? (
                  <div className="space-y-1">
                    <Label
                      htmlFor={`member_${index}_rrn`}
                      className="text-xs text-ccf-offwhite"
                    >
                      Crescent RRN <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      id={`member_${index}_rrn`}
                      placeholder="e.g. 210071601002"
                      value={member.identifierNormalized || ""}
                      onChange={(e) =>
                        handleMemberFieldChange(
                          index,
                          "identifierNormalized",
                          e.target.value
                        )
                      }
                      disabled={disabled}
                      maxLength={12}
                      className="bg-ccf-surface border-border/60 text-xs font-mono h-9"
                    />
                    {errors[`${memberErrorKey}.identifierNormalized`] && (
                      <p className="text-[11px] text-red-400">
                        {errors[`${memberErrorKey}.identifierNormalized`]}
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="space-y-1">
                      <Label
                        htmlFor={`member_${index}_college`}
                        className="text-xs text-ccf-offwhite"
                      >
                        College / Institution <span className="text-red-400">*</span>
                      </Label>
                      <Input
                        id={`member_${index}_college`}
                        placeholder="e.g. Loyola College"
                        value={member.collegeNormalized || ""}
                        onChange={(e) =>
                          handleMemberFieldChange(
                            index,
                            "collegeNormalized",
                            e.target.value
                          )
                        }
                        disabled={disabled}
                        className="bg-ccf-surface border-border/60 text-xs h-9"
                      />
                      {errors[`${memberErrorKey}.collegeNormalized`] && (
                        <p className="text-[11px] text-red-400">
                          {errors[`${memberErrorKey}.collegeNormalized`]}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <Label
                        htmlFor={`member_${index}_roll`}
                        className="text-xs text-ccf-offwhite"
                      >
                        Roll / Register Number <span className="text-red-400">*</span>
                      </Label>
                      <Input
                        id={`member_${index}_roll`}
                        placeholder="e.g. 21CS045"
                        value={member.identifierNormalized || ""}
                        onChange={(e) =>
                          handleMemberFieldChange(
                            index,
                            "identifierNormalized",
                            e.target.value
                          )
                        }
                        disabled={disabled}
                        className="bg-ccf-surface border-border/60 text-xs font-mono h-9"
                      />
                      {errors[`${memberErrorKey}.identifierNormalized`] && (
                        <p className="text-[11px] text-red-400">
                          {errors[`${memberErrorKey}.identifierNormalized`]}
                        </p>
                      )}
                    </div>
                  </>
                )}

                {/* Optional Phone */}
                <div className="space-y-1">
                  <Label
                    htmlFor={`member_${index}_phone`}
                    className="text-xs text-ccf-muted"
                  >
                    Phone Number (Optional)
                  </Label>
                  <Input
                    id={`member_${index}_phone`}
                    placeholder="e.g. 9876543210"
                    value={member.phone || ""}
                    onChange={(e) =>
                      handleMemberFieldChange(index, "phone", e.target.value)
                    }
                    disabled={disabled}
                    className="bg-ccf-surface border-border/60 text-xs font-mono h-9"
                  />
                </div>

                {/* Optional Department */}
                <div className="space-y-1">
                  <Label
                    htmlFor={`member_${index}_dept`}
                    className="text-xs text-ccf-muted"
                  >
                    Department (Optional)
                  </Label>
                  <Input
                    id={`member_${index}_dept`}
                    placeholder="e.g. Computer Science"
                    value={member.academicDepartment || ""}
                    onChange={(e) =>
                      handleMemberFieldChange(
                        index,
                        "academicDepartment",
                        e.target.value
                      )
                    }
                    disabled={disabled}
                    className="bg-ccf-surface border-border/60 text-xs h-9"
                  />
                </div>
              </div>
            </div>
          );
        })}

        {/* Add Member CTA */}
        {canAddMore ? (
          <Button
            type="button"
            variant="outline"
            onClick={handleAddMember}
            disabled={disabled}
            className="w-full border-dashed border-border/80 hover:border-ccf-gold text-ccf-offwhite hover:bg-ccf-surface-elevated text-xs h-10 gap-2"
          >
            <UserPlus className="h-4 w-4 text-ccf-gold" />
            Add Team Member
          </Button>
        ) : (
          <p className="text-xs text-ccf-muted text-center italic py-2">
            Maximum team size of {maxTeamSize} members reached.
          </p>
        )}
      </div>
    </div>
  );
}
