"use client";

import React, { useState, useRef } from "react";
import {
  Bold,
  Italic,
  Heading,
  List,
  ListOrdered,
  Link as LinkIcon,
  Eye,
  Edit3,
} from "lucide-react";
import { RichTextView } from "./rich-text-view";
import { Button } from "./button";

export interface RichTextEditorProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  disabled?: boolean;
}

export function RichTextEditor({
  id,
  value,
  onChange,
  placeholder,
  rows = 4,
  className = "",
  disabled = false,
}: RichTextEditorProps) {
  const [activeTab, setActiveTab] = useState<"write" | "preview">("write");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const applyFormatting = (prefix: string, suffix: string = "", defaultText: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.slice(start, end) || defaultText;

    const before = value.slice(0, start);
    const after = value.slice(end);

    const replacement = `${prefix}${selectedText}${suffix}`;
    const newValue = `${before}${replacement}${after}`;

    onChange(newValue);

    // Reposition cursor
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + selectedText.length
      );
    }, 0);
  };

  const handleLinePrefix = (linePrefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    // Find the start of the current line
    const beforeCursor = value.slice(0, start);
    const lastNewline = beforeCursor.lastIndexOf("\n");
    const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;

    const before = value.slice(0, lineStart);
    const after = value.slice(lineStart);

    const newValue = `${before}${linePrefix}${after}`;
    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + linePrefix.length, end + linePrefix.length);
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
      e.preventDefault();
      applyFormatting("**", "**", "bold text");
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "i") {
      e.preventDefault();
      applyFormatting("*", "*", "italic text");
    }
  };

  return (
    <div className={`rounded-md border border-border/70 bg-ccf-surface-sunken overflow-hidden ${className}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between border-b border-border/60 bg-ccf-surface px-2.5 py-1.5 gap-1.5">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled || activeTab === "preview"}
            onClick={() => applyFormatting("**", "**", "bold text")}
            className="h-7 w-7 p-0 text-ccf-muted hover:text-ccf-offwhite hover:bg-ccf-surface-elevated"
            title="Bold (Ctrl+B)"
            aria-label="Format Bold"
          >
            <Bold className="h-3.5 w-3.5" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled || activeTab === "preview"}
            onClick={() => applyFormatting("*", "*", "italic text")}
            className="h-7 w-7 p-0 text-ccf-muted hover:text-ccf-offwhite hover:bg-ccf-surface-elevated"
            title="Italic (Ctrl+I)"
            aria-label="Format Italic"
          >
            <Italic className="h-3.5 w-3.5" />
          </Button>

          <span className="h-4 w-[1px] bg-border/50 mx-1" aria-hidden="true" />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled || activeTab === "preview"}
            onClick={() => handleLinePrefix("### ")}
            className="h-7 w-7 p-0 text-ccf-muted hover:text-ccf-offwhite hover:bg-ccf-surface-elevated"
            title="Heading 3"
            aria-label="Insert Heading"
          >
            <Heading className="h-3.5 w-3.5" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled || activeTab === "preview"}
            onClick={() => handleLinePrefix("- ")}
            className="h-7 w-7 p-0 text-ccf-muted hover:text-ccf-offwhite hover:bg-ccf-surface-elevated"
            title="Bulleted List"
            aria-label="Insert Bullet List"
          >
            <List className="h-3.5 w-3.5" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled || activeTab === "preview"}
            onClick={() => handleLinePrefix("1. ")}
            className="h-7 w-7 p-0 text-ccf-muted hover:text-ccf-offwhite hover:bg-ccf-surface-elevated"
            title="Numbered List"
            aria-label="Insert Numbered List"
          >
            <ListOrdered className="h-3.5 w-3.5" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled || activeTab === "preview"}
            onClick={() => applyFormatting("[", "](https://example.com)", "link title")}
            className="h-7 w-7 p-0 text-ccf-muted hover:text-ccf-offwhite hover:bg-ccf-surface-elevated"
            title="Insert Link"
            aria-label="Insert Link"
          >
            <LinkIcon className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Tab switchers: Write vs Preview */}
        <div className="flex items-center gap-1 bg-ccf-surface-sunken p-0.5 rounded border border-border/40 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("write")}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              activeTab === "write"
                ? "bg-ccf-surface-elevated text-ccf-offwhite shadow-xs"
                : "text-ccf-muted hover:text-ccf-offwhite"
            }`}
          >
            <Edit3 className="h-3 w-3" />
            <span>Write</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("preview")}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              activeTab === "preview"
                ? "bg-ccf-surface-elevated text-ccf-offwhite shadow-xs"
                : "text-ccf-muted hover:text-ccf-offwhite"
            }`}
          >
            <Eye className="h-3 w-3" />
            <span>Preview</span>
          </button>
        </div>
      </div>

      {/* Editor Content Body */}
      {activeTab === "write" ? (
        <textarea
          ref={textareaRef}
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled}
          className="w-full bg-transparent p-3 text-xs md:text-sm text-ccf-offwhite placeholder:text-ccf-muted/60 focus:outline-none resize-y min-h-[90px]"
        />
      ) : (
        <div className="p-3 min-h-[90px] bg-ccf-surface/40 text-xs md:text-sm">
          {value.trim() ? (
            <RichTextView content={value} />
          ) : (
            <p className="text-xs text-ccf-muted italic">Nothing to preview</p>
          )}
        </div>
      )}
    </div>
  );
}
