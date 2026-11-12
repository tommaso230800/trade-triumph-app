import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, PackagePlus, Send, Clock, FlaskConical, Inbox } from "lucide-react";
import { toast } from "sonner";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DeviceSection } from "@/components/notifiche/DeviceSection";
import {
  CATEGORIE_PREFERENZE, useMarkRead, useNotifiche, usePreferenze, useSetPreferenza, type Notifica,
} from "@/hooks/useNotifiche";
import { cn } from "@/lib/utils";

type Filtro = "tutte" | "non_lette" | "nuovo_ordine" | "ordine_inviato" | "riordino";
const FILTRI: Array<{ id: Filtro; label: string }> = [
  { id: "tutte", label: "Tutte" },
  { id: "non_lette", label: "Non lette" },
  { id: "nuovo_ordine", label: "Nuovi ordini" },
  { id: "ordine_inviato", label: "Ordini inviati" },
  { id: "riordino", label: "Riordini" },
];

const ICONS = { nuovo_ordine: PackagePlus, ordine_inviato: Send, riordino: Clock, test: FlaskConical } as const;
const TONE = {
  nuovo_ordine: "bg-success/10 text-success",
  ordine_inviato: "bg-info/10 text-info",
  riordino: "bg-warning/10 text-warning",
  test: "bg-muted text-muted-foreground",
} as const;

const romeDay = (iso: string) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(new Date(iso));
function dayLabel(iso: string) {
  const d = romeDay(iso);
  const today = romeDay(new Date().toISOString());
  const yesterday = romeDay(new Date(Date.now() - 86400000).toISOString());
  if (d === today) return "Oggi";
  if (d === yesterday) return "Ieri";
  return new Date(iso).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Rome" });
}
const time = (iso: string) => new Date(iso).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });

function NotificaRow({ n, onOpen }: { n: Notifica; onOpen: (n: Notifica) => void }) {
  const Icon = ICONS[n.categoria] ?? Bell;
  const meta = n.metadata ?? {};
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(n)}
        className={cn(
          "flex w-full min-w-0 items-start gap-3 rounded-xl border p-4 text-left transition-colors duration-150 hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          n.read_at ? "bg-card" : "border-primary/30 bg-primary/5",
        )}
      >
        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", TONE[n.categoria])}><Icon className="h-5 w-5" /></span>
        <span className="min-w-0 flex-1 space-y-1">
          <span className="flex items-start justify-between gap-2">
            <span className={cn("break-words text-sm", n.read_at ? "font-medium" : "font-semibold")}>{n.titolo}</span>
            <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground tabular-nums">
              {time(n.created_at)}
              {!n.read_at && <span className="h-2 w-2 rounded-full bg-primary" aria-label="Non letta" />}
            </span>
          </span>
          <span className="block break-words text-sm text-muted-foreground">{n.testo}</span>
          {(n.cliente_nome || n.azienda_nome) && (
            <span className="block break-words text-xs text-muted-foreground">{[n.cliente_nome, n.azienda_nome].filter(Boolean).join(" · ")}</span>
          )}
          {n.categoria === "ordine_inviato" && (
            <span className="block text-xs text-muted-foreground">Accettato dal servizio email · consegna al destinatario non verificabile</span>
          )}
          {n.push_mode === "silenzioso" && meta.iniziale === true && (
            <span className="block text-xs text-muted-foreground">Già in ritardo all’attivazione del Centro notifiche: registrato senza notifica push</span>
          )}
        </span>
      </button>
    </li>
  );
}

