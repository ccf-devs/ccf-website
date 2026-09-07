"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Trash2,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Clock,
  Shield,
  CreditCard,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TeamRosterDialog, TeamDetail } from "./team-roster-dialog";

export interface AdminRegistrationItem {
  id: string;
  eventId: string;
  eventName: string;
  eventSlug: string;
  registrationCode: string;
  status: string;
  registrationType: string;
  participantType: string;
  participantName: string;
  collegeNormalized: string | null;
  identifierNormalized: string | null;
  createdAt: string;
  paymentStatus?: string | null;
  paymentAmount?: string | null;
  team?: TeamDetail | null;
}

interface RegistrationListTableProps {
  registrations: AdminRegistrationItem[];
  events: Array<{ id: string; name: string }>;
}

export function RegistrationListTable({
  registrations: initialRegistrations,
  events,
}: RegistrationListTableProps) {
  const [registrations, setRegistrations] = useState<AdminRegistrationItem[]>(
    initialRegistrations
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEventId, setSelectedEventId] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedFormat, setSelectedFormat] = useState<string>("ALL");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedRosterRegistration, setSelectedRosterRegistration] =
    useState<AdminRegistrationItem | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const filteredRegistrations = useMemo(() => {
    return registrations.filter((reg) => {
      if (selectedEventId !== "ALL" && reg.eventId !== selectedEventId) {
        return false;
      }
      if (selectedCategory !== "ALL" && reg.participantType !== selectedCategory) {
        return false;
      }
      if (selectedFormat !== "ALL" && reg.registrationType !== selectedFormat) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = reg.participantName.toLowerCase().includes(q);
        const matchesCode = reg.registrationCode.toLowerCase().includes(q);
        const matchesIdent = reg.identifierNormalized
          ? reg.identifierNormalized.toLowerCase().includes(q)
          : false;
        const matchesCollege = reg.collegeNormalized
          ? reg.collegeNormalized.toLowerCase().includes(q)
          : false;
        const matchesTeamName = reg.team?.name
          ? reg.team.name.toLowerCase().includes(q)
          : false;
        return (
          matchesName ||
          matchesCode ||
          matchesIdent ||
          matchesCollege ||
          matchesTeamName
        );
      }
      return true;
    });
  }, [registrations, selectedEventId, selectedCategory, selectedFormat, searchQuery]);

  const handleDelete = async (registration: AdminRegistrationItem) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete the registration for "${registration.participantName}" (${registration.registrationCode})?\n\nThis will release their identity lock and free their spot in the event.`
    );
    if (!confirmed) {
      return;
    }

    setDeletingId(registration.id);
    setFeedback(null);

    try {
      const res = await fetch(
        `/api/admin/events/${registration.eventId}/registrations/${registration.id}`,
        {
          method: "DELETE",
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setFeedback({
          type: "error",
          message: data.error || "Failed to delete registration.",
        });
        return;
      }

      setRegistrations((prev) => prev.filter((r) => r.id !== registration.id));
      setFeedback({
        type: "success",
        message: data.message || "Registration deleted and participation lock released.",
      });
    } catch (err) {
      console.error("Delete failed:", err);
      setFeedback({
        type: "error",
        message: "A network error occurred while deleting the registration.",
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Feedback Banner */}
      {feedback && (
        <div
          role="alert"
          className={`p-4 rounded-lg flex items-center gap-3 text-sm ${
            feedback.type === "success"
              ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
              : "bg-red-500/10 border border-red-500/30 text-red-400"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ccf-muted" />
          <Input
            placeholder="Search name, code, RRN, or college..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-ccf-surface border-border/60 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Event Filter */}
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            aria-label="Filter by Event"
            className="h-9 px-3 rounded-md border border-border/60 bg-ccf-surface text-ccf-offwhite text-xs focus:outline-none focus:ring-1 focus:ring-ccf-gold"
          >
            <option value="ALL">All Events ({registrations.length})</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name}
              </option>
            ))}
          </select>

          {/* Format Filter */}
          <select
            value={selectedFormat}
            onChange={(e) => setSelectedFormat(e.target.value)}
            aria-label="Filter by Registration Format"
            className="h-9 px-3 rounded-md border border-border/60 bg-ccf-surface text-ccf-offwhite text-xs focus:outline-none focus:ring-1 focus:ring-ccf-gold"
          >
            <option value="ALL">All Formats</option>
            <option value="INDIVIDUAL">Individual</option>
            <option value="TEAM">Team</option>
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            aria-label="Filter by Participant Category"
            className="h-9 px-3 rounded-md border border-border/60 bg-ccf-surface text-ccf-offwhite text-xs focus:outline-none focus:ring-1 focus:ring-ccf-gold"
          >
            <option value="ALL">All Categories</option>
            <option value="CRESCENT">Crescent Student</option>
            <option value="EXTERNAL">External</option>
          </select>
        </div>
      </div>

      {/* Registrations Table */}
      <Card className="bg-ccf-surface border-border/60 overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-ccf-surface-elevated border-b border-border/60 text-ccf-muted font-mono uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Code / Participant</th>
                <th className="py-3 px-4">Format / Category</th>
                <th className="py-3 px-4">Event</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredRegistrations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-ccf-muted">
                    No registrations found matching the selected filters.
                  </td>
                </tr>
              ) : (
                filteredRegistrations.map((reg) => (
                  <tr key={reg.id} className="hover:bg-ccf-surface-elevated/40 transition-colors">
                    <td className="py-3 px-4 space-y-0.5">
                      <div className="font-mono font-bold text-ccf-gold">
                        {reg.registrationCode}
                      </div>
                      <div className="font-medium text-ccf-offwhite">
                        {reg.participantName}
                      </div>
                      {reg.registrationType === "TEAM" && reg.team?.name && (
                        <div className="text-[11px] text-ccf-gold/90 font-medium truncate max-w-[180px]">
                          Team: {reg.team.name}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {reg.registrationType === "TEAM" ? (
                          <Badge variant="gold" className="text-[9px] uppercase font-mono px-1.5 py-0">
                            Team ({reg.team?.members.length ?? 1})
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[9px] uppercase font-mono text-ccf-muted px-1.5 py-0">
                            Individual
                          </Badge>
                        )}
                        <Badge
                          variant={reg.participantType === "CRESCENT" ? "secondary" : "outline"}
                          className="text-[9px] uppercase font-mono px-1.5 py-0"
                        >
                          {reg.participantType}
                        </Badge>
                      </div>
                      <div className="text-ccf-muted text-[11px] font-mono">
                        {reg.identifierNormalized || "—"}
                      </div>
                      {reg.collegeNormalized && (
                        <div className="text-[10px] text-ccf-muted/80 truncate max-w-[180px]">
                          {reg.collegeNormalized}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span className="text-ccf-offwhite font-medium block truncate max-w-[160px]">
                        {reg.eventName}
                      </span>
                      <span className="text-[10px] text-ccf-muted font-mono">
                        {reg.eventSlug}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <Badge
                        variant={reg.status === "ACTIVE" ? "success" : "destructive"}
                        dot
                        className="text-[10px] font-mono"
                      >
                        {reg.status}
                      </Badge>
                    </td>

                    <td className="py-3 px-4">
                      {reg.paymentStatus ? (
                        <Badge
                          variant={reg.paymentStatus === "VERIFIED" ? "success" : "warning"}
                          className="text-[10px] font-mono"
                        >
                          {reg.paymentStatus}
                          {reg.paymentAmount ? ` (₹${reg.paymentAmount})` : ""}
                        </Badge>
                      ) : (
                        <span className="text-ccf-muted text-[11px]">Free</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-ccf-muted font-mono text-[11px]">
                      {new Date(reg.createdAt).toLocaleDateString("en-IN", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {reg.registrationType === "TEAM" && reg.team && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedRosterRegistration(reg)}
                          className="h-7 px-2 text-xs text-ccf-gold hover:text-ccf-gold-light hover:bg-ccf-gold/10 mr-1"
                          title="View Team Roster"
                        >
                          <Users className="h-3.5 w-3.5 mr-1" />
                          Roster
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={deletingId === reg.id}
                        onClick={() => handleDelete(reg)}
                        className="h-7 w-7 p-0 text-ccf-muted hover:text-red-400 hover:bg-red-500/10"
                        title="Delete registration and release lock"
                      >
                        {deletingId === reg.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-red-400" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Team Roster Inspection Dialog */}
      <TeamRosterDialog
        isOpen={Boolean(selectedRosterRegistration)}
        onClose={() => setSelectedRosterRegistration(null)}
        team={selectedRosterRegistration?.team || null}
        eventName={selectedRosterRegistration?.eventName || ""}
        registrationCode={selectedRosterRegistration?.registrationCode || ""}
      />
    </div>
  );
}
