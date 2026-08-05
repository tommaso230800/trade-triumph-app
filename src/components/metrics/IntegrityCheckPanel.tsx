import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { integrityReport, orderDate, type OrdineLike } from "@/lib/metricsEngine";
import { AlertTriangle, CheckCircle2, Download, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

type Row = ReturnType<typeof integrityReport>["rows"][number] & {
  codice?: string | null;
  cliente?: string | null;
  data?: string | null;
  status?: string | null;
};

const fmt = (n: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);

export function IntegrityCheckPanel() {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [summary, setSummary] = useState<ReturnType<typeof integrityReport> | null>(null);
  const [filter, setFilter] = useState<"mismatch" | "no_lines" | "all">("mismatch");
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("ordini")
        .select(
          "id, codice, status, totale, data_ordine, data_conferma, created_at, clienti(nome), ordini_righe(quantita_pezzi, quantita_cartoni, prezzo_unitario, sc1, sc2, sc3, is_omaggio, prodotti(pezzi_per_cartone))"
        )
        .order("data_ordine", { ascending: false });
      if (error) throw error;
      const ordini = (data ?? []) as any[];
      const rep = integrityReport(ordini as OrdineLike[]);
      const byId = new Map(ordini.map((o) => [o.id, o]));
      const enriched: Row[] = rep.rows.map((r) => {
        const o = byId.get(r.id);
        return {
          ...r,
          codice: o?.codice ?? null,
          cliente: o?.clienti?.nome ?? null,
          data: orderDate(o),
          status: o?.status ?? null,
        };
      });
      setRows(enriched);
      setSummary(rep);
    } catch (e: any) {
      toast.error(e?.message ?? "Errore caricamento");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    let out = rows;
    if (filter === "mismatch") out = out.filter((r) => Math.abs(r.delta) > 0.01 && r.ha_righe);
    else if (filter === "no_lines") out = out.filter((r) => !r.ha_righe && r.totale > 0);
    const q = search.trim().toLowerCase();
    if (q) out = out.filter((r) => (r.codice ?? "").toLowerCase().includes(q) || (r.cliente ?? "").toLowerCase().includes(q));
    return out.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  }, [rows, filter, search]);

  const downloadCSV = () => {
    const header = ["codice", "cliente", "data", "status", "totale", "somma_righe", "delta", "ha_righe", "counted"];
    const lines = [header.join(",")];
    for (const r of filtered) {
      lines.push(
        [
          r.codice ?? "",
          `"${(r.cliente ?? "").replace(/"/g, '""')}"`,
          r.data ?? "",
          r.status ?? "",
          r.totale.toFixed(2),
          r.somma_righe.toFixed(2),
          r.delta.toFixed(2),
          r.ha_righe ? "1" : "0",
          r.counted ? "1" : "0",
        ].join(",")
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `integrity-check-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="shadow-card hover-lift transition-all duration-300">
      <CardHeader className="pb-4 p-4 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="h-5 w-5 text-success" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-heading-sm">Integrity Check</CardTitle>
            <CardDescription>
              Confronto tra <code>ordini.totale</code> e la somma delle righe (post-sconti, esclusi omaggi).
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Ricalcola
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-6 pt-0 sm:pt-0">
        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-muted/40 border border-border">
              <p className="text-xs text-muted-foreground">Ordini totali</p>
              <p className="text-lg font-semibold">{summary.total_orders}</p>
            </div>
            <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/20">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-destructive" /> Con delta
              </p>
              <p className="text-lg font-semibold text-destructive">{summary.mismatched_count}</p>
            </div>
            <div className="p-3 rounded-xl bg-warning/5 border border-warning/20">
              <p className="text-xs text-muted-foreground">Senza righe (con totale)</p>
              <p className="text-lg font-semibold text-warning">{summary.orders_without_lines}</p>
            </div>
            <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
              <p className="text-xs text-muted-foreground">Δ globale</p>
              <p className="text-lg font-semibold">{fmt(summary.total_fatturato - summary.total_righe)}</p>
              <p className="text-[10px] text-muted-foreground">
                {fmt(summary.total_fatturato)} vs {fmt(summary.total_righe)}
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
          <div className="flex gap-1 p-1 rounded-lg bg-muted/40 flex-1 sm:flex-initial">
            {(
              [
                { k: "mismatch", label: "Con delta" },
                { k: "no_lines", label: "Senza righe" },
                { k: "all", label: "Tutti" },
              ] as const
            ).map((t) => (
              <button
                key={t.k}
                onClick={() => setFilter(t.k)}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors flex-1 sm:flex-initial ${
                  filter === t.k ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <Input
            placeholder="Cerca codice o cliente…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 max-w-sm"
          />
          <Button variant="outline" size="sm" onClick={downloadCSV} className="gap-2">
            <Download className="h-4 w-4" />
            CSV ({filtered.length})
          </Button>
        </div>

        <div className="rounded-xl border border-border overflow-hidden">
          <div className="max-h-[520px] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead>Ordine</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead className="text-right">Totale</TableHead>
                  <TableHead className="text-right">Somma righe</TableHead>
                  <TableHead className="text-right">Δ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      <CheckCircle2 className="h-6 w-6 mx-auto mb-2 text-success" />
                      Nessuna anomalia in questa vista
                    </TableCell>
                  </TableRow>
                )}
                {filtered.slice(0, 500).map((r) => {
                  const abs = Math.abs(r.delta);
                  const severity = abs < 0.01 ? "ok" : abs < 10 ? "warn" : "bad";
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.codice ?? r.id.slice(0, 8)}</TableCell>
                      <TableCell className="max-w-[220px] truncate">{r.cliente ?? "—"}</TableCell>
                      <TableCell className="text-xs">{r.data ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {r.status ?? "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{fmt(r.totale)}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {r.ha_righe ? fmt(r.somma_righe) : "—"}
                      </TableCell>
                      <TableCell
                        className={`text-right tabular-nums font-semibold ${
                          severity === "ok" ? "text-success" : severity === "warn" ? "text-warning" : "text-destructive"
                        }`}
                      >
                        {r.ha_righe ? fmt(r.delta) : <span className="text-muted-foreground italic text-xs">no righe</span>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {filtered.length > 500 && (
            <div className="p-2 text-xs text-center text-muted-foreground border-t">
              Mostrati primi 500 su {filtered.length}. Usa il CSV per l'elenco completo.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
