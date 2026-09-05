"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Calendar,
  MapPin,
  Eye,
  Edit,
  AlertTriangle,
  Search,
  Users,
  CreditCard,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { AdminEmptyState } from "@/components/admin/admin-empty-state";
import { EventStatusBadge } from "./event-status-badge";
import {
  EventStatus,
  RegistrationMode,
  EventCapacityMode,
  PaymentMode,
} from "@prisma/client";

export interface EventListItem {
  id: string;
  slug: string;
  name: string;
  status: EventStatus | string;
  startsAt: Date | string | null;
  endsAt: Date | string | null;
  venue: string | null;
  capacity: number | null;
  capacityMode: EventCapacityMode | string;
  registrationMode: RegistrationMode | string;
  paymentMode: PaymentMode | string;
  createdAt: Date | string;
}

interface EventListTableProps {
  events?: EventListItem[];
  dbError?: string | null;
}

export function EventListTable({ events = [], dbError }: EventListTableProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Filter events client-side (Hooks called at top before any early returns)
  const filteredEvents = useMemo(() => {
    return events.filter((evt) => {
      const matchesStatus =
        selectedStatus === "ALL" || evt.status === selectedStatus;

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        evt.name.toLowerCase().includes(q) ||
        evt.slug.toLowerCase().includes(q) ||
        (evt.venue && evt.venue.toLowerCase().includes(q));

      return matchesStatus && matchesSearch;
    });
  }, [events, selectedStatus, searchQuery]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      ALL: events.length,
      [EventStatus.DRAFT]: 0,
      [EventStatus.PUBLISHED]: 0,
      [EventStatus.CLOSED]: 0,
      [EventStatus.ARCHIVED]: 0,
    };
    for (const e of events) {
      if (counts[e.status] !== undefined) {
        counts[e.status]++;
      }
    }
    return counts;
  }, [events]);

  // Correction 4: If database failed or is unavailable, render an explicit error state
  // and NEVER display the normal empty-events state.
  if (dbError) {
    return (
      <Card
        role="alert"
        aria-live="assertive"
        className="rounded-xl border border-red-500/30 bg-red-950/20 p-8 shadow-sm text-left space-y-4"
      >
        <div className="flex items-start gap-4">
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-2.5 text-red-400 shrink-0">
            <AlertTriangle className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="space-y-1.5 flex-1">
            <h3 className="text-base font-semibold text-red-200">
              Database Connection Unavailable
            </h3>
            <p className="text-sm text-red-300/80 leading-relaxed">
              Unable to reach the database server to query administrative events.
              This occurs in environments where local PostgreSQL is not running or{" "}
              <code className="rounded bg-red-950/60 px-1.5 py-0.5 font-mono text-xs text-red-200">
                DATABASE_URL
              </code>{" "}
              is unconfigured.
            </p>
            <div className="pt-2">
              <p className="text-xs text-ccf-muted font-mono">
                Error details: {dbError}
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-red-500/20 pt-4 flex items-center justify-between">
          <span className="text-xs text-ccf-muted">
            The database boundary is operating in disconnected mode.
          </span>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-red-500/30 text-red-200 hover:bg-red-500/10"
          >
            <Link href="/admin/events/new">Create Event (Form Preview)</Link>
          </Button>
        </div>
      </Card>
    );
  }

  // Database connected and successfully returned 0 rows -> Legitimate empty state
  if (events.length === 0) {
    return (
      <div className="space-y-4">
        <AdminEmptyState
          moduleTitle="Events"
          description="No events created yet. Create your first event to configure symposiums, workshops, or competitions."
          iconName="Calendar"
        />
        <div className="flex justify-center">
          <Button
            asChild
            className="bg-ccf-gold text-ccf-navy hover:bg-ccf-gold-light font-semibold shadow-sm text-xs h-9 px-4"
          >
            <Link href="/admin/events/new">
              <Plus className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
              <span>Create First Event</span>
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(["ALL", EventStatus.PUBLISHED, EventStatus.DRAFT, EventStatus.CLOSED, EventStatus.ARCHIVED] as const).map(
            (status) => {
              const label =
                status === "ALL"
                  ? "All"
                  : status.charAt(0) + status.slice(1).toLowerCase();
              const count = statusCounts[status] || 0;
              const isActive = selectedStatus === status;

              return (
                <button
                  key={status}
                  onClick={() => setSelectedStatus(status)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold tracking-tight transition-colors flex items-center gap-1.5 ${
                    isActive
                      ? "bg-ccf-gold text-ccf-navy"
                      : "bg-ccf-surface border border-border/60 text-ccf-muted hover:text-ccf-offwhite hover:border-border"
                  }`}
                  aria-pressed={isActive}
                >
                  <span>{label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                      isActive
                        ? "bg-ccf-navy/20 text-ccf-navy"
                        : "bg-ccf-surface-sunken text-ccf-muted"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            }
          )}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ccf-muted"
            aria-hidden="true"
          />
          <Input
            type="search"
            placeholder="Search by name, slug, venue..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 text-xs h-9"
          />
        </div>
      </div>

      {/* Table Card */}
      <Card className="overflow-hidden border border-border/60 bg-ccf-surface shadow-sm">
        {filteredEvents.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <p className="text-sm font-semibold text-ccf-offwhite">
              No matching events found
            </p>
            <p className="text-xs text-ccf-muted">
              Try adjusting your status filter or search query.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border/60 bg-ccf-surface-sunken text-ccf-muted font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th scope="col" className="py-3 px-4">
                    Event
                  </th>
                  <th scope="col" className="py-3 px-4">
                    Status
                  </th>
                  <th scope="col" className="py-3 px-4">
                    Date & Venue
                  </th>
                  <th scope="col" className="py-3 px-4">
                    Registration
                  </th>
                  <th scope="col" className="py-3 px-4">
                    Payment
                  </th>
                  <th scope="col" className="py-3 px-4 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredEvents.map((event) => {
                  const startsDate = event.startsAt
                    ? new Date(event.startsAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "No date set";

                  return (
                    <tr
                      key={event.id}
                      className="hover:bg-ccf-surface-elevated/50 transition-colors"
                    >
                      {/* Name & Slug */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-ccf-offwhite text-sm">
                          {event.name}
                        </div>
                        <div className="font-mono text-[11px] text-ccf-muted mt-0.5">
                          /{event.slug}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <EventStatusBadge status={event.status} />
                      </td>

                      {/* Date & Venue */}
                      <td className="py-3.5 px-4 text-ccf-muted">
                        <div className="inline-flex items-center gap-1.5 text-ccf-offwhite">
                          <Calendar className="h-3 w-3 text-ccf-gold" aria-hidden="true" />
                          <span>{startsDate}</span>
                        </div>
                        {event.venue && (
                          <div className="inline-flex items-center gap-1.5 text-[11px] text-ccf-muted mt-0.5 block truncate max-w-xs">
                            <MapPin className="h-3 w-3 text-ccf-muted" aria-hidden="true" />
                            <span>{event.venue}</span>
                          </div>
                        )}
                      </td>

                      {/* Registration & Capacity */}
                      <td className="py-3.5 px-4 text-ccf-muted">
                        <div className="font-medium text-ccf-offwhite">
                          {event.registrationMode}
                        </div>
                        <div className="inline-flex items-center gap-1 text-[11px] text-ccf-muted mt-0.5">
                          <Users className="h-3 w-3" aria-hidden="true" />
                          <span>
                            {event.capacityMode === EventCapacityMode.UNLIMITED
                              ? "Unlimited"
                              : `${event.capacity ?? "—"} (${event.capacityMode})`}
                          </span>
                        </div>
                      </td>

                      {/* Payment */}
                      <td className="py-3.5 px-4 text-ccf-muted whitespace-nowrap">
                        <div className="inline-flex items-center gap-1 text-ccf-offwhite font-medium">
                          <CreditCard className="h-3 w-3 text-ccf-gold" aria-hidden="true" />
                          <span>{event.paymentMode}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2.5 text-xs text-ccf-muted hover:text-ccf-offwhite"
                          >
                            <Link
                              href={`/admin/events/${event.id}`}
                              aria-label={`View ${event.name}`}
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                              <span>View</span>
                            </Link>
                          </Button>
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="h-8 px-2.5 text-xs border-border/80 text-ccf-gold hover:border-ccf-gold hover:bg-ccf-gold/10"
                          >
                            <Link
                              href={`/admin/events/${event.id}/edit`}
                              aria-label={`Edit ${event.name}`}
                            >
                              <Edit className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                              <span>Edit</span>
                            </Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
