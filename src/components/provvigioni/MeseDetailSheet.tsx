import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, Building2, Users, Trophy, AlertTriangle, Ban, CheckCircle2, Clock, Euro, Receipt, Percent, Calendar } from "lucide-react";

const MESI_LABEL = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];

const fmtEur = (v: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v || 0);
const fmtEur2 = (v: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v || 0);

const STATO_COLORS: Record<string, string> = {
  pagata: "hsl(var(--success))",
  da_pagare: "hsl(var(--warning))",
  scaduta: "hsl(var(--destructive))",
  parziale: "hsl(217 91% 60%)",
  contestazione: "hsl(280 65% 60%)",
};

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--destructive))",
  "hsl(217 91% 60%)",
  "hsl(280 65% 60%)",
  "hsl(35 90% 55%)",
  "hsl(160 60% 45%)",
];

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  detail: any | null;
}

function GrowthBadge({ value }: { value: number | null }) {
  if (value == null) return <Badge variant="outline" className="text-xs">n/d</Badge>;
  const positive = value >= 0;
  const Icon = value === 0 ? Minus : positive ? TrendingUp : TrendingDown;
  const cls = value === 0 ? "text-muted-foreground" : positive ? "text-success" : "text-destructive";
  return (
    <span className={`inline-flex items-center gap-1 text-sm font-semibold ${cls}`}>
      <Icon className="h-3.5 w-3.5" />
      {positive && value !== 0 ? "+" : ""}{value.toFixed(1)}%
    </span>
  );
}

function Stat({ label, value, icon, tone }: { label: string; value: string; icon?: React.ReactNode; tone?: "success" | "warning" | "destructive" | "primary" | "purple" }) {
  const toneCls =
    tone === "success" ? "text-success" :
    tone === "warning" ? "text-warning" :
    tone === "destructive" ? "text-destructive" :
    tone === "primary" ? "text-primary" :
    tone === "purple" ? "text-[hsl(280_65%_70%)]" : "";
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
        {icon}<span>{label}</span>
      </div>
      <p className={`text-lg font-bold ${toneCls}`}>{value}</p>
    </div>
  );
}

