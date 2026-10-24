import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CheckCircle2, Loader2, MoreHorizontal } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { parseLocalDate } from "@/lib/periodRange";
import { formatCurrency, getIniziali, scattoStatusBadge, type OrdiniTableRow } from "./ordiniShared";
import type { Ordine } from "@/hooks/useOrdini";

const statusTone: Record<Ordine["status"], string> = {
  completato: "bg-scatto-success/15 text-scatto-success",
  spedito: "bg-scatto-info/15 text-scatto-info",
  in_attesa: "bg-scatto-warning/20 text-scatto-ink",
  stand_by: "bg-scatto-warning/20 text-scatto-ink",
  annullato: "bg-scatto-danger/15 text-scatto-danger",
};

export function OrderStatusPill({ ordine }: { ordine: Ordine }) {
  if (ordine.verificato_conferma) {
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-scatto-success/15 px-2.5 py-1 text-xs font-semibold text-scatto-success">
        <CheckCircle2 className="h-3.5 w-3.5" /> Verificato
      </span>
    );
  }
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone[ordine.status]}`}>
      {scattoStatusBadge[ordine.status].label}
    </span>
  );
}

interface OrdiniTableProps {
  rows: OrdiniTableRow[];
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}

/** Tabella desktop (≥ lg): colonne proporzionate, importi a destra, azioni ordinate. */
export function OrdiniTable({ rows, selectionMode, selectedIds, onToggleSelect }: OrdiniTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-scatto-line bg-scatto-surface">
      <table className="w-full table-fixed text-sm">
        <thead>
          <tr className="border-b border-scatto-line text-left text-xs font-semibold text-scatto-muted">
            {selectionMode && <th className="w-[5%] px-4 py-3" />}
            <th className="w-[11%] px-4 py-3">Data</th>
            <th className="w-[23%] px-4 py-3">Cliente</th>
            <th className="w-[20%] px-4 py-3">Fornitore</th>
            <th className="w-[12%] px-4 py-3">Riferimento</th>
            <th className="w-[14%] px-4 py-3 text-right">Totale</th>
            <th className="w-[11%] px-4 py-3">Stato</th>
            <th className="w-[9%] px-2 py-3 text-right"><span className="sr-only">Azioni</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ ordine, muted, actions, primaryAction }) => {
            const data = parseLocalDate(ordine.data_ordine) ?? new Date(ordine.created_at);
            const selected = selectedIds?.has(ordine.id);
            return (
              <tr
                key={ordine.id}
                className={`border-b border-scatto-line/60 last:border-0 transition-colors duration-150 hover:bg-scatto-bg/60 ${
                  selected ? "bg-scatto-accent/5" : ""
                } ${muted ? "opacity-60" : ""}`}
              >
                {selectionMode && (
                  <td className="px-4 py-3">
                    <Checkbox
                      checked={!!selected}
                      onCheckedChange={() => onToggleSelect?.(ordine.id)}
                      aria-label={`Seleziona ${ordine.codice}`}
                      className="h-5 w-5 border-scatto-line data-[state=checked]:border-scatto-accent data-[state=checked]:bg-scatto-accent"
                    />
                  </td>
                )}
                <td className="whitespace-nowrap px-4 py-3 tabular-nums text-scatto-ink">{format(data, "dd MMM yy", { locale: it })}</td>
                <td className="px-4 py-3">
                  <p className={`truncate font-semibold text-scatto-ink ${muted ? "line-through" : ""}`} title={ordine.clienti?.nome || ""}>
                    {ordine.clienti?.nome || "—"}
                  </p>
                  {ordine.clienti?.azienda && ordine.clienti.azienda !== ordine.clienti.nome && <p className="truncate text-xs text-scatto-muted">{ordine.clienti.azienda}</p>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-md border border-scatto-line bg-scatto-bg text-[9px] font-bold text-scatto-ink">
                      {ordine.aziende?.logo_url ? <img src={ordine.aziende.logo_url} alt="" className="h-full w-full object-cover" /> : getIniziali(ordine.aziende?.nome)}
                    </span>
                    <span className="truncate text-scatto-ink" title={ordine.aziende?.nome || ""}>{ordine.aziende?.nome || "—"}</span>
                  </div>
                </td>
                <td className="truncate px-4 py-3 font-mono text-xs text-scatto-muted">{ordine.codice}</td>
                <td className={`whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-scatto-ink ${muted ? "line-through" : ""}`}>
                  {formatCurrency(Number(ordine.totale))}
                </td>
                <td className="px-4 py-3"><OrderStatusPill ordine={ordine} /></td>
                <td className="px-2 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {primaryAction && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 w-9 shrink-0 rounded-lg border-scatto-line bg-transparent p-0 text-scatto-ink hover:bg-scatto-bg"
                        title={primaryAction.label}
                        aria-label={primaryAction.label}
                        onClick={primaryAction.onClick}
                        disabled={primaryAction.pending}
                      >
                        {primaryAction.pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <primaryAction.icon className="h-4 w-4" />}
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-scatto-muted hover:bg-scatto-bg hover:text-scatto-ink" aria-label="Altre azioni">
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
                                className={action.destructive ? "text-scatto-danger focus:bg-scatto-bg focus:text-scatto-danger" : "focus:bg-scatto-bg focus:text-scatto-ink"}
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
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
