import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Bell, Check, Plus, RotateCcw, Trash2, User } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { ListSkeleton } from "@/components/ui/page-skeleton";
import { PushActivationHint } from "@/components/notifiche/PushActivationHint";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useClienti } from "@/hooks/useClienti";
import {
  type Promemoria,
  useCreatePromemoria,
  useDeletePromemoria,
  usePromemoria,
  useRestorePromemoria,
  useUpdatePromemoria,
} from "@/hooks/usePromemoria";
import {
  GRUPPI_LABEL,
  type GruppoPromemoria,
  RINVII,
  dataRinvio,
  gruppoDi,
  quandoLabel,
  toLocalInput,
} from "@/lib/promemoria";

type FormState = {
  id?: string;
  titolo: string;
  descrizione: string;
  quando: string; // datetime-local
  cliente_id: string;
  importante: boolean;
};

const emptyForm = (clienteId = ""): FormState => ({
  titolo: "",
  descrizione: "",
  quando: toLocalInput(dataRinvio("domani")),
  cliente_id: clienteId,
  importante: false,
});

const ORDINE_GRUPPI: GruppoPromemoria[] = ["scaduti", "oggi", "domani", "prossimi"];

export default function PromemoriaPage() {
  const { data, isLoading, isError, refetch } = usePromemoria();
  const { data: clienti } = useClienti();
  const create = useCreatePromemoria();
  const update = useUpdatePromemoria();
  const remove = useDeletePromemoria();
  const restore = useRestorePromemoria();

  const [form, setForm] = useState<FormState | null>(null);
  // Promemoria su cui si sta decidendo "fatto / ricordamelo di nuovo".
  const [chiusura, setChiusura] = useState<{ p: Promemoria; riattiva: boolean } | null>(null);
  const [dataPersonalizzata, setDataPersonalizzata] = useState("");

  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    if (searchParams.get("nuovo") === "1") {
      setForm(emptyForm(searchParams.get("cliente") ?? ""));
      const next = new URLSearchParams(searchParams);
      next.delete("nuovo");
      next.delete("cliente");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const clientiById = useMemo(() => new Map((clienti ?? []).map((c) => [c.id, c.nome])), [clienti]);
  const clientiOptions = useMemo(
    () => [{ value: "__none__", label: "Nessun cliente" }, ...(clienti ?? []).map((c) => ({ value: c.id, label: c.nome, searchTerms: [c.citta ?? "", c.azienda ?? ""] }))],
    [clienti],
  );

  const gruppi = useMemo(() => {
    const now = new Date();
    const g: Record<GruppoPromemoria, Promemoria[]> = { scaduti: [], oggi: [], domani: [], prossimi: [], fatti: [] };
    for (const p of data ?? []) g[gruppoDi(p, now)].push(p);
    g.fatti.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    return g;
  }, [data]);

  const daFare = (data ?? []).filter((p) => p.stato !== "fatto").length;

  const salva = async () => {
    if (!form || !form.titolo.trim() || !form.quando) return;
    const payload = {
      titolo: form.titolo.trim(),
      descrizione: form.descrizione.trim() || null,
      data_promemoria: new Date(form.quando).toISOString(),
      cliente_id: form.cliente_id || null,
      priorita: form.importante ? "alta" : "media",
    };
    try {
      if (form.id) await update.mutateAsync({ id: form.id, ...payload });
      else await create.mutateAsync(payload);
      toast.success(form.id ? "Promemoria aggiornato" : `Te lo ricorderò ${quandoLabel(payload.data_promemoria).toLowerCase()}`);
      setForm(null);
    } catch {
      toast.error("Promemoria non salvato. Controlla la connessione e riprova.");
    }
  };

  const elimina = async (p: Promemoria) => {
    try {
      await remove.mutateAsync(p.id);
      setForm(null);
      toast("Promemoria eliminato", {
        action: { label: "Annulla", onClick: () => restore.mutate(p) },
      });
    } catch {
      toast.error("Non riesco a eliminarlo. Riprova.");
    }
  };

  const segnaFatto = async (p: Promemoria) => {
    try {
      await update.mutateAsync({ id: p.id, stato: "fatto" });
      setChiusura(null);
      toast.success("Fatto", {
        action: { label: "Annulla", onClick: () => update.mutate({ id: p.id, stato: "da_fare" }) },
      });
    } catch {
      toast.error("Non riesco a salvarlo. Riprova.");
    }
  };

  const ricordaDiNuovo = async (p: Promemoria, when: Date) => {
    try {
      await update.mutateAsync({ id: p.id, stato: "da_fare", data_promemoria: when.toISOString() });
      setChiusura(null);
      toast.success(`Te lo ricorderò ${quandoLabel(when.toISOString()).toLowerCase()}`);
    } catch {
      toast.error("Non riesco a salvarlo. Riprova.");
    }
  };

  const apriModifica = (p: Promemoria) =>
    setForm({
      id: p.id,
      titolo: p.titolo,
      descrizione: p.descrizione ?? "",
      quando: toLocalInput(new Date(p.data_promemoria)),
      cliente_id: p.cliente_id ?? "",
      importante: p.priorita === "alta",
    });

  const apriChiusura = (p: Promemoria, riattiva: boolean) => {
    setDataPersonalizzata(toLocalInput(dataRinvio("domani")));
    setChiusura({ p, riattiva });
  };

  const Riga = ({ p }: { p: Promemoria }) => {
    const fatto = p.stato === "fatto";
    const scaduto = !fatto && new Date(p.data_promemoria).getTime() < Date.now();
    const clienteNome = p.cliente_id ? clientiById.get(p.cliente_id) : undefined;
    return (
      <li className="flex items-start gap-1 py-1 pl-1 pr-2">
        {fatto ? (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center" aria-hidden>
            <Check className="h-5 w-5 text-success" />
          </span>
        ) : (
          <button
            type="button"
            onClick={() => apriChiusura(p, false)}
            aria-label={`Segna come fatto: ${p.titolo}`}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
          >
            <span className={cn("h-5 w-5 rounded-full border-2", scaduto ? "border-destructive" : "border-muted-foreground")} />
          </button>
        )}
        <button
          type="button"
          onClick={() => apriModifica(p)}
          className="min-h-11 min-w-0 flex-1 py-2 text-left"
        >
          <p className={cn("line-clamp-2 break-words text-sm font-medium", fatto && "text-muted-foreground line-through")}>
            {p.titolo}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span className={cn("tabular-nums", scaduto && "font-medium text-destructive")}>
              {quandoLabel(p.data_promemoria)}
            </span>
            {clienteNome && (
              <span className="inline-flex min-w-0 items-center gap-1">
                <User className="h-3 w-3 shrink-0" />
                <span className="truncate">{clienteNome}</span>
              </span>
            )}
            {p.priorita === "alta" && !fatto && <Badge variant="warning">Importante</Badge>}
          </p>
          {p.descrizione && !fatto && (
            <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{p.descrizione}</p>
          )}
        </button>
        {fatto && (
          <div className="flex shrink-0 items-center">
            <Button variant="ghost" size="icon" aria-label={`Ricordamelo di nuovo: ${p.titolo}`} onClick={() => apriChiusura(p, true)}>
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" aria-label={`Elimina: ${p.titolo}`} onClick={() => elimina(p)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        )}
      </li>
    );
  };

  return (
    <MainLayout>
      <div className="mx-auto max-w-3xl space-y-6 pb-16 lg:pb-0">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold">Promemoria</h1>
            <p className="text-sm text-muted-foreground tabular-nums">
              {isLoading
                ? " "
                : gruppi.scaduti.length > 0
                  ? `${gruppi.scaduti.length} scaduti · ${daFare} da fare`
                  : daFare > 0
                    ? `${daFare} da fare`
                    : "Niente in sospeso"}
            </p>
          </div>
          <Button className="hidden lg:inline-flex" onClick={() => setForm(emptyForm())}>
            <Plus className="h-4 w-4" />
            Nuovo promemoria
          </Button>
        </header>

        <PushActivationHint motivo="Senza notifiche i promemoria si vedono solo aprendo l’app." />

        {isLoading ? (
          <ListSkeleton rows={5} />
        ) : isError ? (
          <div className="space-y-3 rounded-xl border bg-card p-6 text-center shadow-card">
            <p className="text-sm font-semibold">Non riesco a caricare i promemoria</p>
            <p className="text-sm text-muted-foreground">Controlla la connessione e riprova.</p>
            <Button variant="outline" onClick={() => refetch()}>Riprova</Button>
          </div>
        ) : !data?.length ? (
          <div className="space-y-3 rounded-xl border bg-card p-6 text-center shadow-card">
            <Bell className="mx-auto h-6 w-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Nessun promemoria. Segna qui le cose da fare, anche legate a un cliente.</p>
            <Button onClick={() => setForm(emptyForm())}>
              <Plus className="h-4 w-4" />
              Crea promemoria
            </Button>
          </div>
        ) : (
          <>
            {daFare === 0 && (
              <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground shadow-card">
                Tutto fatto. I promemoria completati restano qui sotto finché non li elimini.
              </p>
            )}
            {ORDINE_GRUPPI.filter((g) => gruppi[g].length > 0).map((g) => (
              <section key={g} className="space-y-2">
                <h2 className={cn("text-base font-semibold", g === "scaduti" && "text-destructive")}>
                  {GRUPPI_LABEL[g]} <span className="font-normal text-muted-foreground tabular-nums">({gruppi[g].length})</span>
                </h2>
                <ul className="divide-y rounded-xl border bg-card shadow-card">
                  {gruppi[g].map((p) => <Riga key={p.id} p={p} />)}
                </ul>
              </section>
            ))}
            {gruppi.fatti.length > 0 && (
              <details className="group space-y-2">
                <summary className="flex min-h-11 cursor-pointer list-none items-center text-base font-semibold">
                  Fatti <span className="ml-1 font-normal text-muted-foreground tabular-nums">({gruppi.fatti.length})</span>
                  <span className="ml-auto text-xs font-normal text-muted-foreground group-open:hidden">Mostra</span>
                  <span className="ml-auto hidden text-xs font-normal text-muted-foreground group-open:inline">Nascondi</span>
                </summary>
                <ul className="divide-y rounded-xl border bg-card shadow-card">
                  {gruppi.fatti.map((p) => <Riga key={p.id} p={p} />)}
                </ul>
              </details>
            )}
          </>
        )}
      </div>

      {/* Azione principale a portata di pollice su mobile */}
      <div className="fixed inset-x-4 z-30 lg:hidden" style={{ bottom: "calc(4.5rem + env(safe-area-inset-bottom))" }}>
        <Button className="h-12 w-full shadow-card" onClick={() => setForm(emptyForm())}>
          <Plus className="h-4 w-4" />
          Nuovo promemoria
        </Button>
      </div>

      {/* Crea / modifica */}
      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{form?.id ? "Modifica promemoria" : "Nuovo promemoria"}</DialogTitle>
            <DialogDescription className="sr-only">Cosa ricordare e quando</DialogDescription>
          </DialogHeader>
          {form && (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                void salva();
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="pm-titolo">Cosa devi fare</Label>
                <Input
                  id="pm-titolo"
                  autoFocus={!form.id}
                  value={form.titolo}
                  maxLength={200}
                  placeholder="Es. Richiamare per il listino di dicembre"
                  onChange={(e) => setForm({ ...form, titolo: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pm-quando">Quando</Label>
                <div className="flex flex-wrap gap-2">
                  {RINVII.map((r) => (
                    <Button
                      key={r.value}
                      type="button"
                      size="sm"
                      variant={form.quando === toLocalInput(dataRinvio(r.value)) ? "default" : "outline"}
                      onClick={() => setForm({ ...form, quando: toLocalInput(dataRinvio(r.value)) })}
                    >
                      {r.label}
                    </Button>
                  ))}
                </div>
                <Input
                  id="pm-quando"
                  type="datetime-local"
                  value={form.quando}
                  onChange={(e) => setForm({ ...form, quando: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Cliente</Label>
                <SearchableSelect
                  options={clientiOptions}
                  value={form.cliente_id || "__none__"}
                  onValueChange={(v) => setForm({ ...form, cliente_id: v === "__none__" ? "" : v })}
                  placeholder="Nessun cliente"
                  searchPlaceholder="Cerca cliente…"
                  emptyMessage="Nessun cliente trovato"
                />
                {form.cliente_id && (
                  <Link to={`/clienti/${form.cliente_id}`} className="inline-block text-xs text-primary hover:underline">
                    Apri scheda cliente
                  </Link>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="pm-note">Note</Label>
                <Textarea
                  id="pm-note"
                  rows={3}
                  value={form.descrizione}
                  onChange={(e) => setForm({ ...form, descrizione: e.target.value })}
                />
              </div>
              <label className="flex min-h-11 items-center justify-between gap-3 text-sm">
                Importante
                <Switch checked={form.importante} onCheckedChange={(v) => setForm({ ...form, importante: v })} />
              </label>
              <DialogFooter className="gap-2 sm:justify-between">
                {form.id ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => {
                      const p = data?.find((x) => x.id === form.id);
                      if (p) void elimina(p);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Elimina
                  </Button>
                ) : <span />}
                <Button type="submit" disabled={!form.titolo.trim() || !form.quando || create.isPending || update.isPending}>
                  {form.id ? "Salva" : "Crea promemoria"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Fatto? / Ricordamelo di nuovo */}
      <Dialog open={!!chiusura} onOpenChange={(o) => !o && setChiusura(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{chiusura?.riattiva ? "Ricordamelo di nuovo" : "Fatto?"}</DialogTitle>
            <DialogDescription className="line-clamp-3 break-words">{chiusura?.p.titolo}</DialogDescription>
          </DialogHeader>
          {chiusura && (
            <div className="space-y-4">
              {!chiusura.riattiva && (
                <Button className="h-12 w-full" onClick={() => segnaFatto(chiusura.p)}>
                  <Check className="h-4 w-4" />
                  Sì, è fatto
                </Button>
              )}
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {chiusura.riattiva ? "Quando?" : "Oppure ricordamelo di nuovo:"}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {RINVII.map((r) => (
                    <Button key={r.value} variant="outline" className="h-auto min-h-11 whitespace-normal" onClick={() => ricordaDiNuovo(chiusura.p, dataRinvio(r.value))}>
                      {r.label}
                    </Button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    type="datetime-local"
                    aria-label="Data e ora personalizzate"
                    value={dataPersonalizzata}
                    onChange={(e) => setDataPersonalizzata(e.target.value)}
                  />
                  <Button
                    variant="outline"
                    disabled={!dataPersonalizzata}
                    onClick={() => ricordaDiNuovo(chiusura.p, new Date(dataPersonalizzata))}
                  >
                    OK
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
