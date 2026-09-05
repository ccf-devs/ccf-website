import React from "react";

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  children?: React.ReactNode;
  className?: string;
}

export function AdminPageHeader({
  title,
  description,
  eyebrow = "CCF Admin",
  children,
  className = "",
}: AdminPageHeaderProps) {
  return (
    <div
      className={`flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border/40 pb-6 ${className}`}
    >
      <div className="space-y-1 max-w-3xl">
        {eyebrow && (
          <span className="type-eyebrow text-ccf-gold text-xs font-semibold tracking-widest uppercase">
            {eyebrow}
          </span>
        )}
        <h1 className="type-h2 text-2xl md:text-3xl font-bold text-ccf-offwhite tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="type-body text-sm md:text-base text-ccf-muted leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {children && (
        <div className="flex items-center gap-3 shrink-0 self-start md:self-auto">
          {children}
        </div>
      )}
    </div>
  );
}
