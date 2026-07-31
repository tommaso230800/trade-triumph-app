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
      <div className="rounded-2xl bg-primary p-4 text-primary-foreground shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">Azienda top</p>
        {aziendaTop ? (
          <>
            <p className="mt-1.5 truncate font-display text-base font-bold">{aziendaTop.nome}</p>
            <p className="mt-2 font-display text-2xl font-bold tabular-nums tracking-tight">
              {formatCurrency(aziendaTop.fatturato_totale)}
            </p>
            <p className="mt-1.5 text-[11px] opacity-80">{quotaAzienda.toFixed(0)}% del fatturato totale</p>
          </>
        ) : (
          <p className="mt-2 text-sm opacity-80">Nessun dato disponibile</p>
        )}
      </div>

      <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Prodotto top</p>
        {prodottoTop ? (
          <>
            <p className="mt-1.5 truncate font-display text-base font-bold text-foreground">{prodottoTop.nome}</p>
            <p className="mt-2 font-display text-2xl font-bold tabular-nums tracking-tight text-primary">
              {formatCurrency(prodottoTop.fatturato_totale)}
            </p>
            <p className="mt-1.5 text-[11px] text-muted-foreground">il prodotto più venduto</p>
          </>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">Nessun dato disponibile</p>
        )}
      </div>
    </div>
  );
}
