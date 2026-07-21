import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle, TrendingUp, TrendingDown, Users, Calculator, Sparkles, ShieldAlert,
  Target, LayoutDashboard, Package, ShoppingCart, Wallet, Lightbulb, Check, X,
} from "lucide-react";
import { useCommercialIntelligence } from "@/hooks/useCommercialIntelligence";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const eur = (n: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n || 0);
const eur2 = (n: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(n || 0);
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

const STATUS_COLORS: Record<string, string> = {
  bozza: "bg-muted text-muted-foreground",
  da_confermare: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  stand_by: "bg-orange-500/20 text-orange-300 border-orange-500/40",
  confermato: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  evaso: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  annullato: "bg-red-500/20 text-red-300 border-red-500/40",
};

export default function IntelligenzaCommerciale() {
  const { user } = useAuth();
  const [aziendaFilter, setAziendaFilter] = useState<string>("all");
  const [segFilter, setSegFilter] = useState<string>("all");
  const [sevFilter, setSevFilter] = useState<string>("all");
  const [searchProd, setSearchProd] = useState("");
  const [searchCli, setSearchCli] = useState("");
  const [tab, setTab] = useState("panoramica");

  const { data, isLoading } = useCommercialIntelligence(aziendaFilter);

  // Scadenziario summary (competenza vs pagamento)
  const { data: scad = [] } = useQuery({
    queryKey: ["ic-scadenziario", aziendaFilter],
    queryFn: async () => {
      let q = supabase
        .from("scadenziario_fatture")
        .select("id, azienda_id, importo, provvigione_calcolata, stato_provvigione, anno_competenza, trimestre_competenza, anno_pagamento, trimestre_pagamento, data_fattura, data_incasso_provvigione");
      if (aziendaFilter !== "all") q = q.eq("azienda_id", aziendaFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    staleTime: 60_000,
  });

  // Resolved anomalies to hide them
  const { data: resolvedAnomalies = [] } = useQuery({
    queryKey: ["price-anomalies-resolved", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("price_anomalies_resolved")
        .select("anomaly_key, azione");
      return data || [];
    },
    enabled: !!user,
    staleTime: 30_000,
  });
  const resolvedSet = useMemo(
    () => new Set(resolvedAnomalies.map((r: any) => r.anomaly_key)),
    [resolvedAnomalies]
  );

  const anomalyKey = (a: any) => `${a.ordine_id}|${a.prodotto_id}|${a.cliente_id}|${a.severita}`;

  const filteredAnomalies = useMemo(() => {
    if (!data) return [];
    return data.priceCtrl.anomalies.filter((a) => {
      if (resolvedSet.has(anomalyKey(a))) return false;
      if (sevFilter !== "all" && a.severita !== sevFilter) return false;
      if (searchProd) {
        const p = data.prodMap.get(a.prodotto_id);
        const c = data.cliMap.get(a.cliente_id);
        const q = searchProd.toLowerCase();
        if (!(p?.nome?.toLowerCase().includes(q) || p?.codice?.toLowerCase().includes(q) || c?.nome?.toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [data, sevFilter, searchProd, resolvedSet]);

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
    if (!data) return {} as Record<string, number>;
    return data.rfm.reduce<Record<string, number>>((acc, r) => {
      acc[r.segmento] = (acc[r.segmento] || 0) + 1;
      return acc;
    }, {});
  }, [data]);

  const sevCounts = useMemo(() => {
    if (!data) return { critica: 0, alta: 0, media: 0 } as Record<string, number>;
    return filteredAnomalies.reduce<Record<string, number>>(
      (acc, a) => ({ ...acc, [a.severita]: (acc[a.severita] || 0) + 1 }),
      { critica: 0, alta: 0, media: 0 }
    );
  }, [filteredAnomalies]);

  // Prodotti stats — top revenue/volume
  const productStats = useMemo(() => {
    if (!data) return [] as any[];
    const map = new Map<string, { fatt: number; qta_pz: number; qta_ct: number; clienti: Set<string>; ordini: Set<string> }>();
    for (const r of data.righeIC) {
      if (r.is_omaggio) continue;
      const key = r.prodotto_id;
      const cur = map.get(key) || { fatt: 0, qta_pz: 0, qta_ct: 0, clienti: new Set<string>(), ordini: new Set<string>() };
      const netto = r.prezzo_unitario * (1 - r.sc1 / 100) * (1 - r.sc2 / 100) * (1 - r.sc3 / 100);
      cur.fatt += netto * r.quantita_pezzi;
      cur.qta_pz += r.quantita_pezzi;
      cur.qta_ct += r.quantita_cartoni;
      if (r.cliente_id) cur.clienti.add(r.cliente_id);
      cur.ordini.add(r.ordine_id);
      map.set(key, cur);
    }
    return Array.from(map.entries())
      .map(([prodotto_id, v]) => ({
        prodotto_id,
        fatturato: v.fatt,
        quantita_pezzi: v.qta_pz,
        quantita_cartoni: v.qta_ct,
        clienti_distinti: v.clienti.size,
        ordini: v.ordini.size,
      }))
      .sort((a, b) => b.fatturato - a.fatturato);
  }, [data]);

  const filteredProducts = useMemo(() => {
    if (!data || !searchProd) return productStats;
    const q = searchProd.toLowerCase();
    return productStats.filter((p) => {
      const prod = data.prodMap.get(p.prodotto_id);
      return prod?.nome?.toLowerCase().includes(q) || prod?.codice?.toLowerCase().includes(q);
    });
  }, [productStats, data, searchProd]);

  // Ordini per stato
  const ordersByStatus = useMemo(() => {
    if (!data) return {} as Record<string, { n: number; totale: number }>;
    const acc: Record<string, { n: number; totale: number }> = {};
    for (const o of data.ordiniIC) {
      const s = o.status || "bozza";
      const cur = acc[s] || { n: 0, totale: 0 };
      cur.n += 1;
      cur.totale += o.totale || 0;
      acc[s] = cur;
    }
    return acc;
  }, [data]);

  // Provvigioni per competenza / pagamento
  const provvByQuarter = useMemo(() => {
    const bucket = (key: "competenza" | "pagamento") => {
      const map = new Map<string, { n: number; provvigione: number; importo: number }>();
      for (const s of scad) {
        const a = key === "competenza" ? s.anno_competenza : s.anno_pagamento;
        const t = key === "competenza" ? s.trimestre_competenza : s.trimestre_pagamento;
        if (!a || !t) continue;
        const k = `${a}-Q${t}`;
        const cur = map.get(k) || { n: 0, provvigione: 0, importo: 0 };
        cur.n += 1;
        cur.provvigione += Number(s.provvigione_calcolata || 0);
        cur.importo += Number(s.importo || 0);
        map.set(k, cur);
      }
      return Array.from(map.entries())
        .map(([q, v]) => ({ q, ...v }))
        .sort((a, b) => (a.q < b.q ? 1 : -1));
    };
    return { competenza: bucket("competenza"), pagamento: bucket("pagamento") };
  }, [scad]);

  const provvByStato = useMemo(() => {
    const acc: Record<string, { n: number; provvigione: number }> = {};
    for (const s of scad) {
      const st = s.stato_provvigione || "da_pagare";
      const cur = acc[st] || { n: 0, provvigione: 0 };
      cur.n += 1;
      cur.provvigione += Number(s.provvigione_calcolata || 0);
      acc[st] = cur;
    }
    return acc;
  }, [scad]);

  // Opportunità (top segmenti+cross-sell)
  const opportunita = useMemo(() => {
    if (!data) return [] as any[];
    const daRiattivare = data.rfm.filter((r) => r.segmento === "Da riattivare" || r.segmento === "A rischio");
    return daRiattivare
      .map((r) => ({
        ...r,
        potenziale: r.monetary / Math.max(1, r.frequency), // ordine medio storico
        cliente: data.cliMap.get(r.cliente_id),
      }))
      .sort((a, b) => b.potenziale - a.potenziale)
      .slice(0, 100);
  }, [data]);

  const resolveAnomaly = async (a: any, azione: "verificato" | "escluso") => {
    if (!user) return;
    const p = data?.prodMap.get(a.prodotto_id);
    const c = data?.cliMap.get(a.cliente_id);
    const { error } = await supabase.from("price_anomalies_resolved").insert({
      user_id: user.id,
      anomaly_key: anomalyKey(a),
      ordine_id: a.ordine_id,
      cliente_id: a.cliente_id,
      prodotto_id: a.prodotto_id,
      azienda_id: a.azienda_id,
      tipo: a.severita,
      azione,
      motivo: `${p?.nome || ""} — ${c?.nome || ""}`,
    });
    if (error) {
      toast.error("Errore: " + error.message);
      return;
    }
    toast.success(`Anomalia ${azione === "verificato" ? "verificata" : "esclusa"}`);
    // manual refetch — invalidate would need queryClient wire; simple reload of query key isn't exposed here
    (window as any).location && (window as any).dispatchEvent(new Event("focus"));
  };

  // Panoramica totals
  const totFatturato = data?.ordiniIC.reduce((s, o) => s + (o.totale || 0), 0) || 0;
  const totOrdini = data?.ordiniIC.length || 0;
  const totProvvigione = data?.ordiniIC.reduce((s, o) => s + (o.provvigione_prevista || 0), 0) || 0;
  const totClienti = data?.rfm.length || 0;
  const totAnomalie = filteredAnomalies.length;

  return (
    <div className="p-4 md:p-6 space-y-6 animate-rise-in pb-24">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-primary" />
            Intelligenza Commerciale
          </h1>
          <p className="text-sm text-muted-foreground">
            Panoramica, previsioni, clienti, prodotti, prezzi, ordini, provvigioni e opportunità
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={aziendaFilter} onValueChange={setAziendaFilter}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Azienda" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte le aziende</SelectItem>
              {data?.aziende.map((a: any) => (
                <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <TabsList className="inline-flex w-max md:grid md:w-full md:grid-cols-8">
            <TabsTrigger value="panoramica" className="gap-1.5"><LayoutDashboard className="w-4 h-4" />Panoramica</TabsTrigger>
            <TabsTrigger value="previsione" className="gap-1.5"><Calculator className="w-4 h-4" />Previsione</TabsTrigger>
            <TabsTrigger value="clienti" className="gap-1.5"><Users className="w-4 h-4" />Clienti</TabsTrigger>
            <TabsTrigger value="prodotti" className="gap-1.5"><Package className="w-4 h-4" />Prodotti</TabsTrigger>
            <TabsTrigger value="prezzi" className="gap-1.5"><ShieldAlert className="w-4 h-4" />Prezzi</TabsTrigger>
            <TabsTrigger value="ordini" className="gap-1.5"><ShoppingCart className="w-4 h-4" />Ordini</TabsTrigger>
            <TabsTrigger value="provvigioni" className="gap-1.5"><Wallet className="w-4 h-4" />Provvigioni</TabsTrigger>
            <TabsTrigger value="opportunita" className="gap-1.5"><Lightbulb className="w-4 h-4" />Opportunità</TabsTrigger>
          </TabsList>
        </div>

        {/* PANORAMICA */}
        <TabsContent value="panoramica" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KPI label="Fatturato totale" value={eur(totFatturato)} icon={TrendingUp} tone="primary" />
            <KPI label="Ordini" value={String(totOrdini)} icon={ShoppingCart} />
            <KPI label="Provvigioni previste" value={eur(totProvvigione)} icon={Wallet} tone="emerald" />
            <KPI label="Clienti attivi" value={String(totClienti)} icon={Users} />
            <KPI label="Anomalie prezzo aperte" value={String(totAnomalie)} icon={AlertTriangle} tone={totAnomalie > 0 ? "red" : undefined} />
            <KPI label="MTD" value={eur(data?.monthSim.fatturato_mtd || 0)} icon={Calculator} />
            <KPI label="Previsione fine mese" value={eur(data?.monthSim.fatturato_previsto || 0)} icon={Target} tone="primary" />
            <KPI label="YoY mese" value={pct(data?.monthSim.delta_yoy_pct || 0)}
              icon={(data?.monthSim.delta_yoy_pct || 0) >= 0 ? TrendingUp : TrendingDown}
              tone={(data?.monthSim.delta_yoy_pct || 0) >= 0 ? "emerald" : "red"} />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="surface-glass">
              <CardHeader className="pb-2"><CardTitle className="text-base">Segmenti clienti</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(segCounts).sort((a, b) => b[1] - a[1]).map(([seg, count]) => (
                  <div key={seg} className="flex items-center justify-between text-sm">
                    <Badge variant="outline" className={SEG_COLORS[seg]}>{seg}</Badge>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
                {Object.keys(segCounts).length === 0 && <p className="text-xs text-muted-foreground">Nessun dato.</p>}
              </CardContent>
            </Card>
            <Card className="surface-glass">
              <CardHeader className="pb-2"><CardTitle className="text-base">Ordini per stato</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(ordersByStatus).sort((a, b) => b[1].totale - a[1].totale).map(([s, v]) => (
                  <div key={s} className="flex items-center justify-between text-sm">
                    <Badge variant="outline" className={STATUS_COLORS[s]}>{s}</Badge>
                    <span className="text-muted-foreground">{v.n} · <span className="font-medium text-foreground">{eur(v.totale)}</span></span>
                  </div>
                ))}
                {Object.keys(ordersByStatus).length === 0 && <p className="text-xs text-muted-foreground">Nessun ordine.</p>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* PREVISIONE FINE MESE */}
        <TabsContent value="previsione" className="space-y-4 mt-4">
          {isLoading || !data ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">Caricamento…</CardContent></Card>
          ) : (
            <>
              <Card className="surface-glass">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between flex-wrap gap-2">
                    <span>Chiusura {data.monthSim.mese}</span>
                    <Badge variant="outline">
                      Giorno {data.monthSim.giorni_trascorsi}/{data.monthSim.giorni_totali} · {data.monthSim.giorni_rimanenti} rimanenti
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid md:grid-cols-3 gap-6">
                  <div>
                    <div className="text-xs text-muted-foreground uppercase">Fatturato MTD</div>
                    <div className="text-2xl font-bold">{eur(data.monthSim.fatturato_mtd)}</div>
                    <div className="text-xs text-muted-foreground">{data.monthSim.ordini_mtd} ordini</div>
                    <Progress value={(data.monthSim.giorni_trascorsi / data.monthSim.giorni_totali) * 100} className="h-2 mt-3" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground uppercase">Previsione fine mese</div>
                    <div className="text-2xl font-bold text-primary">{eur(data.monthSim.fatturato_previsto)}</div>
                    <div className="text-xs text-muted-foreground">
                      pace {eur(data.monthSim.fatturato_pace)} · storico {eur(data.monthSim.fatturato_storico)}
                    </div>
                    <div className="text-xs mt-2">Ordini previsti: <span className="font-medium">{data.monthSim.ordini_previsti}</span></div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground uppercase">Provvigioni previste</div>
                    <div className="text-2xl font-bold text-emerald-400">{eur(data.monthSim.provvigioni_previste)}</div>
                    <div className="text-xs text-muted-foreground">aliquota media {pct(data.monthSim.aliquota_media_prevista)}</div>
                    <div className="text-xs mt-2">MTD: {eur(data.monthSim.provvigioni_mtd)}</div>
                  </div>
                </CardContent>
              </Card>
              <div className="grid md:grid-cols-2 gap-4">
                <DeltaCard label="YoY vs stesso mese anno precedente" delta={data.monthSim.delta_yoy_pct} confront={data.monthSim.fatturato_stesso_mese_anno_prec} confrontLabel="Anno precedente" />
                <DeltaCard label="MoM vs mese precedente" delta={data.monthSim.delta_mom_pct} confront={data.monthSim.fatturato_mese_precedente} confrontLabel="Mese precedente" />
              </div>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Target className="w-4 h-4" />Come è calcolata la previsione</CardTitle></CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-1">
                  <p>• <b>Pace lineare</b>: fatturato MTD proiettato sui giorni totali.</p>
                  <p>• <b>Storico</b>: media delle ultime 3 occorrenze dello stesso mese.</p>
                  <p>• <b>Blended</b>: 60% pace + 40% storico.</p>
                  <p>• <b>Provvigioni</b>: aliquota media effettiva × fatturato previsto.</p>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* CLIENTI */}
        <TabsContent value="clienti" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(segCounts).sort((a, b) => b[1] - a[1]).map(([seg, count]) => (
              <Card key={seg} className={cn("cursor-pointer surface-noir", segFilter === seg && "ring-2 ring-primary")}
                onClick={() => setSegFilter(segFilter === seg ? "all" : seg)}>
                <CardContent className="p-4">
                  <Badge variant="outline" className={cn("mb-2", SEG_COLORS[seg])}>{seg}</Badge>
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-xs text-muted-foreground">clienti</div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Input placeholder="Cerca cliente…" value={searchCli} onChange={(e) => setSearchCli(e.target.value)} className="max-w-md" />
            <Select value={segFilter} onValueChange={setSegFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti segmenti</SelectItem>
                {Object.keys(SEG_COLORS).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Card>
            <CardHeader><CardTitle className="text-lg">Clienti — RFM</CardTitle></CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {isLoading ? <div className="p-6 text-center text-muted-foreground">Caricamento…</div>
                : filteredRfm.length === 0 ? <div className="p-6 text-center text-muted-foreground">Nessun cliente.</div>
                : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead><TableHead>Segmento</TableHead>
                        <TableHead className="text-center">R</TableHead><TableHead className="text-center">F</TableHead><TableHead className="text-center">M</TableHead>
                        <TableHead className="text-right">Recency</TableHead><TableHead className="text-right">Ordini</TableHead>
                        <TableHead className="text-right">Fatturato</TableHead><TableHead className="text-right">Ultimo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRfm.slice(0, 300).map((r) => {
                        const c = data?.cliMap.get(r.cliente_id);
                        return (
                          <TableRow key={r.cliente_id}>
                            <TableCell className="font-medium">
                              <Link to={`/clienti/${r.cliente_id}`} className="hover:text-primary">{c?.nome || r.cliente_id.slice(0, 8)}</Link>
                              {c?.azienda && <div className="text-xs text-muted-foreground">{c.azienda}</div>}
                            </TableCell>
                            <TableCell><Badge variant="outline" className={SEG_COLORS[r.segmento]}>{r.segmento}</Badge></TableCell>
                            <TableCell className="text-center font-mono">{r.r_score}</TableCell>
                            <TableCell className="text-center font-mono">{r.f_score}</TableCell>
                            <TableCell className="text-center font-mono">{r.m_score}</TableCell>
                            <TableCell className="text-right"><span className={r.recency_giorni > 90 ? "text-orange-400" : ""}>{r.recency_giorni}g</span></TableCell>
                            <TableCell className="text-right">{r.frequency}</TableCell>
                            <TableCell className="text-right font-medium">{eur(r.monetary)}</TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground">{r.ultimo_ordine?.slice(0, 10)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* PRODOTTI */}
        <TabsContent value="prodotti" className="space-y-4 mt-4">
          <Input placeholder="Cerca prodotto…" value={searchProd} onChange={(e) => setSearchProd(e.target.value)} className="max-w-md" />
          <Card>
            <CardHeader><CardTitle className="text-lg">Top prodotti per fatturato</CardTitle></CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {filteredProducts.length === 0 ? <div className="p-6 text-center text-muted-foreground">Nessun prodotto.</div>
                : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Prodotto</TableHead>
                        <TableHead className="text-right">Fatturato</TableHead>
                        <TableHead className="text-right">Pezzi</TableHead>
                        <TableHead className="text-right">Cartoni</TableHead>
                        <TableHead className="text-right">Clienti</TableHead>
                        <TableHead className="text-right">Ordini</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProducts.slice(0, 200).map((p) => {
                        const prod = data?.prodMap.get(p.prodotto_id);
                        return (
                          <TableRow key={p.prodotto_id}>
                            <TableCell className="font-medium">
                              {prod?.nome || p.prodotto_id.slice(0, 8)}
                              {prod?.codice && <div className="text-xs text-muted-foreground">{prod.codice}</div>}
                            </TableCell>
                            <TableCell className="text-right font-semibold text-primary">{eur(p.fatturato)}</TableCell>
                            <TableCell className="text-right">{p.quantita_pezzi.toLocaleString("it-IT")}</TableCell>
                            <TableCell className="text-right">{p.quantita_cartoni.toLocaleString("it-IT")}</TableCell>
                            <TableCell className="text-right">{p.clienti_distinti}</TableCell>
                            <TableCell className="text-right">{p.ordini}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* CONTROLLO PREZZI */}
        <TabsContent value="prezzi" className="space-y-4 mt-4">
          <div className="grid grid-cols-3 gap-3">
            {(["critica", "alta", "media"] as const).map((s) => (
              <Card key={s} className={cn("surface-noir cursor-pointer", sevFilter === s && "ring-2 ring-primary")}
                onClick={() => setSevFilter(sevFilter === s ? "all" : s)}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs uppercase text-muted-foreground">{s}</div>
                      <div className="text-2xl font-bold">{sevCounts[s] || 0}</div>
                    </div>
                    <AlertTriangle className={cn("w-6 h-6", s === "critica" ? "text-red-400" : s === "alta" ? "text-orange-400" : "text-amber-400")} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap">
            <Input placeholder="Cerca prodotto o cliente…" value={searchProd} onChange={(e) => setSearchProd(e.target.value)} className="max-w-md" />
            <Select value={sevFilter} onValueChange={setSevFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte severità</SelectItem>
                <SelectItem value="critica">Critica</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="media">Media</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Card>
            <CardHeader><CardTitle className="text-lg">Anomalie di prezzo</CardTitle></CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {isLoading ? <div className="p-6 text-center text-muted-foreground">Caricamento…</div>
                : filteredAnomalies.length === 0 ? <div className="p-6 text-center text-muted-foreground">Nessuna anomalia aperta.</div>
                : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sev</TableHead><TableHead>Prodotto</TableHead><TableHead>Cliente</TableHead>
                        <TableHead>Data</TableHead><TableHead className="text-right">Netto</TableHead>
                        <TableHead className="text-right">Media</TableHead><TableHead className="text-right">Δ</TableHead>
                        <TableHead className="text-right">Sconto</TableHead><TableHead>Motivo</TableHead>
                        <TableHead className="text-right">Azioni</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAnomalies.slice(0, 200).map((a, i) => {
                        const p = data?.prodMap.get(a.prodotto_id);
                        const c = data?.cliMap.get(a.cliente_id);
                        return (
                          <TableRow key={`${a.ordine_id}-${a.prodotto_id}-${i}`}>
                            <TableCell><Badge variant="outline" className={SEV_COLORS[a.severita]}>{a.severita}</Badge></TableCell>
                            <TableCell className="font-medium">{p?.nome || a.prodotto_id.slice(0, 8)}</TableCell>
                            <TableCell>{c ? <Link to={`/clienti/${a.cliente_id}`} className="hover:text-primary">{c.nome}</Link> : "—"}</TableCell>
                            <TableCell>{a.data_ordine?.slice(0, 10)}</TableCell>
                            <TableCell className="text-right">€ {a.prezzo_netto.toFixed(3)}</TableCell>
                            <TableCell className="text-right text-muted-foreground">€ {a.media_netto_prodotto.toFixed(3)}</TableCell>
                            <TableCell className={cn("text-right font-medium", a.scostamento_pct < 0 ? "text-red-400" : "text-emerald-400")}>
                              {a.scostamento_pct > 0 ? "+" : ""}{a.scostamento_pct.toFixed(1)}%
                            </TableCell>
                            <TableCell className="text-right">{a.sconto_totale_pct.toFixed(1)}%</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{a.motivo}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-1 justify-end">
                                <Button size="icon" variant="ghost" title="Verificato" onClick={() => resolveAnomaly(a, "verificato")}>
                                  <Check className="w-4 h-4 text-emerald-400" />
                                </Button>
                                <Button size="icon" variant="ghost" title="Escludi" onClick={() => resolveAnomaly(a, "escluso")}>
                                  <X className="w-4 h-4 text-muted-foreground" />
                                </Button>
                              </div>
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

        {/* ORDINI */}
        <TabsContent value="ordini" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {["bozza", "da_confermare", "stand_by", "confermato", "evaso", "annullato"].map((s) => {
              const v = ordersByStatus[s] || { n: 0, totale: 0 };
              return (
                <Card key={s} className="surface-noir">
                  <CardContent className="p-4">
                    <Badge variant="outline" className={cn("mb-2", STATUS_COLORS[s])}>{s}</Badge>
                    <div className="text-xl font-bold">{v.n}</div>
                    <div className="text-xs text-muted-foreground">{eur(v.totale)}</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <Card>
            <CardHeader><CardTitle className="text-lg">Ordini recenti</CardTitle></CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead><TableHead>Cliente</TableHead><TableHead>Stato</TableHead>
                    <TableHead className="text-right">Totale</TableHead><TableHead className="text-right">Provv.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.ordiniIC || [])
                    .filter((o) => o.data_ordine)
                    .sort((a, b) => (a.data_ordine! < b.data_ordine! ? 1 : -1))
                    .slice(0, 100)
                    .map((o) => {
                      const c = o.cliente_id ? data?.cliMap.get(o.cliente_id) : null;
                      return (
                        <TableRow key={o.id}>
                          <TableCell className="text-xs">{o.data_ordine?.slice(0, 10)}</TableCell>
                          <TableCell className="font-medium">{c?.nome || "—"}</TableCell>
                          <TableCell><Badge variant="outline" className={STATUS_COLORS[o.status || "bozza"]}>{o.status}</Badge></TableCell>
                          <TableCell className="text-right">{eur(o.totale)}</TableCell>
                          <TableCell className="text-right text-emerald-400">{eur2(o.provvigione_prevista || 0)}</TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PROVVIGIONI */}
        <TabsContent value="provvigioni" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {["pagata", "parziale", "da_pagare", "scaduta", "contestazione"].map((st) => {
              const v = provvByStato[st] || { n: 0, provvigione: 0 };
              return (
                <Card key={st} className="surface-noir">
                  <CardContent className="p-4">
                    <div className="text-xs uppercase text-muted-foreground">{st.replace("_", " ")}</div>
                    <div className="text-xl font-bold">{v.n}</div>
                    <div className="text-xs text-emerald-400">{eur(v.provvigione)}</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <QuarterTable title="Per trimestre di competenza" rows={provvByQuarter.competenza} />
            <QuarterTable title="Per trimestre di pagamento" rows={provvByQuarter.pagamento} />
          </div>
        </TabsContent>

        {/* OPPORTUNITÀ */}
        <TabsContent value="opportunita" className="space-y-4 mt-4">
          <Card className="surface-glass">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Lightbulb className="w-4 h-4 text-primary" />Clienti da riattivare</CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {opportunita.length === 0 ? <div className="p-6 text-center text-muted-foreground">Nessuna opportunità individuata.</div>
                : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead><TableHead>Segmento</TableHead>
                        <TableHead className="text-right">Recency</TableHead><TableHead className="text-right">Ordini</TableHead>
                        <TableHead className="text-right">Fatturato storico</TableHead>
                        <TableHead className="text-right">Ordine medio</TableHead>
                        <TableHead className="text-right">Azione</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {opportunita.map((o) => (
                        <TableRow key={o.cliente_id}>
                          <TableCell className="font-medium">
                            <Link to={`/clienti/${o.cliente_id}`} className="hover:text-primary">{o.cliente?.nome || o.cliente_id.slice(0, 8)}</Link>
                            {o.cliente?.citta && <div className="text-xs text-muted-foreground">{o.cliente.citta}</div>}
                          </TableCell>
                          <TableCell><Badge variant="outline" className={SEG_COLORS[o.segmento]}>{o.segmento}</Badge></TableCell>
                          <TableCell className="text-right text-orange-400">{o.recency_giorni}g</TableCell>
                          <TableCell className="text-right">{o.frequency}</TableCell>
                          <TableCell className="text-right">{eur(o.monetary)}</TableCell>
                          <TableCell className="text-right font-semibold text-primary">{eur(o.potenziale)}</TableCell>
                          <TableCell className="text-right">
                            <Link to={`/prepara-visita?cliente=${o.cliente_id}`}>
                              <Button size="sm" variant="outline">Prepara visita</Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
            </CardContent>
          </Card>

          <Card className="surface-glass">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-400" />Anomalie prezzo aperte</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredAnomalies.length === 0
                ? <p className="text-sm text-muted-foreground">Nessuna anomalia aperta.</p>
                : (
                  <div className="text-sm space-y-1">
                    <p>Critiche: <b className="text-red-400">{sevCounts.critica || 0}</b> · Alta: <b className="text-orange-400">{sevCounts.alta || 0}</b> · Media: <b className="text-amber-400">{sevCounts.media || 0}</b></p>
                    <Button size="sm" variant="link" onClick={() => setTab("prezzi")}>Vedi controllo prezzi →</Button>
                  </div>
                )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KPI({ label, value, icon: Icon, tone }: { label: string; value: string; icon: any; tone?: "primary" | "emerald" | "red" }) {
  const toneClass = tone === "primary" ? "text-primary" : tone === "emerald" ? "text-emerald-400" : tone === "red" ? "text-red-400" : "text-foreground";
  return (
    <Card className="surface-noir">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <div className="text-xs uppercase text-muted-foreground truncate">{label}</div>
            <div className={cn("text-xl md:text-2xl font-bold truncate", toneClass)}>{value}</div>
          </div>
          <Icon className={cn("w-5 h-5 flex-shrink-0", toneClass)} />
        </div>
      </CardContent>
    </Card>
  );
}

function DeltaCard({ label, delta, confront, confrontLabel }: { label: string; delta: number; confront: number; confrontLabel: string }) {
  const positive = delta >= 0;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {positive ? <TrendingUp className="w-4 h-4 text-emerald-400" /> : <TrendingDown className="w-4 h-4 text-red-400" />}
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">
          <span className={positive ? "text-emerald-400" : "text-red-400"}>
            {positive ? "+" : ""}{pct(delta)}
          </span>
        </div>
        <div className="text-sm text-muted-foreground mt-1">{confrontLabel}: {eur(confront)}</div>
      </CardContent>
    </Card>
  );
}

function QuarterTable({ title, rows }: { title: string; rows: { q: string; n: number; provvigione: number; importo: number }[] }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        {rows.length === 0 ? <p className="p-4 text-xs text-muted-foreground">Nessun dato.</p>
          : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trimestre</TableHead><TableHead className="text-right">Fatture</TableHead>
                  <TableHead className="text-right">Fatturato</TableHead><TableHead className="text-right">Provvigione</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.q}>
                    <TableCell className="font-mono">{r.q}</TableCell>
                    <TableCell className="text-right">{r.n}</TableCell>
                    <TableCell className="text-right">{eur(r.importo)}</TableCell>
                    <TableCell className="text-right text-emerald-400 font-medium">{eur(r.provvigione)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
      </CardContent>
    </Card>
  );
}
