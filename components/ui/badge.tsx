import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-ccf-gold/30 bg-ccf-gold/15 text-ccf-gold",
        gold:
          "border-transparent bg-ccf-gold text-ccf-navy font-bold shadow-xs",
        secondary:
          "border-border/50 bg-secondary text-secondary-foreground",
        outline:
          "border-border text-foreground bg-transparent",
        success:
          "border-status-success/30 bg-status-success/15 text-status-success",
        warning:
          "border-status-warning/30 bg-status-warning/15 text-status-warning",
        destructive:
          "border-status-error/30 bg-status-error/15 text-status-error",
        info:
          "border-border/50 bg-muted/60 text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

function Badge({ className, variant, dot = false, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            variant === "success" && "bg-status-success",
            variant === "warning" && "bg-status-warning",
            variant === "destructive" && "bg-status-error",
            variant === "gold" && "bg-ccf-navy",
            variant === "default" && "bg-ccf-gold",
            variant === "secondary" && "bg-ccf-muted",
            variant === "outline" && "bg-ccf-muted",
            variant === "info" && "bg-muted-foreground"
          )}
          aria-hidden="true"
        />
      )}
      {children}
    </div>
  );
}

export { Badge, badgeVariants };
