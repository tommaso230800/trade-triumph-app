import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, ShoppingCart, ClipboardList, Target, Bell, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Action = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  tone: "blue" | "green" | "yellow" | "red";
};

const actions: Action[] = [
  { label: "Nuovo Ordine", icon: ShoppingCart, href: "/ordini?new=1", tone: "blue" },
  { label: "Registra Visita", icon: ClipboardList, href: "/visite?new=1", tone: "green" },
  { label: "Nuova Trattativa", icon: Target, href: "/trattative?new=1", tone: "yellow" },
  { label: "Nuovo Promemoria", icon: Bell, href: "/promemoria?new=1", tone: "red" },
];

const toneRing: Record<Action["tone"], string> = {
  blue: "bg-brand-blue text-white shadow-glow",
  green: "bg-brand-green text-white shadow-glow-green",
  yellow: "bg-brand-yellow text-warning-foreground shadow-glow-yellow",
  red: "bg-brand-red text-white shadow-glow-red",
};

export function QuickActions() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const go = (href: string) => {
    setOpen(false);
    navigate(href);
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3 lg:bottom-8 lg:right-8 print:hidden">
      {open && (
        <div className="flex flex-col items-end gap-2 animate-fade-in">
          {actions.map((a, i) => {
            const Icon = a.icon;
            return (
              <button
                key={a.label}
                onClick={() => go(a.href)}
                className={cn(
                  "group flex items-center gap-3 rounded-full pl-4 pr-2 py-2 surface-noir border border-border hover:border-primary/60 transition-all duration-200 hover:-translate-y-0.5",
                  "animate-rise-in"
                )}
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <span className="text-sm font-semibold text-foreground whitespace-nowrap">
                  {a.label}
                </span>
                <span className={cn("flex h-9 w-9 items-center justify-center rounded-full", toneRing[a.tone])}>
                  <Icon className="h-4 w-4" />
                </span>
              </button>
            );
          })}
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Chiudi azioni rapide" : "Apri azioni rapide"}
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-full text-white transition-all duration-300 shadow-glow",
          "[background:var(--gradient-spectrum)] [background-size:200%_200%] [animation:spectrum-shift_8s_ease-in-out_infinite]",
          "hover:scale-105 active:scale-95"
        )}
      >
        {open ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
      </button>
    </div>
  );
}
