import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, ShoppingCart, UserPlus, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Action = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
};

// Il query param "nuovo=1" viene letto da Ordini.tsx/Clienti.tsx per aprire
// automaticamente la relativa scheda di creazione all'arrivo sulla pagina.
const actions: Action[] = [
  { label: "Nuovo Ordine", icon: ShoppingCart, href: "/ordini?nuovo=1" },
  { label: "Nuovo Cliente", icon: UserPlus, href: "/clienti?nuovo=1" },
];

export function QuickActions() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const go = (href: string) => {
    setOpen(false);
    navigate(href);
  };

  return (
    <div className="fixed bottom-24 right-4 z-50 flex flex-col items-end gap-2 lg:bottom-8 lg:right-8 print:hidden">
      {open && (
        <div className="flex flex-col items-end gap-2">
          {actions.map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.label}
                onClick={() => go(a.href)}
                className="flex items-center gap-3 rounded-full pl-4 pr-2 py-2 bg-card border border-border shadow-md hover:border-primary/50 transition-colors"
              >
                <span className="text-sm font-medium text-foreground whitespace-nowrap">
                  {a.label}
                </span>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
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
          "flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform",
          "hover:scale-105 active:scale-95"
        )}
      >
        {open ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
      </button>
    </div>
  );
}
