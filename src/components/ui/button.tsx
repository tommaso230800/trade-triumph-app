import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_6px_20px_-6px_hsl(var(--primary)/0.55)] hover:bg-primary/90 hover:shadow-glow active:bg-primary/80",
        gradient:
          "text-white border-0 shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.7)] hover:shadow-glow hover:-translate-y-[1px] [background:var(--gradient-primary)]",
        spectrum:
          "text-white border-0 shadow-[0_10px_28px_-10px_hsl(var(--primary)/0.7)] hover:shadow-glow hover:-translate-y-[1px] [background:var(--gradient-spectrum)] [background-size:200%_200%] [animation:spectrum-shift_8s_ease-in-out_infinite]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[0_6px_20px_-6px_hsl(var(--destructive)/0.55)] hover:bg-destructive/90 hover:shadow-glow-red active:bg-destructive/80",
        success:
          "bg-success text-success-foreground shadow-[0_6px_20px_-6px_hsl(var(--success)/0.55)] hover:bg-success/90 hover:shadow-glow-green",
        warning:
          "bg-warning text-warning-foreground shadow-[0_6px_20px_-6px_hsl(var(--warning)/0.55)] hover:bg-warning/90 hover:shadow-glow-yellow",
        outline:
          "border border-border bg-card text-foreground hover:border-primary hover:bg-secondary hover:text-foreground hover:shadow-glow active:bg-secondary/80",
        secondary:
          "bg-secondary text-secondary-foreground border border-border hover:bg-secondary/80 hover:border-primary/40 active:bg-secondary/70",
        ghost:
          "text-foreground hover:bg-secondary/60 hover:text-primary active:bg-secondary/80",
        link:
          "text-primary underline-offset-4 hover:underline hover:text-primary-glow",
      },
      size: {
        default: "h-11 px-5 py-2.5",
        sm: "h-10 rounded-xl px-4",
        lg: "h-12 rounded-xl px-8",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
