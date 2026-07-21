import { MainLayout } from "@/components/layout/MainLayout";
import { useErrorLog, useBackendHealth } from "@/hooks/useDiagnostica";
import { useIsAdmin } from "@/hooks/useUserRole";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, AlertCircle, CheckCircle2, ShieldOff, Loader2, Database } from "lucide-react";
import { format } from "date-fns";

export default function Diagnostica() {
  const isAdmin = useIsAdmin();
  const { data: health } = useBackendHealth();
  const { data: errors = [], isLoading } = useErrorLog();

  if (!isAdmin) {
    return (
      <MainLayout>
        <Card className="p-8 text-center surface-noir">
          <ShieldOff className="h-12 w-12 mx-auto text-brand-red mb-3" />
          <h2 className="font-bold text-xl">Accesso riservato agli admin</h2>
        </Card>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <header className="space-y-2">
          <h1 className="font-display text-3xl font-bold flex items-center gap-3">
            <Activity className="h-8 w-8 text-brand-green" /> Diagnostica
          </h1>
          <p className="text-muted-foreground">Stato del backend, ultimi errori, salute tecnica.</p>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-5 surface-noir">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Backend</span>
              {health?.ok ? <CheckCircle2 className="h-5 w-5 text-brand-green" /> : <AlertCircle className="h-5 w-5 text-brand-red" />}
            </div>
            <p className="text-2xl font-bold">{health?.ok ? "OK" : "ERR"}</p>
            <p className="text-xs text-muted-foreground">Latenza: {health?.latency ?? "…"}ms</p>
          </Card>
          <Card className="p-5 surface-noir">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Errori registrati</span>
              <AlertCircle className="h-5 w-5 text-brand-yellow" />
            </div>
            <p className="text-2xl font-bold">{errors.length}</p>
            <p className="text-xs text-muted-foreground">Ultimi 100</p>
          </Card>
          <Card className="p-5 surface-noir">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Database</span>
              <Database className="h-5 w-5 text-brand-blue" />
            </div>
            <p className="text-2xl font-bold">Attivo</p>
            <p className="text-xs text-muted-foreground">Postgres + RLS</p>
          </Card>
        </div>

        <Card className="surface-noir">
          <div className="p-4 border-b border-border">
            <h2 className="font-bold text-lg">Ultimi errori</h2>
          </div>
          {isLoading ? (
            <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : errors.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Nessun errore registrato</div>
          ) : (
            <div className="divide-y divide-border">
              {errors.map((e: any) => (
                <div key={e.id} className="p-4 text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="destructive">{e.level}</Badge>
                    {e.source && <Badge variant="outline">{e.source}</Badge>}
                    <span className="text-xs text-muted-foreground ml-auto">{format(new Date(e.created_at), "dd/MM HH:mm:ss")}</span>
                  </div>
                  <p className="font-mono text-xs break-all">{e.message}</p>
                  {e.route && <p className="text-xs text-muted-foreground">Route: {e.route}</p>}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </MainLayout>
  );
}
