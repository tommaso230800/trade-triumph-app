import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-primary/25 bg-primary/12 text-[hsl(var(--primary))] hover:bg-primary/20 hover:shadow-glow",
        secondary:
          "border-border bg-secondary text-secondary-foreground hover:border-primary/40",
        destructive:
          "border-destructive/35 bg-destructive/12 text-[hsl(var(--accent-red))] hover:bg-destructive/18 hover:shadow-glow-red",
        success:
          "border-success/35 bg-success/12 text-[hsl(var(--accent-green))] hover:bg-success/18 hover:shadow-glow-green",
        warning:
          "border-warning/35 bg-warning/14 text-[hsl(var(--warning-foreground))] hover:bg-warning/22 hover:shadow-glow-yellow",
        info:
          "border-info/35 bg-info/12 text-[hsl(var(--primary))] hover:bg-info/18 hover:shadow-glow",
        spectrum:
          "border-transparent text-white [background:var(--gradient-spectrum)] hover:shadow-glow",
        outline:
          "border-border bg-card text-foreground hover:border-primary/50 hover:text-primary",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
