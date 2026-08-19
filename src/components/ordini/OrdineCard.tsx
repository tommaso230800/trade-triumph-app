import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { it } from "date-fns/locale";
import type { Ordine } from "@/hooks/useOrdini";
import {
  formatCurrency,
  formatNumberIT,
  getIniziali,
  numeroRigheOrdine,
  scattoStatusBadge,
} from "./ordiniShared";
import { aziendaColorValue, readableTextColor, useAziendaColorMap } from "@/lib/aziendaColor";

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
  /** Modalità selezione multipla: il tocco sulla card seleziona invece di aprirla. */
  selectionMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}

export function OrdineCard({
  ordine,
  muted,
  actions,
  primaryAction,
  giorniInStandBy,
  selectionMode,
  selected,
  onToggleSelect,
}: OrdineCardProps) {
  const [open, setOpen] = useState(false);
  const verificato = Boolean(ordine.verificato_conferma);
  const aziendaNome = ordine.aziende?.nome;
  const aziendaLogo = ordine.aziende?.logo_url;
  const status = scattoStatusBadge[ordine.status];
  const aziendaColorMap = useAziendaColorMap();
  const aziendaColor = aziendaColorValue(ordine.azienda_id, aziendaColorMap);
  const fasciaTextColor = readableTextColor(aziendaColor);
  const fasciaIsDark = fasciaTextColor === "#12141a";
  const dataOrdine = new Date(ordine.data_ordine || ordine.created_at);
  const oraOrdine = format(new Date(ordine.created_at), "HH:mm");

  return (
    <div
      className={`overflow-hidden rounded-xl bg-scatto-surface shadow-[0_1px_2px_hsl(225_18%_9%/0.05)] ${
        verificato ? "border border-scatto-success/50" : "border border-scatto-line"
      } ${muted ? "opacity-60" : ""} ${
        selected ? "ring-2 ring-scatto-accent ring-offset-2 ring-offset-scatto-bg" : ""
      }`}
    >
      {/* Fascia col colore identità dell'azienda fornitrice: logo/iniziali + nome a sinistra, stato a destra */}
      <div
        className="flex items-center justify-between gap-2 px-3.5 py-2.5"
        style={{ backgroundColor: aziendaColor, color: fasciaTextColor }}
      >
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center overflow-hidden rounded-md bg-white text-[8px] font-bold text-scatto-ink">
            {aziendaLogo ? (
              <img src={aziendaLogo} alt="" className="h-full w-full object-cover" />
            ) : (
              getIniziali(aziendaNome)
            )}
          </div>
          <span className="truncate font-display text-xs font-bold tracking-wide">{aziendaNome || "—"}</span>
        </div>

        {verificato ? (
          <span className="flex flex-shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-scatto-success px-2.5 py-0.5 text-[10px] font-bold text-white">
            <CheckCircle2 className="h-3 w-3" />
            Verificato
          </span>
        ) : ordine.status === "in_attesa" || ordine.status === "stand_by" ? (
          <span className="flex-shrink-0 whitespace-nowrap rounded-full bg-scatto-warning px-2.5 py-0.5 text-[10px] font-bold text-scatto-ink">
            {status.label}
          </span>
        ) : (
          <span
            className="flex-shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[10px] font-bold"
            style={{ backgroundColor: fasciaIsDark ? "rgba(0,0,0,.12)" : "rgba(255,255,255,.22)" }}
          >
            {status.label}
          </span>
        )}
      </div>

      {selectionMode ? (
        <button
          type="button"
          onClick={onToggleSelect}
          className="flex w-full items-center gap-3 p-3.5 text-left touch-target"
        >
          <Checkbox
            checked={!!selected}
            onCheckedChange={onToggleSelect}
            onClick={(e) => e.stopPropagation()}
            className="h-5 w-5 flex-shrink-0 border-scatto-line data-[state=checked]:border-scatto-accent data-[state=checked]:bg-scatto-accent"
          />
          <div className="min-w-0 flex-1">
            <p className={`truncate text-[15px] font-bold ${muted ? "text-scatto-muted line-through" : "text-scatto-ink"}`}>
              {ordine.clienti?.nome || "—"}
            </p>
            <p className="mt-0.5 truncate text-xs">
              <span className="font-semibold text-scatto-accent">{format(dataOrdine, "d MMMM", { locale: it })}</span>
              <span className="text-scatto-muted"> · {oraOrdine}</span>
            </p>
          </div>
          <p className={`flex-shrink-0 text-base font-bold tabular-nums tracking-tight ${muted ? "text-scatto-muted line-through" : "text-scatto-ink"}`}>
            {formatCurrency(Number(ordine.totale))}
          </p>
        </button>
      ) : (
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger asChild>
            <button type="button" className="group flex w-full items-center gap-3 p-3.5 text-left touch-target">
              <div className="min-w-0 flex-1">
                <p className={`truncate text-[15px] font-bold ${muted ? "text-scatto-muted line-through" : "text-scatto-ink"}`}>
                  {ordine.clienti?.nome || "—"}
                </p>
                <p className="mt-0.5 truncate text-xs">
                  <span className="font-semibold text-scatto-accent">{format(dataOrdine, "d MMMM", { locale: it })}</span>
                  <span className="text-scatto-muted"> · {oraOrdine}</span>
                </p>
              </div>
              <p className={`flex-shrink-0 text-base font-bold tabular-nums tracking-tight ${muted ? "text-scatto-muted line-through" : "text-scatto-ink"}`}>
                {formatCurrency(Number(ordine.totale))}
              </p>
              <ChevronDown className="h-4 w-4 flex-shrink-0 text-scatto-muted transition-transform group-data-[state=open]:rotate-180" />
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
              {ordine.stand_by_motivo && (
                <>
                  <span className="text-scatto-muted">Motivo</span>
                  <span className="text-right text-scatto-ink">{ordine.stand_by_motivo}</span>
                </>
              )}
              {ordine.stand_by_prodotto_bloccato && (
                <>
                  <span className="text-scatto-muted">Prodotto bloccato</span>
                  <span className="text-right text-scatto-ink">{ordine.stand_by_prodotto_bloccato}</span>
                </>
              )}
              {ordine.stand_by_data_prevista && (
                <>
                  <span className="text-scatto-muted">Data prevista</span>
                  <span className="text-right text-scatto-ink">
                    {format(new Date(ordine.stand_by_data_prevista), "dd/MM/yyyy")}
                  </span>
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
      )}
    </div>
  );
}
