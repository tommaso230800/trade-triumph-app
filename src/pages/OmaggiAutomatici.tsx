import { useMemo, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useOmaggiSpettanti, useRegistraOmaggio } from "@/hooks/useOmaggiAutomatici";
import { useClienti } from "@/hooks/useClienti";
import { useProdotti } from "@/hooks/useProdotti";
import { Gift, Search, TrendingUp } from "lucide-react";
import { OmaggioSpettante } from "@/lib/omaggiEngine";

export default function OmaggiAutomatici() {
  const { data: spettanti = [], isLoading } = useOmaggiSpettanti();
  const { data: clienti = [] } = useClienti();
  const { data: prodotti = [] } = useProdotti();
  const registra = useRegistraOmaggio();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<OmaggioSpettante | null>(null);
  const [qta, setQta] = useState<number>(0);
  const [note, setNote] = useState("");

  const clientMap = useMemo(() => Object.fromEntries(clienti.map((c: any) => [c.id, c])), [clienti]);
  const prodMap = useMemo(() => Object.fromEntries(prodotti.map((p: any) => [p.id, p])), [prodotti]);

  const filtered = useMemo(() => {
    if (!search.trim()) return spettanti;
    const t = search.toLowerCase();
    return spettanti.filter((s) => {
      const c = clientMap[s.cliente_id];
      const p = prodMap[s.prodotto_id];
      return (
        c?.nome?.toLowerCase().includes(t) ||
        c?.azienda?.toLowerCase().includes(t) ||
        p?.nome?.toLowerCase().includes(t) ||
        s.regola_nome?.toLowerCase().includes(t)
      );
    });
  }, [spettanti, search, clientMap, prodMap]);

  const kpi = useMemo(() => {
    const conResidui = spettanti.filter((s) => s.spettanti_residui > 0);
    const totResidui = conResidui.reduce((s, r) => s + r.spettanti_residui, 0);
    const clientiCoinvolti = new Set(conResidui.map((r) => r.cliente_id)).size;
    return { totResidui, clientiCoinvolti, righe: conResidui.length };
  }, [spettanti]);

  const openRegistra = (s: OmaggioSpettante) => {
    setSelected(s);
    setQta(s.spettanti_residui);
    setNote("");
  };

  const confirmRegistra = async () => {
    if (!selected || qta <= 0) return;
    await registra.mutateAsync({
      cliente_id: selected.cliente_id,
      prodotto_id: selected.prodotto_id,
      promo_id: selected.sorgente === "promo" ? selected.regola_id : null,
      contratto_id: selected.sorgente === "contratto" ? selected.regola_id : null,
      quantita: qta,
      unita: selected.unita,
      note: note || null,
    });
    setSelected(null);
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-rise-in">
        <div>
          <h1 className="text-heading-lg font-display font-bold flex items-center gap-3">
            <Gift className="h-7 w-7 text-primary" /> Omaggi automatici
          </h1>
          <p className="text-body-sm text-muted-foreground mt-1">
            Calcolo deterministico degli omaggi spettanti in base a promo/contratti attivi (es. 80+4). Applicazione sempre manuale.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <KpiCard label="Omaggi da erogare" value={kpi.totResidui} tone="green" />
          <KpiCard label="Clienti coinvolti" value={kpi.clientiCoinvolti} tone="blue" />
          <KpiCard label="Righe attive" value={kpi.righe} tone="primary" />
        </div>

        <Card className="surface-noir">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
              <CardTitle className="text-base">Elenco spettanze</CardTitle>
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Cerca cliente, prodotto, promo..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Caricamento...</p>
            ) : filtered.length === 0 ? (
              <div className="text-center py-10">
                <Gift className="h-10 w-10 mx-auto text-muted-foreground/60 mb-2" />
                <p className="text-sm text-muted-foreground">
                  Nessuna spettanza calcolata. Imposta <strong>qta base + qta omaggio</strong> nelle promo o nei contratti (es. 80+4) e ordina i relativi prodotti.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map((s) => {
                  const c = clientMap[s.cliente_id];
                  const p = prodMap[s.prodotto_id];
                  return (
                    <div key={`${s.regola_id}-${s.cliente_id}-${s.prodotto_id}`}
                         className="rounded-xl border border-border/60 bg-card/60 p-3 space-y-2 hover-lift">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className={s.sorgente === "promo" ? "bg-blue-500/10 text-blue-500 border-blue-500/30" : "bg-purple-500/10 text-purple-500 border-purple-500/30"}>
                              {s.sorgente === "promo" ? "Promo" : "Contratto"}
                            </Badge>
                            <span className="text-xs text-muted-foreground truncate">{s.regola_nome}</span>
                          </div>
                          <div className="text-sm font-semibold mt-1 truncate">
                            {c?.nome || "Cliente"}{c?.azienda ? ` · ${c.azienda}` : ""}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {p?.nome || "Prodotto"} · Regola {s.qta_base}+{s.qta_omaggio} {s.unita}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs text-muted-foreground">Residui</div>
                          <div className={`text-2xl font-bold ${s.spettanti_residui > 0 ? "text-emerald-500" : "text-muted-foreground"}`}>
                            {s.spettanti_residui}
                          </div>
                          <div className="text-[10px] text-muted-foreground">di {s.spettanti_totali} totali</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <div className="text-muted-foreground">Acquistato</div>
                          <div className="font-semibold">{s.acquistato.toFixed(1)} {s.unita}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Già erogati</div>
                          <div className="font-semibold">{s.gia_erogati}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Prossimo scaglione</div>
                          <div className="font-semibold flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            -{s.mancano_al_prossimo.toFixed(0)}
                          </div>
                        </div>
                      </div>
                      <Progress value={s.progresso_prossimo_pct} className="h-1.5" />
                      <div className="flex justify-end">
                        <Button size="sm" onClick={() => openRegistra(s)} disabled={s.spettanti_residui <= 0}>
                          <Gift className="h-4 w-4 mr-1" /> Registra erogazione
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registra omaggio erogato</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                {clientMap[selected.cliente_id]?.nome} · {prodMap[selected.prodotto_id]?.nome}
              </div>
              <div>
                <Label>Quantità ({selected.unita})</Label>
                <Input type="number" min={1} max={selected.spettanti_residui} value={qta} onChange={(e) => setQta(Number(e.target.value))} />
                <p className="text-xs text-muted-foreground mt-1">Max residui: {selected.spettanti_residui}</p>
              </div>
              <div>
                <Label>Note</Label>
                <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ordine collegato, motivo, ..." />
              </div>
              <DialogFooter>
                <Button onClick={confirmRegistra} disabled={registra.isPending || qta <= 0}>
                  {registra.isPending ? "Salvo..." : "Conferma"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}

function KpiCard({ label, value, tone }: { label: string; value: number; tone: "green" | "blue" | "primary" }) {
  const cls = tone === "green" ? "text-emerald-500" : tone === "blue" ? "text-blue-500" : "text-primary";
  return (
    <Card className="surface-glass">
      <CardContent className="p-4">
        <div className={`text-xs uppercase tracking-wide ${cls}`}>{label}</div>
        <div className={`text-3xl font-bold mt-1 ${cls}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
