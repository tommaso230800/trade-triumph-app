import { SectionCard } from "@/components/dashboard/SectionCard";
import { formatCurrency } from "./kpiShared";

interface RipartizioniHighlightsProps {
  aziendaTop: { nome: string; fatturato_totale: number } | null;
  prodottoTop: { nome: string; fatturato_totale: number } | null;
  fatturatoTotale: number;
}

export function RipartizioniHighlights({ aziendaTop, prodottoTop, fatturatoTotale }: RipartizioniHighlightsProps) {
  const quotaAzienda = aziendaTop && fatturatoTotale > 0 ? (aziendaTop.fatturato_totale / fatturatoTotale) * 100 : 0;

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <SectionCard>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-scatto-muted">Azienda top</p>
        {aziendaTop ? (
          <>
            <p className="mt-1.5 truncate font-display text-base font-bold text-scatto-ink">{aziendaTop.nome}</p>
            <p className="mt-2 font-display text-2xl font-bold tabular-nums tracking-tight text-scatto-info">
              {formatCurrency(aziendaTop.fatturato_totale)}
            </p>
            <p className="mt-1.5 text-[11px] text-scatto-muted">{quotaAzienda.toFixed(0)}% del fatturato totale</p>
          </>
        ) : (
          <p className="mt-2 text-sm text-scatto-muted">Nessun dato disponibile</p>
        )}
      </SectionCard>

      <SectionCard>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-scatto-muted">Prodotto top</p>
        {prodottoTop ? (
          <>
            <p className="mt-1.5 truncate font-display text-base font-bold text-scatto-ink">{prodottoTop.nome}</p>
            <p className="mt-2 font-display text-2xl font-bold tabular-nums tracking-tight text-scatto-violet">
              {formatCurrency(prodottoTop.fatturato_totale)}
            </p>
            <p className="mt-1.5 text-[11px] text-scatto-muted">il prodotto più venduto</p>
          </>
        ) : (
          <p className="mt-2 text-sm text-scatto-muted">Nessun dato disponibile</p>
        )}
      </SectionCard>
    </div>
  );
}
