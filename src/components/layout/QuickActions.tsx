import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, ShoppingCart, UserPlus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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

export function QuickActions({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const go = (href: string) => {
    setOpen(false);
    navigate(href);
  };

  return (
    <div className={compact ? "relative flex flex-1 items-center justify-center" : "fixed bottom-8 right-8 z-50 flex flex-col items-end gap-2 print:hidden"}>
      {open && (
        <div className={cn("flex flex-col items-end gap-2", compact && "absolute bottom-full right-0 mb-4")}>
          {actions.map((a) => {
            const Icon = a.icon;
            return (
              <Button variant="outline"
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
              </Button>
            );
          })}
        </div>
      )}

      <Button variant="ghost"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Chiudi azioni rapide" : "Apri azioni rapide"}
        className={cn(
          compact ? "flex h-11 w-11 flex-col items-center justify-center gap-1 p-0 text-primary" : "flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm"
        )}
      >
        {open ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
        {compact && <span className="text-xs">Nuovo</span>}
      </Button>
    </div>
  );
}
