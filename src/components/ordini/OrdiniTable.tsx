import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  formatCurrency,
  formatNumberIT,
  numeroRigheOrdine,
  scattoStatusBadge,
  scattoVerificatoBadgeClass,
} from "./ordiniShared";
import type { OrdineCardAction } from "./OrdineCard";
import { aziendaDotClass } from "@/lib/aziendaColor";

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
    <div className="hidden overflow-hidden rounded-2xl border border-scatto-line bg-scatto-surface shadow-[0_1px_2px_rgba(32,20,15,0.05)] md:block">
      <Table>
        <TableHeader>
          <TableRow className="border-scatto-line bg-scatto-bg hover:bg-scatto-bg hover:shadow-none">
            <TableHead className="font-bold uppercase tracking-wide text-scatto-muted">ID Ordine</TableHead>
            <TableHead className="font-bold uppercase tracking-wide text-scatto-muted">Cliente</TableHead>
            {showStandByColumns ? (
              <>
                <TableHead className="font-bold uppercase tracking-wide text-scatto-muted">Motivo</TableHead>
                <TableHead className="font-bold uppercase tracking-wide text-scatto-muted">Prodotto bloccato</TableHead>
                <TableHead className="font-bold uppercase tracking-wide text-scatto-muted">Data prevista</TableHead>
              </>
            ) : (
              <>
                <TableHead className="font-bold uppercase tracking-wide text-scatto-muted">Prodotti</TableHead>
                <TableHead className="font-bold uppercase tracking-wide text-scatto-muted">Pagamento</TableHead>
                <TableHead className="font-bold uppercase tracking-wide text-scatto-muted">Data</TableHead>
              </>
            )}
            <TableHead className="text-right font-bold uppercase tracking-wide text-scatto-muted">Totale</TableHead>
            <TableHead className="font-bold uppercase tracking-wide text-scatto-muted">Status</TableHead>
            <TableHead className="w-12 text-right font-bold uppercase tracking-wide text-scatto-muted">Azioni</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ ordine, muted, actions, primaryAction, giorniInStandBy }) => {
            const verificato = Boolean(ordine.verificato_conferma);
            const status = scattoStatusBadge[ordine.status];
            return (
              <TableRow
                key={ordine.id}
                className={`border-scatto-line hover:bg-scatto-bg/60 hover:shadow-none ${
                  verificato ? "border-l-2 border-l-scatto-success" : ""
                } ${muted ? "opacity-60" : ""}`}
              >
                <TableCell className="text-xs font-bold text-scatto-accent">
                  {ordine.codice}
                  {giorniInStandBy !== undefined && giorniInStandBy > 0 && (
                    <div className="mt-0.5 text-[10px] font-normal text-scatto-muted">
                      {giorniInStandBy}g in stand-by
                    </div>
                  )}
                </TableCell>
                <TableCell className={`font-bold ${muted ? "text-scatto-muted" : "text-scatto-ink"}`}>
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${aziendaDotClass(ordine.azienda_id)}`} />
                    {ordine.clienti?.nome || "—"}
                  </div>
                  {ordine.aziende?.nome && (
                    <div className="mt-0.5 pl-4 text-xs font-normal text-scatto-muted">{ordine.aziende.nome}</div>
                  )}
                </TableCell>
                {showStandByColumns ? (
                  <>
                    <TableCell>
                      <span className="rounded-full bg-scatto-warning px-2.5 py-0.5 text-[11px] font-extrabold text-white">
                        {ordine.stand_by_motivo || "Stand-by"}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-scatto-muted">
                      {ordine.stand_by_prodotto_bloccato || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-scatto-ink">
                      {ordine.stand_by_data_prevista
                        ? format(new Date(ordine.stand_by_data_prevista), "dd/MM/yyyy")
                        : "—"}
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell className="text-scatto-muted">
                      {numeroRigheOrdine(ordine)} prodotti · {formatNumberIT(ordine.prodotti)} pz
                    </TableCell>
                    <TableCell className="text-sm text-scatto-muted">{ordine.tipo_pagamento || "—"}</TableCell>
                    <TableCell className="text-scatto-ink">
                      {format(new Date(ordine.data_ordine || ordine.created_at), "dd/MM/yyyy")}
                    </TableCell>
                  </>
                )}
                <TableCell
                  className={`text-right font-extrabold tabular-nums ${
                    muted ? "text-scatto-muted line-through" : "text-scatto-ink"
                  }`}
                >
                  {formatCurrency(Number(ordine.totale))}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {verificato ? (
                      <span className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${scattoVerificatoBadgeClass}`}>
                        <CheckCircle2 className="h-3 w-3" />
                        Verif.
                      </span>
                    ) : (
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${status.className}`}>
                        {status.label}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    {primaryAction && (
                      <Button
                        size="sm"
                        className="gap-1 bg-scatto-accent font-bold text-white hover:bg-scatto-accent/90"
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
                        <Button variant="ghost" size="icon" className="text-scatto-ink hover:bg-scatto-bg">
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
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
