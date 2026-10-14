import { SectionCard } from "@/components/dashboard/SectionCard";
import { aziendaColorValue, type AziendaColorMap } from "@/lib/aziendaColor";
import { formatCurrency } from "./kpiShared";
import type { ClienteKPI } from "@/hooks/useAdvancedKPIStats";

interface ClientRevenueCardsProps {
  clienti: ClienteKPI[];
  yearPrev?: number;
  aziendaColorMap?: AziendaColorMap;
  /** Fatturato a/p sugli stessi filtri e periodo equivalente. */
  prevById?: Map<string, number>;
}

// Sostituisce la vecchia tabella larga (scroll orizzontale su mobile): una
// card per cliente con una barra a segmenti che spezza il totale nei colori
// identità delle aziende fornitrici, invece di colonne fisse.
export function ClientRevenueCards({ clienti, yearPrev, aziendaColorMap, prevById }: ClientRevenueCardsProps) {
  if (clienti.length === 0) {
    return <SectionCard className="p-8 text-center text-scatto-muted">Nessun cliente trovato</SectionCard>;
  }

  return (
    <div className="space-y-3">
      {clienti.map((cliente) => {
        const fat2025 = prevById ? prevById.get(cliente.id) || 0 : 0;
        const variazione = fat2025 > 0 ? ((cliente.fatturato - fat2025) / fat2025) * 100 : null;
        const totaleSegmenti = cliente.perAzienda.reduce((s, a) => s + a.fatturato, 0) || 1;

        return (
          <SectionCard key={cliente.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 break-words text-sm font-semibold text-scatto-ink">{cliente.nome}</p>
              <p className="flex-shrink-0 font-display text-base font-bold tabular-nums tracking-tight text-scatto-ink">
                {formatCurrency(cliente.fatturato)}
              </p>
            </div>
            <p className="mt-0.5 text-xs text-scatto-muted">
              {cliente.ordini_count} {cliente.ordini_count === 1 ? "ordine" : "ordini"}
              {variazione !== null && (
                <>
                  {" · "}
                  <span className={variazione >= 0 ? "font-semibold text-scatto-success" : "font-semibold text-scatto-danger"}>
                    {variazione >= 0 ? "+" : ""}
                    {variazione.toFixed(0)}% vs {yearPrev ?? "anno prec."}
                  </span>
                </>
              )}
            </p>

            {cliente.perAzienda.length > 0 && (
              <>
                <div className="mt-3 flex h-3.5 overflow-hidden rounded-full bg-scatto-ink/[0.06]">
                  {cliente.perAzienda.map((a) => (
                    <span
                      key={a.aziendaId}
                      style={{
                        width: `${(a.fatturato / totaleSegmenti) * 100}%`,
                        backgroundColor: aziendaColorValue(a.aziendaId, aziendaColorMap),
                      }}
                    />
                  ))}
                </div>
                <div className="mt-2.5 flex flex-wrap gap-x-3.5 gap-y-1 text-xs text-scatto-muted">
                  {cliente.perAzienda.map((a) => (
                    <span key={a.aziendaId} className="inline-flex items-center gap-1.5">
                      <span
                        className="h-2 w-2 flex-shrink-0 rounded-sm"
                        style={{ backgroundColor: aziendaColorValue(a.aziendaId, aziendaColorMap) }}
                      />
                      <span className="break-words">{a.aziendaNome}</span> <b className="font-display font-semibold text-scatto-ink">{formatCurrency(a.fatturato)}</b>
                    </span>
                  ))}
                </div>
              </>
            )}
          </SectionCard>
        );
      })}
    </div>
  );
}
