import * as React from "react";
import { cn } from "@/lib/utils";

export interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical";
  decorative?: boolean;
  variant?: "default" | "gold" | "subtle";
}

const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
  (
    {
      className,
      orientation = "horizontal",
      decorative = true,
      variant = "default",
      ...props
    },
    ref
  ) => {
    const isHorizontal = orientation === "horizontal";

    return (
      <div
        ref={ref}
        role={decorative ? "none" : "separator"}
        aria-orientation={decorative ? undefined : orientation}
        className={cn(
          "shrink-0",
          isHorizontal ? "h-[1px] w-full" : "h-full w-[1px]",
          variant === "default" && "bg-border/60",
          variant === "subtle" && "bg-border/30",
          variant === "gold" && isHorizontal && "gold-rule",
          variant === "gold" &&
            !isHorizontal &&
            "bg-gradient-to-b from-transparent via-ccf-gold/40 to-transparent",
          className
        )}
        {...props}
      />
    );
  }
);
Separator.displayName = "Separator";

export { Separator };
