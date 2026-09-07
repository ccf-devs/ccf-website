"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  Crown,
  X,
  School,
  Building,
  Phone,
  GraduationCap,
} from "lucide-react";

export interface TeamMemberDetail {
  id: string;
  name: string;
  participantType: string;
  identifierNormalized: string | null;
  collegeNormalized: string | null;
  phone: string | null;
  academicDepartment: string | null;
  year: string | null;
  position?: string | null;
  isLeader: boolean;
}

export interface TeamDetail {
  id: string;
  name: string | null;
  members: TeamMemberDetail[];
}

export interface TeamRosterDialogProps {
  isOpen: boolean;
  onClose: () => void;
  team: TeamDetail | null;
  eventName: string;
  registrationCode: string;
}

export function TeamRosterDialog({
  isOpen,
  onClose,
  team,
  eventName,
  registrationCode,
}: TeamRosterDialogProps) {
  if (!isOpen || !team) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="roster-dialog-title"
    >
      <div className="bg-ccf-surface border border-border/80 rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-border/40 flex items-start justify-between gap-4 bg-ccf-surface-elevated/40">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-mono tracking-wider text-ccf-gold">
                Team Roster
              </span>
              <span className="text-border/60">•</span>
              <span className="font-mono text-xs text-ccf-muted">
                {registrationCode}
              </span>
            </div>
            <h2
              id="roster-dialog-title"
              className="text-xl font-bold text-ccf-offwhite flex items-center gap-2"
            >
              <Users className="h-5 w-5 text-ccf-gold shrink-0" />
              <span>{team.name || "Unnamed Team"}</span>
            </h2>
            <p className="text-xs text-ccf-muted">
              {eventName} • {team.members.length}{" "}
              {team.members.length === 1 ? "student" : "students"} registered
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 rounded-md text-ccf-muted hover:text-ccf-offwhite"
            aria-label="Close roster view"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Modal Body: Team Roster Table */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          <div className="rounded-lg border border-border/50 overflow-hidden bg-ccf-navy/30">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/50 bg-ccf-surface-elevated/80 font-mono uppercase text-ccf-muted text-[11px]">
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Member Name</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Identifier</th>
                  <th className="py-2.5 px-3">Department & Year</th>
                  <th className="py-2.5 px-3">Contact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {team.members.map((member) => (
                  <tr
                    key={member.id}
                    className={`hover:bg-ccf-surface-elevated/40 transition-colors ${
                      member.isLeader ? "bg-ccf-gold/5" : ""
                    }`}
                  >
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {member.isLeader ? (
                        <Badge
                          variant="gold"
                          className="text-[10px] flex items-center gap-1 w-fit"
                        >
                          <Crown className="h-3 w-3" />
                          Leader
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-[10px] text-ccf-muted border-border/60"
                        >
                          Member
                        </Badge>
                      )}
                    </td>

                    <td className="py-2.5 px-3 font-medium text-ccf-offwhite">
                      {member.name}
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {member.participantType === "CRESCENT" ? (
                          <School className="h-3.5 w-3.5 text-ccf-gold" />
                        ) : (
                          <Building className="h-3.5 w-3.5 text-blue-400" />
                        )}
                        <span className="font-mono text-[11px] text-ccf-muted">
                          {member.participantType}
                        </span>
                      </div>
                    </td>

                    <td className="py-2.5 px-3 space-y-0.5">
                      <span className="font-mono text-ccf-gold block font-semibold">
                        {member.identifierNormalized ||
                          (member as any).crescentRrn ||
                          (member as any).externalRollNumber ||
                          "—"}
                      </span>
                      {(member.collegeNormalized || (member as any).collegeName) && (
                        <span className="text-[10px] text-ccf-muted truncate block max-w-[150px]">
                          {member.collegeNormalized || (member as any).collegeName}
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-ccf-muted">
                      {member.academicDepartment || member.year ? (
                        <div className="space-y-0.5">
                          {member.academicDepartment && (
                            <span className="block truncate max-w-[140px] text-ccf-offwhite">
                              {member.academicDepartment}
                            </span>
                          )}
                          {member.year && (
                            <span className="text-[10px] text-ccf-muted block">
                              Year {member.year}
                            </span>
                          )}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-ccf-muted font-mono whitespace-nowrap">
                      {member.phone ? (
                        <span className="flex items-center gap-1 text-[11px]">
                          <Phone className="h-3 w-3 text-ccf-muted" />
                          {member.phone}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-border/40 bg-ccf-surface-elevated/40 flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
