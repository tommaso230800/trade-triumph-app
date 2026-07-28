import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, CheckCircle2, Loader2, type LucideIcon } from "lucide-react";
import { format } from "date-fns";
import type { Ordine } from "@/hooks/useOrdini";
import { formatCurrency, statusConfig } from "./ordiniShared";
import type { OrdineCardAction } from "./OrdineCard";

export interface OrdiniTableRow {
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

interface OrdiniTableProps {
  rows: OrdiniTableRow[];
  showStandByColumns?: boolean;
}

export function OrdiniTable({ rows, showStandByColumns }: OrdiniTableProps) {
  return (
    <div className="hidden overflow-hidden rounded-xl border border-border bg-card shadow-card md:block">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>ID Ordine</TableHead>
            <TableHead>Cliente</TableHead>
            {showStandByColumns ? (
              <>
                <TableHead>Motivo</TableHead>
                <TableHead>Prodotto bloccato</TableHead>
                <TableHead>Data prevista</TableHead>
              </>
            ) : (
              <>
                <TableHead>Prodotti</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead>Data</TableHead>
              </>
            )}
            <TableHead className="text-right">Totale</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-12 text-right">Azioni</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ ordine, muted, actions, primaryAction, giorniInStandBy }) => {
            const status = statusConfig[ordine.status];
            const verificato = Boolean((ordine as { verificato_conferma?: boolean }).verificato_conferma);
            return (
              <TableRow key={ordine.id} className={muted ? "opacity-70" : "hover:bg-muted/30 transition-colors"}>
                <TableCell className="font-mono text-xs font-medium text-primary">
                  {ordine.codice}
                  {giorniInStandBy !== undefined && giorniInStandBy > 0 && (
                    <div className="mt-0.5 text-[10px] text-muted-foreground">
                      {giorniInStandBy}g in stand-by
                    </div>
                  )}
                </TableCell>
                <TableCell className={`font-medium ${muted ? "text-muted-foreground" : "text-card-foreground"}`}>
                  {ordine.clienti?.nome || "—"}
                </TableCell>
                {showStandByColumns ? (
                  <>
                    <TableCell>
                      <Badge variant="warning">{ordine.stand_by_motivo || "Stand-by"}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {ordine.stand_by_prodotto_bloccato || "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {ordine.stand_by_data_prevista
                        ? format(new Date(ordine.stand_by_data_prevista), "dd/MM/yyyy")
                        : "—"}
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell className="text-muted-foreground">{ordine.prodotti} articoli</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{ordine.tipo_pagamento || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(ordine.data_ordine || ordine.created_at), "dd/MM/yyyy")}
                    </TableCell>
                  </>
                )}
                <TableCell
                  className={`text-right font-semibold tabular-nums ${
                    muted ? "text-muted-foreground line-through" : ""
                  }`}
                >
                  {formatCurrency(Number(ordine.totale))}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-1">
                    <Badge variant={status.variant}>{status.label}</Badge>
                    {verificato && (
                      <Badge variant="success">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Verif.
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    {primaryAction && (
                      <Button
                        size="sm"
                        variant="success"
                        className="gap-1"
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
                        <Button variant="ghost" size="icon">
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
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
