import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { runDataAudit, saveDataIssues } from "@/lib/dataAudit";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Play,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

type DataIssue = {
  id: string;
  tipo: string;
  gravita: "alta" | "media" | "bassa";
  descrizione: string;
  ordine_codice: string | null;
  cliente_nome: string | null;
  azienda_nome: string | null;
  periodo: string | null;
  valore_rilevato: string | null;
  valore_atteso: string | null;
  differenza: string | null;
  causa: string | null;
  causa_verificata: boolean;
  link: string | null;
  stato: "da_verificare" | "in_lavorazione" | "risolto";
  controllato_il: string;
};

const STATI = [
  { value: "da_verificare", label: "Da verificare" },
  { value: "in_lavorazione", label: "In lavorazione" },
  { value: "risolto", label: "Risolto" },
] as const;

const gravitaCls: Record<string, string> = {
  alta: "border-destructive/30 bg-destructive/10 text-destructive",
  media: "border-warning/30 bg-warning/10 text-warning",
  bassa: "border-primary/30 bg-primary/10 text-primary",
};

const statoCls: Record<string, string> = {
  da_verificare: "border-warning/30 bg-warning/10 text-warning",
  in_lavorazione: "border-primary/30 bg-primary/10 text-primary",
  risolto: "border-success/30 bg-success/10 text-success",
};

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" });

export default function Problematiche() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [running, setRunning] = useState(false);

  const { data: issues, isLoading } = useQuery({
    queryKey: ["data_issues"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("data_issues")
        .select("*")
        .order("controllato_il", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DataIssue[];
    },
  });

  const updateStato = useMutation({
    mutationFn: async ({ id, stato }: { id: string; stato: DataIssue["stato"] }) => {
      const { error } = await supabase
        .from("data_issues")
        .update({ stato, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["data_issues"] }),
    onError: (e: any) => toast.error(e?.message ?? "Errore aggiornamento stato"),
  });

  const eseguiControllo = async () => {
    if (!user) return;
    setRunning(true);
    try {
      const found = await runDataAudit();
      await saveDataIssues(user.id, found);
      await queryClient.invalidateQueries({ queryKey: ["data_issues"] });
      toast.success(
        found.length === 0
          ? "Controllo completato: nessuna incongruenza rilevata"
          : `Controllo completato: ${found.length} incongruenz${found.length === 1 ? "a rilevata" : "e rilevate"}`
      );
    } catch (e: any) {
      toast.error(e?.message ?? "Errore durante il controllo dati");
    } finally {
      setRunning(false);
    }
  };

  const counts = useMemo(() => {
    const list = issues ?? [];
    return {
      totale: list.length,
      da_verificare: list.filter((i) => i.stato === "da_verificare").length,
      in_lavorazione: list.filter((i) => i.stato === "in_lavorazione").length,
      risolto: list.filter((i) => i.stato === "risolto").length,
      ultimoControllo: list[0]?.controllato_il ?? null,
    };
  }, [issues]);

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="font-display text-2xl font-bold tracking-tight">Problematiche</h1>
            <p className="text-sm text-muted-foreground">
              Incongruenze rilevate dal controllo dati su ordini, righe e collegamenti
            </p>
          </div>
          <Button onClick={eseguiControllo} disabled={running || !user} className="gap-2 rounded-lg">
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Esegui controllo dati
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Segnalazioni</p>
            <p className="text-2xl font-bold tabular-nums">{counts.totale}</p>
          </div>
          <div className="rounded-xl border border-warning/20 bg-warning/5 p-4">
            <p className="text-xs text-muted-foreground">Da verificare</p>
            <p className="text-2xl font-bold tabular-nums text-warning">{counts.da_verificare}</p>
          </div>
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <p className="text-xs text-muted-foreground">In lavorazione</p>
            <p className="text-2xl font-bold tabular-nums text-primary">{counts.in_lavorazione}</p>
          </div>
          <div className="rounded-xl border border-success/20 bg-success/5 p-4">
            <p className="text-xs text-muted-foreground">Risolte</p>
            <p className="text-2xl font-bold tabular-nums text-success">{counts.risolto}</p>
          </div>
        </div>

        {counts.ultimoControllo && (
          <p className="text-xs text-muted-foreground">
            Ultimo controllo: {formatDateTime(counts.ultimoControllo)}
          </p>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl border border-border bg-card" />
            ))}
          </div>
        ) : !issues || issues.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-8 text-center">
            <ShieldCheck className="h-8 w-8 text-success" />
            <p className="text-base font-semibold">Nessuna problematica registrata</p>
            <p className="text-sm text-muted-foreground">
              Premi "Esegui controllo dati" per analizzare ordini, righe e collegamenti.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {issues.map((issue) => (
              <div key={issue.id} className="space-y-3 rounded-xl border border-border bg-card p-4 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
                      <p className="text-base font-semibold break-words">{issue.tipo}</p>
                      <Badge variant="outline" className={gravitaCls[issue.gravita]}>
                        {issue.gravita}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground break-words">{issue.descrizione}</p>
                  </div>
                  <Select
                    value={issue.stato}
                    onValueChange={(v) => updateStato.mutate({ id: issue.id, stato: v as DataIssue["stato"] })}
                  >
                    <SelectTrigger className={`h-9 w-40 rounded-lg ${statoCls[issue.stato]}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATI.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                  <p className="break-words">
                    <span className="text-xs text-muted-foreground">Riferimento: </span>
                    {[issue.ordine_codice, issue.cliente_nome, issue.azienda_nome, issue.periodo]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </p>
                  <p className="break-words">
                    <span className="text-xs text-muted-foreground">Controllo del: </span>
                    {formatDateTime(issue.controllato_il)}
                  </p>
                  {(issue.valore_rilevato || issue.valore_atteso) && (
                    <p className="break-words">
                      <span className="text-xs text-muted-foreground">Valori: </span>
                      rilevato <span className="tabular-nums">{issue.valore_rilevato ?? "—"}</span>
                      {issue.valore_atteso && (
                        <> · atteso <span className="tabular-nums">{issue.valore_atteso}</span></>
                      )}
                      {issue.differenza && (
                        <> · differenza <span className="font-semibold tabular-nums">{issue.differenza}</span></>
                      )}
                    </p>
                  )}
                  {issue.causa && (
                    <p className="break-words">
                      <span className="text-xs text-muted-foreground">
                        {issue.causa_verificata ? "Causa verificata: " : "Possibile causa: "}
                      </span>
                      {issue.causa}
                    </p>
                  )}
                </div>

                {issue.link && (
                  <Link
                    to={issue.link}
                    className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Apri i dati coinvolti
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}

        {!isLoading && issues && issues.length > 0 && issues.every((i) => i.stato === "risolto") && (
          <div className="flex items-center gap-2 rounded-xl border border-success/20 bg-success/5 p-4 text-sm text-success">
            <CheckCircle2 className="h-4 w-4" />
            Tutte le problematiche risultano risolte.
          </div>
        )}
      </div>
    </MainLayout>
  );
}
