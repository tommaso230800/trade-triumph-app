import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, MoreHorizontal, CheckCircle2, Loader2, type LucideIcon } from "lucide-react";
import { format } from "date-fns";
import type { Ordine } from "@/hooks/useOrdini";
import { formatCurrency, formatNumberIT, numeroRigheOrdine, scattoStatusBadge } from "./ordiniShared";
import { aziendaDotClass } from "@/lib/aziendaColor";

export interface OrdineCardAction {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  destructive?: boolean;
}

interface OrdineCardProps {
  ordine: Ordine;
  muted?: boolean;
  actions: OrdineCardAction[];
  primaryAction?: {
    label: string;
    icon: LucideIcon;
    onClick: () => void;
    pending?: boolean;
  };
  giorniInStandBy?: number;
}

export function OrdineCard({ ordine, muted, actions, primaryAction, giorniInStandBy }: OrdineCardProps) {
  const [open, setOpen] = useState(false);
  const verificato = Boolean(ordine.verificato_conferma);
  const aziendaNome = ordine.aziende?.nome;
  const status = scattoStatusBadge[ordine.status];

  return (
    <div
      className={`rounded-2xl border bg-scatto-surface shadow-[0_1px_2px_rgba(32,20,15,0.05)] ${
        verificato ? "border-scatto-success/40" : "border-scatto-line"
      } ${muted ? "opacity-60" : ""}`}
    >
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button type="button" className="group flex w-full items-start justify-between gap-3 p-5 text-left touch-target">
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${aziendaDotClass(ordine.azienda_id)}`} />
                <p className={`truncate text-base font-bold ${muted ? "text-scatto-muted line-through" : "text-scatto-ink"}`}>
                  {ordine.clienti?.nome || "—"}
                </p>
              </div>
              <div className="mt-1 flex min-w-0 items-center gap-1.5 pl-4 text-xs text-scatto-muted">
                <span className="shrink-0">{ordine.codice}</span>
                {aziendaNome && (
                  <>
                    <span className="shrink-0">·</span>
                    <span className="truncate">{aziendaNome}</span>
                  </>
                )}
              </div>
              <div className="mt-2 flex items-center gap-1.5 pl-4">
                {verificato && (
                  <span className="flex items-center gap-1 rounded-full bg-scatto-success px-2.5 py-0.5 text-[11px] font-extrabold text-white">
                    <CheckCircle2 className="h-3 w-3" />
                    Verificato
                  </span>
                )}
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold text-white ${status.bg}`}>
                  {status.label}
                </span>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <p className={`text-xl font-extrabold tabular-nums tracking-tight ${muted ? "text-scatto-muted line-through" : "text-scatto-ink"}`}>
                {formatCurrency(Number(ordine.totale))}
              </p>
              <ChevronDown className="h-4 w-4 shrink-0 text-scatto-muted transition-transform group-data-[state=open]:rotate-180" />
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="space-y-4 border-t border-scatto-line px-5 pb-5 pt-4">
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <span className="text-scatto-muted">Prodotti</span>
              <span className="text-right tabular-nums text-scatto-ink">
                {numeroRigheOrdine(ordine)} prodotti · {formatNumberIT(ordine.prodotti)} pz
              </span>
              <span className="text-scatto-muted">Pagamento</span>
              <span className="text-right text-scatto-ink">{ordine.tipo_pagamento || "—"}</span>
              <span className="text-scatto-muted">Data</span>
              <span className="text-right text-scatto-ink">
                {format(new Date(ordine.data_ordine || ordine.created_at), "dd/MM/yyyy")}
              </span>
              {giorniInStandBy !== undefined && giorniInStandBy > 0 && (
                <>
                  <span className="text-scatto-muted">In stand-by da</span>
                  <span className="text-right text-scatto-ink">{giorniInStandBy}g</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              {primaryAction && (
                <Button
                  size="sm"
                  className="touch-target flex-1 gap-1.5 bg-scatto-accent font-bold text-white hover:bg-scatto-accent/90"
                  onClick={primaryAction.onClick}
                  disabled={primaryAction.pending}
                >
                  {primaryAction.pending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <primaryAction.icon className="h-4 w-4" />
                  )}
                  {primaryAction.label}
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="touch-target shrink-0 border-scatto-line bg-transparent text-scatto-ink hover:bg-scatto-bg"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="border-scatto-line bg-scatto-surface text-scatto-ink">
                  {actions.map((action) => {
                    const Icon = action.icon;
                    return (
                      <div key={action.label}>
                        {action.destructive && <DropdownMenuSeparator className="bg-scatto-line" />}
                        <DropdownMenuItem
                          onClick={action.onClick}
                          className={
                            action.destructive
                              ? "text-scatto-danger focus:bg-scatto-bg focus:text-scatto-danger"
                              : "focus:bg-scatto-bg focus:text-scatto-ink"
                          }
                        >
                          <Icon className="mr-2 h-4 w-4" />
                          {action.label}
                        </DropdownMenuItem>
                      </div>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
