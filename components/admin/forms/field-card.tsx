"use client";

import React from "react";
import { EventFieldDomain, FormVersionStatus } from "@/lib/forms/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronUp,
  ChevronDown,
  Edit2,
  Trash2,
  GitBranch,
  ShieldAlert,
  Asterisk,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FieldCardProps {
  field: EventFieldDomain;
  index: number;
  totalFields: number;
  status: FormVersionStatus;
  onEdit: (field: EventFieldDomain) => void;
  onDelete: (fieldId: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
}

export function FieldCard({
  field,
  index,
  totalFields,
  status,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}: FieldCardProps) {
  const isImmutable = status !== FormVersionStatus.DRAFT;

  return (
    <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-ccf-surface p-4 shadow-xs transition-colors hover:border-border">
      {/* Reorder Buttons */}
      {!isImmutable && (
        <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={index === 0}
            onClick={() => onMoveUp(index)}
            className="h-7 w-7 p-0 text-ccf-muted hover:text-ccf-offwhite hover:bg-ccf-surface-elevated"
            aria-label={`Move ${field.label} up`}
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <span className="text-[11px] font-mono font-medium text-ccf-muted">
            {index + 1}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={index === totalFields - 1}
            onClick={() => onMoveDown(index)}
            className="h-7 w-7 p-0 text-ccf-muted hover:text-ccf-offwhite hover:bg-ccf-surface-elevated"
            aria-label={`Move ${field.label} down`}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Field Content & Metadata */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-sm text-ccf-offwhite truncate">
            {field.label}
          </span>

          {field.required && (
            <Badge variant="outline" className="border-red-500/40 text-red-400 text-[10px] px-1.5 py-0">
              Required
            </Badge>
          )}

          <Badge variant="secondary" className="text-[10px] uppercase font-mono px-1.5 py-0">
            {field.type}
          </Badge>

          <Badge variant="outline" className="border-border/60 text-ccf-muted text-[10px] px-1.5 py-0">
            {field.scope}
          </Badge>

          {field.config.isSystem && (
            <Badge variant="outline" className="border-ccf-gold/40 text-ccf-gold text-[10px] px-1.5 py-0">
              System Field
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs text-ccf-muted">
          <code className="font-mono text-ccf-muted bg-ccf-surface-sunken px-1.5 py-0.5 rounded border border-border/40 text-[11px]">
            {field.key}
          </code>

          {field.config.options && field.config.options.length > 0 && (
            <span>
              {field.config.options.length} options:{" "}
              <span className="text-ccf-offwhite/80">
                {field.config.options.slice(0, 3).join(", ")}
                {field.config.options.length > 3 ? "..." : ""}
              </span>
            </span>
          )}
        </div>

        {/* Conditional Logic Indicator */}
        {field.conditionalLogic && (
          <div className="flex items-center gap-1.5 text-xs text-amber-400/90 bg-amber-950/20 border border-amber-500/20 rounded px-2 py-1 max-w-fit">
            <GitBranch className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>
              Visible when <code className="font-mono font-semibold">{field.conditionalLogic.dependsOn}</code>{" "}
              {field.conditionalLogic.operator}{" "}
              <strong className="text-amber-300">
                &ldquo;{JSON.stringify(field.conditionalLogic.value)}&rdquo;
              </strong>
            </span>
          </div>
        )}
      </div>

      {/* Field Actions */}
      {!isImmutable && (
        <div className="flex items-center gap-1 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onEdit(field)}
            className="h-8 w-8 p-0 text-ccf-muted hover:text-ccf-offwhite hover:bg-ccf-surface-elevated"
            aria-label={`Edit ${field.label}`}
          >
            <Edit2 className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onDelete(field.id)}
            className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-950/30"
            aria-label={`Delete ${field.label}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
