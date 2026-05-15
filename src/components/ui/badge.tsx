import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-primary/30 bg-primary/15 text-primary-glow hover:bg-primary/25 hover:shadow-glow",
        secondary:
          "border-border bg-secondary text-secondary-foreground hover:border-primary/40",
        destructive:
          "border-destructive/35 bg-destructive/15 text-[hsl(var(--accent-red))] hover:bg-destructive/25 hover:shadow-glow-red",
        success:
          "border-success/35 bg-success/15 text-[hsl(var(--accent-green))] hover:bg-success/25 hover:shadow-glow-green",
        warning:
          "border-warning/35 bg-warning/15 text-[hsl(var(--accent-yellow))] hover:bg-warning/25 hover:shadow-glow-yellow",
        info:
          "border-info/35 bg-info/15 text-primary-glow hover:bg-info/25 hover:shadow-glow",
        spectrum:
          "border-transparent text-white [background:var(--gradient-spectrum)] [background-size:200%_200%] [animation:spectrum-shift_8s_ease-in-out_infinite] hover:shadow-glow",
        outline:
          "border-border text-foreground hover:border-primary/50 hover:text-primary-glow",
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
