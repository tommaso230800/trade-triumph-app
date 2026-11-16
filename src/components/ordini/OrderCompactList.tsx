import { Link } from "react-router-dom";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type OrderStatusConfig = Record<string, { label: string; className: string }>;

export interface OrderCompactItem {
  id: string;
  codice?: string | null;
  data_ordine?: string | null;
  created_at: string;
  totale: number | string | null;
  status: string;
  aziende?: { nome?: string | null } | null;
  ordini_righe?: unknown[] | null;
}

interface Props {
  orders: OrderCompactItem[];
  statusConfig: OrderStatusConfig;
  formatCurrency: (value: number) => string;
  /** Data mostrata: per default data ordine, altrimenti data di creazione. */
  dateField?: "data_ordine" | "created_at";
  showAzienda?: boolean;
  className?: string;
}

/**
 * Elenco ordini a righe compatte per mobile: codice + totale + stato,
 * il dettaglio si apre al tocco nella pagina Ordini.
 */
export function OrderCompactList({
  orders,
  statusConfig,
  formatCurrency,
  dateField = "data_ordine",
  showAzienda = true,
  className,
}: Props) {
  return (
    <ul className={cn("divide-y rounded-lg border", className)}>
      {orders.map((o) => {
        const raw = dateField === "data_ordine" ? o.data_ordine || o.created_at : o.created_at;
        const status = statusConfig[o.status];
        const righe = o.ordini_righe?.length ?? 0;
        const meta = [
          format(new Date(raw), "d MMM yyyy", { locale: it }),
          showAzienda ? o.aziende?.nome : null,
          righe ? `${righe} ${righe === 1 ? "prodotto" : "prodotti"}` : null,
        ].filter(Boolean).join(" · ");
        return (
          <li key={o.id}>
            <Link
              to={`/ordini?ordine=${o.id}&storico=1`}
              className="flex min-h-11 items-center gap-3 px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium tabular-nums text-primary">{o.codice || "—"}</p>
                <p className="truncate text-xs text-muted-foreground">{meta}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="text-sm font-semibold tabular-nums">{formatCurrency(Number(o.totale))}</span>
                <Badge className={status?.className}>{status?.label || o.status}</Badge>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
