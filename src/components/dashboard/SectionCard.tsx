import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionCardProps {
  title?: ReactNode;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}

// Wrapper condiviso per tutte le sezioni "card bianca" della pagina KPI:
// bordo sottile, ombra quasi impercettibile, angoli morbidi — stesso
// linguaggio in ogni modulo invece di ripetere la stessa stringa di classi
// in 10+ componenti.
export function SectionCard({ title, action, className, children }: SectionCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-scatto-line bg-scatto-surface p-4 shadow-[0_6px_24px_-14px_hsl(225_18%_9%/0.16)] lg:p-6",
        className
      )}
    >
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && (
            <h2 className="font-display text-sm font-semibold tracking-tight text-scatto-ink">{title}</h2>
          )}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
