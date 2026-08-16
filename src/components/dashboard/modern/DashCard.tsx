import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Guscio card della dashboard "modern" (layout ispirato al template
 * shadcndashboard): bordo 1px, una sola ombra leggera, header separato da una
 * linea. Nessun colore hardcoded: solo token scatto-*.
 */
export function DashCard({
  title,
  icon,
  action,
  className,
  bodyClassName,
  children,
}: {
  title?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-xl border border-scatto-line bg-scatto-surface shadow-[0_1px_2px_hsl(225_18%_9%/0.05)]",
        className
      )}
    >
      {title && (
        <header className="flex items-center gap-2 border-b border-scatto-line px-4 py-3 sm:px-5">
          {icon && <span className="text-scatto-muted">{icon}</span>}
          <h2 className="font-display text-base font-semibold tracking-tight text-scatto-ink">{title}</h2>
          {action && <div className="ml-auto">{action}</div>}
        </header>
      )}
      <div className={cn("flex-1 p-4 sm:p-5", bodyClassName)}>{children}</div>
    </section>
  );
}
