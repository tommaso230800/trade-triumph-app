import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionKickerProps {
  tone?: "info" | "success" | "warning" | "violet" | "danger";
  children: ReactNode;
}

const toneClass: Record<NonNullable<SectionKickerProps["tone"]>, { text: string; bar: string }> = {
  info: { text: "text-scatto-info", bar: "bg-scatto-info" },
  success: { text: "text-scatto-success", bar: "bg-scatto-success" },
  warning: { text: "text-scatto-warning", bar: "bg-scatto-warning" },
  violet: { text: "text-scatto-violet", bar: "bg-scatto-violet" },
  danger: { text: "text-scatto-danger", bar: "bg-scatto-danger" },
};

// Etichetta piccola maiuscola con barretta colorata a inizio sezione,
// ripetuta identica 4 volte in KPI.tsx prima di questa estrazione.
export function SectionKicker({ tone = "info", children }: SectionKickerProps) {
  const c = toneClass[tone];
  return (
    <h2 className={cn("flex items-center gap-2 px-1 pt-4 text-[11px] font-bold uppercase tracking-widest", c.text)}>
      <span className={cn("inline-block h-3.5 w-1 rounded-sm", c.bar)} />
      {children}
    </h2>
  );
}