function Preferenze() {
  const { data: prefs, isLoading } = usePreferenze();
  const setPref = useSetPreferenza();
  return (
    <section className="space-y-4" aria-labelledby="pref-title">
      <div>
        <h2 id="pref-title" className="text-base font-semibold">Categorie</h2>
        <p className="text-xs text-muted-foreground">Le categorie disattivate non generano nuovi avvisi per il tuo profilo. Gli altri utenti non cambiano.</p>
      </div>
      <ul className="divide-y rounded-xl border bg-card shadow-sm">
        {CATEGORIE_PREFERENZE.map((c) => (
          <li key={c.id} className="flex min-h-14 items-center justify-between gap-4 p-4">
            <label htmlFor={`pref-${c.id}`} className="min-w-0 cursor-pointer">
              <span className="block text-sm font-medium">{c.label}</span>
              <span className="block text-xs text-muted-foreground">{c.help}</span>
            </label>
            {isLoading ? <Skeleton className="h-6 w-11" /> : (
              <Switch
                id={`pref-${c.id}`}
                checked={prefs?.[c.id] ?? true}
                disabled={setPref.isPending}
                onCheckedChange={(enabled) => setPref.mutate({ categoria: c.id, enabled }, {
                  onSuccess: () => toast.success(`${c.label}: ${enabled ? "attive" : "disattivate"}`),
                  onError: () => toast.error("Preferenza non salvata. Riprova."),
                })}
              />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function CentroNotifiche() {
  const navigate = useNavigate();
  const { data = [], isLoading, isError, refetch } = useNotifiche();
  const markRead = useMarkRead();
  const [filtro, setFiltro] = useState<Filtro>(() => (localStorage.getItem("notifiche_filtro") as Filtro) || "tutte");
  const changeFiltro = (f: Filtro) => { setFiltro(f); localStorage.setItem("notifiche_filtro", f); };

  const unread = data.filter((n) => !n.read_at).length;
  const filtered = useMemo(() => data.filter((n) =>
    filtro === "tutte" ? true : filtro === "non_lette" ? !n.read_at : n.categoria === filtro), [data, filtro]);
  const groups = useMemo(() => {
    const out: Array<{ label: string; items: Notifica[] }> = [];
    for (const n of filtered) {
      const label = dayLabel(n.created_at);
      const last = out[out.length - 1];
      if (last?.label === label) last.items.push(n); else out.push({ label, items: [n] });
    }
    return out;
  }, [filtered]);

  const open = (n: Notifica) => {
    if (!n.read_at) markRead.mutate([n.id]);
    if (n.link && n.link.startsWith("/")) navigate(n.link);
  };

  return (
    <MainLayout>
      <div className="min-w-0 space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold">Centro notifiche</h1>
            <p className="text-xs text-muted-foreground">{unread > 0 ? `${unread} da leggere` : "Tutto letto"}</p>
          </div>
        </header>

        <Tabs defaultValue="avvisi" className="space-y-6">
          <TabsList className="grid h-auto w-full grid-cols-2 lg:w-96">
            <TabsTrigger value="avvisi" className="min-h-10">Avvisi</TabsTrigger>
            <TabsTrigger value="impostazioni" className="min-h-10">Dispositivi e preferenze</TabsTrigger>
          </TabsList>

          <TabsContent value="avvisi" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div role="tablist" aria-label="Filtra notifiche" className="flex flex-wrap gap-2">
                {FILTRI.map((f) => (
                  <Button
                    key={f.id}
                    role="tab"
                    aria-selected={filtro === f.id}
                    variant={filtro === f.id ? "default" : "outline"}
                    size="sm"
                    className="h-9"
                    onClick={() => changeFiltro(f.id)}
                  >
                    {f.label}{f.id === "non_lette" && unread > 0 ? ` (${unread})` : ""}
                  </Button>
                ))}
              </div>
              <Button variant="ghost" className="h-11" disabled={unread === 0 || markRead.isPending}
                onClick={() => markRead.mutate("all", { onSuccess: () => toast.success("Tutte le notifiche segnate come lette") })}>
                <CheckCheck className="mr-2 h-4 w-4" />Segna tutte come lette
              </Button>
            </div>

            {isError ? (
              <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border p-4 text-sm">Notifiche non disponibili. Controlla la connessione. <Button variant="outline" onClick={() => refetch()}>Riprova</Button></div>
            ) : isLoading ? (
              <div className="space-y-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-8 text-center">
                <Inbox className="h-6 w-6 text-muted-foreground" />
                <p className="text-sm font-medium">{filtro === "non_lette" ? "Nessuna notifica da leggere" : "Nessuna notifica"}</p>
                <p className="text-xs text-muted-foreground">Qui trovi nuovi ordini, ordini inviati e riordini in ritardo appena succedono.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {groups.map((g) => (
                  <section key={g.label} className="space-y-2">
                    <h2 className="text-xs font-medium capitalize text-muted-foreground">{g.label}</h2>
                    <ul className="space-y-2">{g.items.map((n) => <NotificaRow key={n.id} n={n} onOpen={open} />)}</ul>
                  </section>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="impostazioni" className="grid gap-8 lg:grid-cols-2">
            <DeviceSection />
            <Preferenze />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