export function MeseDetailSheet({ open, onOpenChange, detail }: Props) {
  if (!detail) return null;
  const meseLabel = `${MESI_LABEL[detail.mese]} ${detail.anno}`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0">
        <div className="p-6 border-b bg-gradient-to-br from-primary/10 to-card">
          <SheetHeader className="text-left space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <SheetTitle className="text-2xl">{meseLabel}</SheetTitle>
            </div>
            <SheetDescription>
              Dettaglio completo delle provvigioni e delle performance del mese
            </SheetDescription>
            <div className="flex flex-wrap gap-4 pt-2">
              <div>
                <p className="text-xs text-muted-foreground">vs mese precedente</p>
                <GrowthBadge value={detail.growthMoM} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">vs stesso mese A-1</p>
                <GrowthBadge value={detail.growthYoY} />
              </div>
            </div>
          </SheetHeader>
        </div>

        <div className="p-6 space-y-6">
          {/* KPI grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
            <Stat label="Provvigioni maturate" value={fmtEur(detail.provvigioniMaturate)} tone="primary" icon={<Euro className="h-3.5 w-3.5" />} />
            <Stat label="Pagate" value={fmtEur(detail.provvigioniPagate)} tone="success" icon={<CheckCircle2 className="h-3.5 w-3.5" />} />
            <Stat label="Non pagate" value={fmtEur(detail.provvigioniNonPagate)} tone="warning" icon={<Clock className="h-3.5 w-3.5" />} />
            <Stat label="Scadute" value={fmtEur(detail.provvigioniScadute)} tone="destructive" icon={<AlertTriangle className="h-3.5 w-3.5" />} />
            <Stat label="Contestazione" value={fmtEur(detail.provvigioniContestazione)} tone="purple" icon={<Ban className="h-3.5 w-3.5" />} />
            <Stat label="In ritardo" value={fmtEur(detail.provvigioniInRitardo)} tone="destructive" icon={<AlertTriangle className="h-3.5 w-3.5" />} />
            <Stat label="Fatturato totale" value={fmtEur(detail.fatturato)} icon={<TrendingUp className="h-3.5 w-3.5" />} />
            <Stat label="N° ordini" value={String(detail.nOrdini)} icon={<Receipt className="h-3.5 w-3.5" />} />
            <Stat label="N° fatture" value={String(detail.fatture)} icon={<Receipt className="h-3.5 w-3.5" />} />
            <Stat label="Ticket medio" value={fmtEur(detail.ticketMedio)} icon={<Euro className="h-3.5 w-3.5" />} />
            <Stat label="% media provv." value={`${detail.pctMediaProvv.toFixed(2)}%`} icon={<Percent className="h-3.5 w-3.5" />} />
          </div>

          {/* Top azienda / cliente */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Card className="border-primary/30">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Trophy className="h-4 w-4 text-primary" />TOP AZIENDA (fatturato)
                </div>
                {detail.miglioreAzienda ? (
                  <div>
                    <p className="font-semibold truncate">{detail.miglioreAzienda.nome}</p>
                    <p className="text-xs text-muted-foreground">{fmtEur(detail.miglioreAzienda.fatturato)} · {detail.miglioreAzienda.ordini} ordini</p>
                  </div>
                ) : <p className="text-sm text-muted-foreground">—</p>}
                <div className="pt-2 border-t border-border/50">
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Building2 className="h-3 w-3" />Più provvigioni</p>
                  {detail.aziendaTopProvv ? (
                    <p className="text-sm font-medium mt-1">{detail.aziendaTopProvv.nome} <span className="text-primary">({fmtEur(detail.aziendaTopProvv.provvigioni)})</span></p>
                  ) : <p className="text-sm text-muted-foreground">—</p>}
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/30">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Trophy className="h-4 w-4 text-primary" />TOP CLIENTE (provvigioni)
                </div>
                {detail.miglioreCliente ? (
                  <div>
                    <p className="font-semibold truncate">{detail.miglioreCliente.nome}</p>
                    <p className="text-xs text-muted-foreground">{fmtEur(detail.miglioreCliente.provvigioni)} provvigioni · {detail.miglioreCliente.ordini} ordini</p>
                  </div>
                ) : <p className="text-sm text-muted-foreground">—</p>}
                <div className="pt-2 border-t border-border/50">
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" />Più fatturato</p>
                  {detail.clienteTopFatturato ? (
                    <p className="text-sm font-medium mt-1">{detail.clienteTopFatturato.nome} <span className="text-primary">({fmtEur(detail.clienteTopFatturato.fatturato)})</span></p>
                  ) : <p className="text-sm text-muted-foreground">—</p>}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Mini chart: andamento giornaliero fatturato */}
          <Card>
            <CardContent className="p-4">
              <p className="text-sm font-semibold mb-3">Andamento giornaliero · Fatturato</p>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={detail.giornaliero}>
                  <defs>
                    <linearGradient id="fatG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="giorno" fontSize={10} stroke="hsl(var(--muted-foreground))" />
                  <YAxis fontSize={10} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => fmtEur(v)} />
                  <Area type="monotone" dataKey="fatturato" stroke="hsl(var(--success))" strokeWidth={2} fill="url(#fatG)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Mini chart: provvigioni giornaliere */}
          <Card>
            <CardContent className="p-4">
              <p className="text-sm font-semibold mb-3">Andamento giornaliero · Provvigioni</p>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={detail.giornaliero}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="giorno" fontSize={10} stroke="hsl(var(--muted-foreground))" />
                  <YAxis fontSize={10} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => fmtEur(v)} />
                  <Line type="monotone" dataKey="provvigioni" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Ripartizioni */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm font-semibold mb-3">Provvigioni per azienda</p>
                {detail.aziendeMese.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">Nessun dato</p>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={detail.aziendeMese} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" fontSize={10} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="nome" fontSize={10} stroke="hsl(var(--muted-foreground))" width={90} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => fmtEur(v)} />
                      <Bar dataKey="provvigioni" radius={[0, 4, 4, 0]}>
                        {detail.aziendeMese.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <p className="text-sm font-semibold mb-3">Provvigioni per stato</p>
                {detail.perStato.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">Nessun dato</p>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={detail.perStato} dataKey="value" nameKey="stato" cx="50%" cy="50%" outerRadius={70} innerRadius={40} paddingAngle={2}>
                        {detail.perStato.map((s: any, i: number) => <Cell key={i} fill={STATO_COLORS[s.key] || CHART_COLORS[i]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => fmtEur(v)} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Giorni top */}
          {detail.giorniTop.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-warning" />Giorni con maggior fatturato
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {detail.giorniTop.map((g: any) => (
                    <div key={g.giorno} className="rounded-md border bg-card p-3 text-center">
                      <p className="text-xs text-muted-foreground">Giorno {g.giorno}</p>
                      <p className="text-sm font-bold text-success">{fmtEur(g.fatturato)}</p>
                      <p className="text-xs text-primary">{fmtEur2(g.provvigioni)} provv.</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
