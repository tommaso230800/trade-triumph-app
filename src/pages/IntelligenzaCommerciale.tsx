import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, TrendingUp, TrendingDown, Users, Calculator, Sparkles, ShieldAlert, Target } from "lucide-react";
import { useCommercialIntelligence } from "@/hooks/useCommercialIntelligence";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

const eur = (n: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n || 0);
const pct = (n: number) => `${(n || 0).toFixed(1)}%`;

const SEG_COLORS: Record<string, string> = {
  Campioni: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  Fedeli: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  Potenziali: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
  Nuovi: "bg-violet-500/20 text-violet-300 border-violet-500/40",
  "Da riattivare": "bg-amber-500/20 text-amber-300 border-amber-500/40",
  "A rischio": "bg-orange-500/20 text-orange-300 border-orange-500/40",
  Persi: "bg-red-500/20 text-red-300 border-red-500/40",
  Occasionali: "bg-muted text-muted-foreground border-border",
};

const SEV_COLORS: Record<string, string> = {
  critica: "bg-red-500/20 text-red-300 border-red-500/40",
  alta: "bg-orange-500/20 text-orange-300 border-orange-500/40",
  media: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  info: "bg-muted text-muted-foreground border-border",
};

export default function IntelligenzaCommerciale() {
  const [aziendaFilter, setAziendaFilter] = useState<string>("all");
  const [segFilter, setSegFilter] = useState<string>("all");
  const [sevFilter, setSevFilter] = useState<string>("all");
  const [searchProd, setSearchProd] = useState("");
  const [searchCli, setSearchCli] = useState("");
  const { data, isLoading } = useCommercialIntelligence(aziendaFilter);

  const filteredAnomalies = useMemo(() => {
    if (!data) return [];
    return data.priceCtrl.anomalies.filter((a) => {
      if (sevFilter !== "all" && a.severita !== sevFilter) return false;
      if (searchProd) {
        const p = data.prodMap.get(a.prodotto_id);
        const c = data.cliMap.get(a.cliente_id);
        const q = searchProd.toLowerCase();
        if (
          !(p?.nome?.toLowerCase().includes(q) ||
            p?.codice?.toLowerCase().includes(q) ||
            c?.nome?.toLowerCase().includes(q))
        )
          return false;
      }
      return true;
    });
  }, [data, sevFilter, searchProd]);

  const filteredRfm = useMemo(() => {
    if (!data) return [];
    return data.rfm.filter((r) => {
      if (segFilter !== "all" && r.segmento !== segFilter) return false;
      if (searchCli) {
        const c = data.cliMap.get(r.cliente_id);
        const q = searchCli.toLowerCase();
        if (!(c?.nome?.toLowerCase().includes(q) || c?.azienda?.toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [data, segFilter, searchCli]);

  const segCounts = useMemo(() => {
    if (!data) return {};
    return data.rfm.reduce<Record<string, number>>((acc, r) => {
      acc[r.segmento] = (acc[r.segmento] || 0) + 1;
      return acc;
    }, {});
  }, [data]);

  const sevCounts = useMemo(() => {
    if (!data) return { critica: 0, alta: 0, media: 0 };
    return data.priceCtrl.anomalies.reduce(
      (acc, a) => ({ ...acc, [a.severita]: (acc as any)[a.severita] + 1 || 1 }),
      { critica: 0, alta: 0, media: 0 } as any
    );
  }, [data]);

  return (
    <div className="p-4 md:p-6 space-y-6 animate-rise-in">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-primary" />
            Intelligenza Commerciale
          </h1>
          <p className="text-sm text-muted-foreground">
            Controllo prezzi, segmentazione clienti (RFM) e simulatore di chiusura mese
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={aziendaFilter} onValueChange={setAziendaFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Azienda" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte le aziende</SelectItem>
              {data?.aziende.map((a: any) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="simulatore" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="simulatore" className="gap-2">
            <Calculator className="w-4 h-4" /> Simulatore Mese
          </TabsTrigger>
          <TabsTrigger value="prezzi" className="gap-2">
            <ShieldAlert className="w-4 h-4" /> Controllo Prezzi
          </TabsTrigger>
          <TabsTrigger value="clienti" className="gap-2">
            <Users className="w-4 h-4" /> Classificazione Clienti
          </TabsTrigger>
        </TabsList>

        {/* SIMULATORE */}
        <TabsContent value="simulatore" className="space-y-4">
          {isLoading || !data ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">Caricamento…</CardContent></Card>
          ) : (
            <>
              <Card className="surface-glass">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span>Chiusura {data.monthSim.mese}</span>
                    <Badge variant="outline">
                      Giorno {data.monthSim.giorni_trascorsi}/{data.monthSim.giorni_totali} · {data.monthSim.giorni_rimanenti} rimanenti
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid md:grid-cols-3 gap-6">
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Fatturato MTD</div>
                    <div className="text-2xl font-bold">{eur(data.monthSim.fatturato_mtd)}</div>
                    <div className="text-xs text-muted-foreground">{data.monthSim.ordini_mtd} ordini</div>
                    <Progress
                      value={(data.monthSim.giorni_trascorsi / data.monthSim.giorni_totali) * 100}
                      className="h-2 mt-3"
                    />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Previsione fine mese</div>
                    <div className="text-2xl font-bold text-primary">{eur(data.monthSim.fatturato_previsto)}</div>
                    <div className="text-xs text-muted-foreground">
                      pace {eur(data.monthSim.fatturato_pace)} · storico {eur(data.monthSim.fatturato_storico)}
                    </div>
                    <div className="text-xs mt-2">
                      Ordini previsti: <span className="font-medium">{data.monthSim.ordini_previsti}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Provvigioni previste</div>
                    <div className="text-2xl font-bold text-emerald-400">{eur(data.monthSim.provvigioni_previste)}</div>
                    <div className="text-xs text-muted-foreground">
                      aliquota media {pct(data.monthSim.aliquota_media_prevista)}
                    </div>
                    <div className="text-xs mt-2">
                      MTD: {eur(data.monthSim.provvigioni_mtd)}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      {data.monthSim.delta_yoy_pct >= 0 ? (
                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-400" />
                      )}
                      YoY vs stesso mese anno precedente
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      <span className={data.monthSim.delta_yoy_pct >= 0 ? "text-emerald-400" : "text-red-400"}>
                        {data.monthSim.delta_yoy_pct >= 0 ? "+" : ""}
                        {pct(data.monthSim.delta_yoy_pct)}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Anno precedente: {eur(data.monthSim.fatturato_stesso_mese_anno_prec)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      {data.monthSim.delta_mom_pct >= 0 ? (
                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-400" />
                      )}
                      MoM vs mese precedente
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      <span className={data.monthSim.delta_mom_pct >= 0 ? "text-emerald-400" : "text-red-400"}>
                        {data.monthSim.delta_mom_pct >= 0 ? "+" : ""}
                        {pct(data.monthSim.delta_mom_pct)}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Mese precedente: {eur(data.monthSim.fatturato_mese_precedente)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Target className="w-4 h-4" /> Come è calcolata la previsione
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-1">
                  <p>• <b>Pace lineare</b>: fatturato MTD proiettato sui giorni totali del mese.</p>
                  <p>• <b>Storico</b>: media delle ultime 3 occorrenze dello stesso mese.</p>
                  <p>• <b>Blended</b>: 60% pace + 40% storico (se disponibile).</p>
                  <p>• <b>Provvigioni</b>: aliquota media effettiva del mese × fatturato previsto.</p>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* CONTROLLO PREZZI */}
        <TabsContent value="prezzi" className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {(["critica", "alta", "media"] as const).map((s) => (
              <Card key={s} className={cn("surface-noir", sevFilter === s && "ring-2 ring-primary")}>
                <CardContent className="p-4 cursor-pointer" onClick={() => setSevFilter(sevFilter === s ? "all" : s)}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs uppercase text-muted-foreground">{s}</div>
                      <div className="text-2xl font-bold">{(sevCounts as any)[s] || 0}</div>
                    </div>
                    <AlertTriangle className={cn("w-6 h-6", s === "critica" ? "text-red-400" : s === "alta" ? "text-orange-400" : "text-amber-400")} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Cerca prodotto o cliente…"
              value={searchProd}
              onChange={(e) => setSearchProd(e.target.value)}
              className="max-w-md"
            />
            <Select value={sevFilter} onValueChange={setSevFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte severità</SelectItem>
                <SelectItem value="critica">Critica</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="media">Media</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Anomalie di prezzo</CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {isLoading ? (
                <div className="p-6 text-center text-muted-foreground">Caricamento…</div>
              ) : filteredAnomalies.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">Nessuna anomalia rilevata.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Severità</TableHead>
                      <TableHead>Prodotto</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Netto</TableHead>
                      <TableHead className="text-right">Media</TableHead>
                      <TableHead className="text-right">Δ</TableHead>
                      <TableHead className="text-right">Sconto</TableHead>
                      <TableHead>Motivo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAnomalies.slice(0, 200).map((a, i) => {
                      const p = data?.prodMap.get(a.prodotto_id);
                      const c = data?.cliMap.get(a.cliente_id);
                      return (
                        <TableRow key={`${a.ordine_id}-${a.prodotto_id}-${i}`}>
                          <TableCell>
                            <Badge variant="outline" className={SEV_COLORS[a.severita]}>
                              {a.severita}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">{p?.nome || a.prodotto_id.slice(0, 8)}</TableCell>
                          <TableCell>
                            {c ? (
                              <Link to={`/clienti/${a.cliente_id}`} className="hover:text-primary">
                                {c.nome}
                              </Link>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell>{a.data_ordine?.slice(0, 10)}</TableCell>
                          <TableCell className="text-right">€ {a.prezzo_netto.toFixed(3)}</TableCell>
                          <TableCell className="text-right text-muted-foreground">€ {a.media_netto_prodotto.toFixed(3)}</TableCell>
                          <TableCell className={cn("text-right font-medium", a.scostamento_pct < 0 ? "text-red-400" : "text-emerald-400")}>
                            {a.scostamento_pct > 0 ? "+" : ""}{a.scostamento_pct.toFixed(1)}%
                          </TableCell>
                          <TableCell className="text-right">{a.sconto_totale_pct.toFixed(1)}%</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{a.motivo}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* RFM */}
        <TabsContent value="clienti" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(segCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([seg, count]) => (
                <Card
                  key={seg}
                  className={cn("cursor-pointer surface-noir", segFilter === seg && "ring-2 ring-primary")}
                  onClick={() => setSegFilter(segFilter === seg ? "all" : seg)}
                >
                  <CardContent className="p-4">
                    <Badge variant="outline" className={cn("mb-2", SEG_COLORS[seg])}>{seg}</Badge>
                    <div className="text-2xl font-bold">{count}</div>
                    <div className="text-xs text-muted-foreground">clienti</div>
                  </CardContent>
                </Card>
              ))}
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Cerca cliente…"
              value={searchCli}
              onChange={(e) => setSearchCli(e.target.value)}
              className="max-w-md"
            />
            <Select value={segFilter} onValueChange={setSegFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti segmenti</SelectItem>
                {Object.keys(SEG_COLORS).map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Clienti — RFM</CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {isLoading ? (
                <div className="p-6 text-center text-muted-foreground">Caricamento…</div>
              ) : filteredRfm.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">Nessun cliente.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Segmento</TableHead>
                      <TableHead className="text-center">R</TableHead>
                      <TableHead className="text-center">F</TableHead>
                      <TableHead className="text-center">M</TableHead>
                      <TableHead className="text-right">Recency</TableHead>
                      <TableHead className="text-right">Ordini</TableHead>
                      <TableHead className="text-right">Fatturato</TableHead>
                      <TableHead className="text-right">Ultimo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRfm.slice(0, 300).map((r) => {
                      const c = data?.cliMap.get(r.cliente_id);
                      return (
                        <TableRow key={r.cliente_id}>
                          <TableCell className="font-medium">
                            <Link to={`/clienti/${r.cliente_id}`} className="hover:text-primary">
                              {c?.nome || r.cliente_id.slice(0, 8)}
                            </Link>
                            {c?.azienda && <div className="text-xs text-muted-foreground">{c.azienda}</div>}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={SEG_COLORS[r.segmento]}>{r.segmento}</Badge>
                          </TableCell>
                          <TableCell className="text-center font-mono">{r.r_score}</TableCell>
                          <TableCell className="text-center font-mono">{r.f_score}</TableCell>
                          <TableCell className="text-center font-mono">{r.m_score}</TableCell>
                          <TableCell className="text-right">
                            <span className={r.recency_giorni > 90 ? "text-orange-400" : ""}>
                              {r.recency_giorni}g
                            </span>
                          </TableCell>
                          <TableCell className="text-right">{r.frequency}</TableCell>
                          <TableCell className="text-right font-medium">{eur(r.monetary)}</TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground">
                            {r.ultimo_ordine?.slice(0, 10)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
