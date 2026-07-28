import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { formatCurrency, statusConfig } from "./ordiniShared";

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
  const status = statusConfig[ordine.status];
  const verificato = Boolean((ordine as { verificato_conferma?: boolean }).verificato_conferma);

  return (
    <Card className={muted ? "opacity-70" : undefined}>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button type="button" className="group flex w-full items-start justify-between gap-3 p-4 text-left touch-target">
            <div className="min-w-0 flex-1">
              <p className={`truncate text-sm font-semibold ${muted ? "text-muted-foreground" : "text-card-foreground"}`}>
                {ordine.clienti?.nome || "—"}
              </p>
              <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <span className="font-mono">{ordine.codice}</span>
                <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-180" />
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <p
                className={`text-base font-bold tabular-nums ${
                  muted ? "text-muted-foreground line-through" : "text-card-foreground"
                }`}
              >
                {formatCurrency(Number(ordine.totale))}
              </p>
              <div className="flex items-center gap-1">
                {verificato && (
                  <Badge variant="success">
                    <CheckCircle2 className="h-3 w-3" />
                  </Badge>
                )}
                <Badge variant={status.variant}>{status.label}</Badge>
              </div>
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="space-y-3 border-t border-border px-4 pb-4 pt-3">
            <div className="grid grid-cols-2 gap-y-1.5 text-sm">
              <span className="text-muted-foreground">Prodotti</span>
              <span className="text-right tabular-nums">{ordine.prodotti} articoli</span>
              <span className="text-muted-foreground">Pagamento</span>
              <span className="text-right">{ordine.tipo_pagamento || "—"}</span>
              <span className="text-muted-foreground">Data</span>
              <span className="text-right">
                {format(new Date(ordine.data_ordine || ordine.created_at), "dd/MM/yyyy")}
              </span>
              {giorniInStandBy !== undefined && giorniInStandBy > 0 && (
                <>
                  <span className="text-muted-foreground">In stand-by da</span>
                  <span className="text-right">{giorniInStandBy}g</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              {primaryAction && (
                <Button
                  size="sm"
                  variant="success"
                  className="touch-target flex-1 gap-1.5"
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
                  <Button variant="outline" size="icon" className="touch-target shrink-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {actions.map((action) => {
                    const Icon = action.icon;
                    return (
                      <div key={action.label}>
                        {action.destructive && <DropdownMenuSeparator />}
                        <DropdownMenuItem
                          onClick={action.onClick}
                          className={action.destructive ? "text-destructive" : undefined}
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
    </Card>
  );
}
