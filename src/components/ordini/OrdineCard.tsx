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
import { ChevronDown, MoreHorizontal, CheckCircle2, Check, Loader2, type LucideIcon } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import type { Ordine } from "@/hooks/useOrdini";
import {
  formatCurrency,
  formatNumberIT,
  getIniziali,
  numeroRigheOrdine,
  scattoStatusBadge,
  scattoVerificatoBadgeClass,
} from "./ordiniShared";
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
  const aziendaLogo = ordine.aziende?.logo_url;
  const status = scattoStatusBadge[ordine.status];
  const aziendaClass = aziendaDotClass(ordine.azienda_id);
  const dataOrdine = new Date(ordine.data_ordine || ordine.created_at);
  const oraOrdine = format(new Date(ordine.created_at), "HH:mm");

  return (
    <div
      className={`rounded-2xl bg-scatto-surface shadow-[0_1px_2px_rgba(32,20,15,0.05)] ${
        verificato ? "border-2 border-scatto-success" : "border border-scatto-line"
      } ${muted ? "opacity-60" : ""}`}
    >
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button type="button" className="group flex w-full items-start gap-3 p-4 text-left touch-target">
            <div className="relative flex-shrink-0">
              {aziendaLogo ? (
                <img
                  src={aziendaLogo}
                  alt={aziendaNome || ""}
                  className="h-11 w-11 rounded-full border border-scatto-line object-cover"
                />
              ) : (
                <div className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold text-white ${aziendaClass}`}>
                  {getIniziali(aziendaNome)}
                </div>
              )}
              {verificato && (
                <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-scatto-surface bg-scatto-success">
                  <Check className="h-2.5 w-2.5 text-white" />
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className={`truncate text-[15px] font-bold ${muted ? "text-scatto-muted line-through" : "text-scatto-ink"}`}>
                  {ordine.clienti?.nome || "—"}
                </p>
                <p className={`flex-shrink-0 text-lg font-extrabold tabular-nums tracking-tight ${muted ? "text-scatto-muted line-through" : "text-scatto-ink"}`}>
                  {formatCurrency(Number(ordine.totale))}
                </p>
              </div>
              <p className="mt-0.5 truncate text-xs">
                <span className="font-semibold text-scatto-accent">{format(dataOrdine, "d MMMM", { locale: it })}</span>
                <span className="text-scatto-muted"> · {oraOrdine}</span>
              </p>

              <div className="mt-2.5 flex items-center gap-2 border-t border-scatto-line pt-2.5">
                {aziendaNome && (
                  <span className="flex min-w-0 items-center gap-1.5 text-xs text-scatto-muted">
                    <span className={`h-2 w-2 flex-shrink-0 rounded-full ${aziendaClass}`} />
                    <span className="truncate">{aziendaNome}</span>
                  </span>
                )}
                {verificato ? (
                  <span className={`ml-auto flex flex-shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${scattoVerificatoBadgeClass}`}>
                    <CheckCircle2 className="h-3 w-3" />
                    Verificato
                  </span>
                ) : (
                  <span className={`ml-auto flex-shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${status.className}`}>
                    {status.label}
                  </span>
                )}
              </div>
            </div>

            <ChevronDown className="mt-1 h-4 w-4 flex-shrink-0 text-scatto-muted transition-transform group-data-[state=open]:rotate-180" />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="space-y-4 border-t border-scatto-line px-5 pb-5 pt-4">
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <span className="text-scatto-muted">Ordine</span>
              <span className="text-right text-scatto-ink">
                {ordine.codice} · {numeroRigheOrdine(ordine)} prodotti · {formatNumberIT(ordine.prodotti)} pz
              </span>
              <span className="text-scatto-muted">Pagamento</span>
              <span className="text-right text-scatto-ink">{ordine.tipo_pagamento || "—"}</span>
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
