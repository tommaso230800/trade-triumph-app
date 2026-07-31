import { aziendaDotClass, type AziendaColorIndexMap } from "@/lib/aziendaColor";
import { formatCurrency } from "./kpiShared";
import type { ClienteKPI } from "@/hooks/useAdvancedKPIStats";

interface ClientRevenueCardsProps {
  clienti: ClienteKPI[];
  yearPrev?: number;
  aziendaColorMap?: AziendaColorIndexMap;
}

// Sostituisce la vecchia tabella larga (scroll orizzontale su mobile): una
// card per cliente con una barra a segmenti che spezza il totale nei colori
// identità delle aziende fornitrici, invece di colonne fisse.
export function ClientRevenueCards({ clienti, yearPrev, aziendaColorMap }: ClientRevenueCardsProps) {
  if (clienti.length === 0) {
    return (
      <div className="rounded-xl bg-card p-8 text-center text-muted-foreground shadow-card">
        Nessun cliente trovato
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {clienti.map((cliente) => {
        const fat2025 = cliente.fatturato_2025 || 0;
        const variazione = fat2025 > 0 ? ((cliente.fatturato - fat2025) / fat2025) * 100 : null;
        const totaleSegmenti = cliente.perAzienda.reduce((s, a) => s + a.fatturato, 0) || 1;

        return (
          <div key={cliente.id} className="rounded-xl bg-card p-4 shadow-card">
            <div className="flex items-baseline justify-between gap-3">
              <p className="truncate text-[15px] font-semibold text-foreground">{cliente.nome}</p>
              <p className="flex-shrink-0 font-display text-base font-bold tabular-nums tracking-tight text-foreground">
                {formatCurrency(cliente.fatturato)}
              </p>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {cliente.ordini_count} {cliente.ordini_count === 1 ? "ordine" : "ordini"}
              {variazione !== null && (
                <>
                  {" · "}
                  <span className={variazione >= 0 ? "font-semibold text-success" : "font-semibold text-destructive"}>
                    {variazione >= 0 ? "+" : ""}
                    {variazione.toFixed(0)}% vs {yearPrev ?? "anno prec."}
                  </span>
                </>
              )}
            </p>

            {cliente.perAzienda.length > 0 && (
              <>
                <div className="mt-3 flex h-3.5 overflow-hidden rounded-full bg-muted">
                  {cliente.perAzienda.map((a) => (
                    <span
                      key={a.aziendaId}
                      className={aziendaDotClass(a.aziendaId, aziendaColorMap)}
                      style={{ width: `${(a.fatturato / totaleSegmenti) * 100}%` }}
                    />
                  ))}
                </div>
                <div className="mt-2.5 flex flex-wrap gap-x-3.5 gap-y-1 text-xs text-muted-foreground">
                  {cliente.perAzienda.map((a) => (
                    <span key={a.aziendaId} className="inline-flex items-center gap-1.5">
                      <span className={`h-2 w-2 flex-shrink-0 rounded-sm ${aziendaDotClass(a.aziendaId, aziendaColorMap)}`} />
                      {a.aziendaNome} <b className="font-display font-semibold text-foreground">{formatCurrency(a.fatturato)}</b>
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
