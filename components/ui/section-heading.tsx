import * as React from "react";
import { cn } from "@/lib/utils";
import { Separator } from "./separator";

export interface SectionHeadingProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: "left" | "center" | "right";
  withRule?: boolean;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  withRule = false,
  className,
  ...props
}: SectionHeadingProps) {
  const isCenter = align === "center";
  const isRight = align === "right";

  return (
    <div
      className={cn(
        "space-y-3",
        isCenter && "text-center items-center flex flex-col",
        isRight && "text-right items-end flex flex-col",
        className
      )}
      {...props}
    >
      {eyebrow && (
        <span className="type-metadata text-ccf-gold tracking-widest">
          {eyebrow}
        </span>
      )}

      <h2 className="type-h2 text-ccf-offwhite">
        {title}
      </h2>

      {description && (
        <p
          className={cn(
            "type-body text-ccf-muted max-w-2xl leading-relaxed",
            isCenter && "mx-auto"
          )}
        >
          {description}
        </p>
      )}

      {withRule && (
        <div className={cn("pt-2 w-full", isCenter ? "max-w-xs" : "max-w-sm")}>
          <Separator variant="gold" />
        </div>
      )}
    </div>
  );
}
