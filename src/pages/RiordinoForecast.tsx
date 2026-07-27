import { useMemo, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { useReorderForecast, type EnrichedForecast } from "@/hooks/useReorderForecast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  Clock,
  TrendingUp,
  Users,
  Package,
  Sparkles,
  Search,
  Phone,
} from "lucide-react";
import { Link } from "react-router-dom";

const urgenzaBadge: Record<EnrichedForecast["urgenza"], { label: string; className: string }> = {
  critica: { label: "In rottura", className: "bg-red-500/15 text-red-500 border-red-500/30" },
  alta: { label: "Entro 7 gg", className: "bg-orange-500/15 text-orange-500 border-orange-500/30" },
  media: { label: "Entro 30 gg", className: "bg-yellow-500/15 text-yellow-500 border-yellow-500/30" },
  bassa: { label: "Entro 60 gg", className: "bg-blue-500/15 text-blue-500 border-blue-500/30" },
  futura: { label: "Futura", className: "bg-muted text-muted-foreground border-border" },
};

const fmtEur = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "2-digit" }) : "—";

export default function RiordinoForecast() {
  const { data, isLoading } = useReorderForecast();
  const [tab, setTab] = useState<"tutti" | "critica" | "alta" | "media">("critica");
  const [search, setSearch] = useState("");
  const [aziendaFilter, setAziendaFilter] = useState<string>("all");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const forecasts = data?.forecasts || [];
  const kpi = data?.kpi;

  const aziendeOpt = useMemo(() => {
    const map = new Map<string, string>();
    forecasts.forEach((f) => map.set(f.azienda_id, f.azienda_nome));
    return Array.from(map.entries());
  }, [forecasts]);

  const filtered = useMemo(() => {
    return forecasts.filter((f) => {
      if (tab !== "tutti" && f.urgenza !== tab) return false;
      if (aziendaFilter !== "all" && f.azienda_id !== aziendaFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !f.prodotto_nome.toLowerCase().includes(q) &&
          !f.cliente_nome.toLowerCase().includes(q) &&
          !(f.prodotto_codice || "").toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [forecasts, tab, aziendaFilter, search]);

  const clientiGroup = useMemo(() => {
    // top clienti da contattare
    const map = new Map<string, { nome: string; prodotti: number; fatturato: number; id: string }>();
    filtered.forEach((f) => {
      if (f.urgenza !== "critica" && f.urgenza !== "alta") return;
      const cur = map.get(f.cliente_id) || {
        nome: f.cliente_nome,
        prodotti: 0,
        fatturato: 0,
        id: f.cliente_id,
      };
      cur.prodotti += 1;
      cur.fatturato += f.fatturato_medio;
      map.set(f.cliente_id, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.fatturato - a.fatturato).slice(0, 8);
  }, [filtered]);

  return (
    <div className="flex min-h-[100dvh] bg-background">
      <Sidebar mobileOpen={mobileMenuOpen} onMobileOpenChange={setMobileMenuOpen} />
      <main className="flex-1 overflow-x-hidden pb-24 md:pb-8 md:pl-64">
        <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
          <header className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight">
                Previsione Riordino
              </h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Stima automatica del prossimo riordino per ogni prodotto x cliente, basata sullo storico ordini.
            </p>
          </header>

          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <KpiCard
              icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
              label="In rottura oggi"
              value={isLoading ? "…" : String(kpi?.in_rottura_oggi ?? 0)}
              tone="red"
            />
            <KpiCard
              icon={<Clock className="h-4 w-4 text-orange-500" />}
              label="Entro 7 giorni"
              value={isLoading ? "…" : String(kpi?.in_rottura_7gg ?? 0)}
              tone="orange"
            />
            <KpiCard
              icon={<Clock className="h-4 w-4 text-yellow-500" />}
              label="Entro 30 giorni"
              value={isLoading ? "…" : String(kpi?.in_rottura_30gg ?? 0)}
              tone="yellow"
            />
            <KpiCard
              icon={<Users className="h-4 w-4 text-primary" />}
              label="Clienti urgenti"
              value={isLoading ? "…" : String(kpi?.clienti_da_contattare ?? 0)}
              tone="blue"
            />
            <KpiCard
              icon={<TrendingUp className="h-4 w-4 text-emerald-500" />}
              label="Fatturato potenziale 30gg"
              value={isLoading ? "…" : fmtEur.format(kpi?.fatturato_potenziale_30gg ?? 0)}
              tone="green"
            />
          </div>

          {/* Filtri */}
          <Card className="surface-glass">
            <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Cerca prodotto, cliente, codice…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={aziendaFilter} onValueChange={setAziendaFilter}>
                <SelectTrigger className="md:w-56">
                  <SelectValue placeholder="Tutte le aziende" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte le aziende</SelectItem>
                  {aziendeOpt.map(([id, nome]) => (
                    <SelectItem key={id} value={id}>
                      {nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList>
              <TabsTrigger value="critica">In rottura</TabsTrigger>
              <TabsTrigger value="alta">Entro 7 gg</TabsTrigger>
              <TabsTrigger value="media">Entro 30 gg</TabsTrigger>
              <TabsTrigger value="tutti">Tutti</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Clienti da contattare */}
          {clientiGroup.length > 0 && tab !== "tutti" && (
            <Card className="surface-noir">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Phone className="h-4 w-4 text-primary" />
                  Clienti da contattare subito
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {clientiGroup.map((c) => (
                  <Link
                    key={c.id}
                    to={`/clienti/${c.id}`}
                    className="rounded-lg border border-border bg-card/50 p-3 transition hover-lift"
                  >
                    <div className="truncate text-sm font-medium">{c.nome}</div>
                    <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{c.prodotti} prodotti</span>
                      <span className="text-emerald-500">{fmtEur.format(c.fatturato)}</span>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Tabella */}
          <Card className="surface-noir">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="h-4 w-4 text-primary" />
                Ordini consigliati ({filtered.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="space-y-2 p-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  Nessun prodotto in questa categoria.
                </div>
              ) : (
                <>
                  {/* Desktop */}
                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full text-sm">
                      <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                        <tr>
                          <th className="p-3">Urgenza</th>
                          <th className="p-3">Prodotto</th>
                          <th className="p-3">Cliente</th>
                          <th className="p-3">Azienda</th>
                          <th className="p-3 text-right">Ultimo ordine</th>
                          <th className="p-3 text-right">Media</th>
                          <th className="p-3 text-right">Ult. Q.tà (ct)</th>
                          <th className="p-3 text-right">Prossimo</th>
                          <th className="p-3 text-right">€ atteso</th>
                          <th className="p-3"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.slice(0, 300).map((f) => {
                          const badge = urgenzaBadge[f.urgenza];
                          const ritardo = f.giorni_al_riordino !== null && f.giorni_al_riordino < 0;
                          return (
                            <tr key={f.key} className="border-b border-border/50 hover:bg-muted/30">
                              <td className="p-3">
                                <Badge variant="outline" className={badge.className}>
                                  {badge.label}
                                </Badge>
                              </td>
                              <td className="p-3">
                                <div className="font-medium">{f.prodotto_nome}</div>
                                <div className="text-xs text-muted-foreground">
                                  {f.prodotto_brand || f.prodotto_codice || "—"}
                                </div>
                              </td>
                              <td className="p-3">
                                <Link to={`/clienti/${f.cliente_id}`} className="hover:text-primary">
                                  {f.cliente_nome}
                                </Link>
                              </td>
                              <td className="p-3 text-muted-foreground">{f.azienda_nome}</td>
                              <td className="p-3 text-right">{fmtDate(f.ultimo_ordine)}</td>
                              <td className="p-3 text-right">
                                {f.media_giorni > 0 ? `${Math.round(f.media_giorni)} gg` : "—"}
                              </td>
                              <td className="p-3 text-right">{f.ultima_quantita_cartoni}</td>
                              <td className={`p-3 text-right ${ritardo ? "text-red-500 font-semibold" : ""}`}>
                                {fmtDate(f.prossimo_riordino)}
                                {f.giorni_al_riordino !== null && (
                                  <div className="text-xs text-muted-foreground">
                                    {f.giorni_al_riordino < 0
                                      ? `${-f.giorni_al_riordino} gg di ritardo`
                                      : `tra ${f.giorni_al_riordino} gg`}
                                  </div>
                                )}
                              </td>
                              <td className="p-3 text-right text-emerald-500">
                                {fmtEur.format(f.fatturato_medio)}
                              </td>
                              <td className="p-3">
                                <Button asChild size="sm" variant="outline">
                                  <Link to={`/clienti/${f.cliente_id}`}>Apri</Link>
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile */}
                  <div className="space-y-2 p-3 md:hidden">
                    {filtered.slice(0, 100).map((f) => {
                      const badge = urgenzaBadge[f.urgenza];
                      return (
                        <Link
                          key={f.key}
                          to={`/clienti/${f.cliente_id}`}
                          className="block rounded-lg border border-border bg-card/50 p-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-medium">{f.prodotto_nome}</div>
                              <div className="truncate text-xs text-muted-foreground">
                                {f.cliente_nome} · {f.azienda_nome}
                              </div>
                            </div>
                            <Badge variant="outline" className={badge.className + " shrink-0"}>
                              {badge.label}
                            </Badge>
                          </div>
                          <div className="mt-2 flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                              Media {Math.round(f.media_giorni)} gg · ult. {f.ultima_quantita_cartoni} ct
                            </span>
                            <span className="text-emerald-500">{fmtEur.format(f.fatturato_medio)}</span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <BottomNav onOpenMore={() => setMobileMenuOpen(true)} moreActive={mobileMenuOpen} />
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "red" | "orange" | "yellow" | "blue" | "green";
}) {
  const toneRing: Record<string, string> = {
    red: "ring-red-500/20",
    orange: "ring-orange-500/20",
    yellow: "ring-yellow-500/20",
    blue: "ring-primary/20",
    green: "ring-emerald-500/20",
  };
  return (
    <Card className={`surface-glass ring-1 ${toneRing[tone]} hover-lift`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {icon}
          <span className="truncate">{label}</span>
        </div>
        <div className="mt-2 font-display text-xl font-bold md:text-2xl">{value}</div>
      </CardContent>
    </Card>
  );
}
