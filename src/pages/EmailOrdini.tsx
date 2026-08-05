import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Mail, Paperclip, ChevronDown, ExternalLink, Check, Trash2, AlertTriangle, Inbox } from "lucide-react";
import { useEmailIngest, useEmailIngestActions, type EmailIngest } from "@/hooks/useEmailIngest";

const fmtEur = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

const statoBadge: Record<string, { label: string; className: string }> = {
  abbinata: { label: "Abbinata", className: "bg-green-500/15 text-green-600 border-green-500/30" },
  da_rivedere: { label: "Da rivedere", className: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  senza_allegati: { label: "Senza allegati", className: "bg-muted text-muted-foreground border-border" },
  in_elaborazione: { label: "In elaborazione", className: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
  errore: { label: "Errore", className: "bg-red-500/15 text-red-600 border-red-500/30" },
  archiviata: { label: "Archiviata", className: "bg-muted text-muted-foreground border-border" },
};

function EmailCard({ email }: { email: EmailIngest }) {
  const [open, setOpen] = useState(false);
  const { aggiornaStato, elimina, apriAllegato } = useEmailIngestActions();
  const badge = statoBadge[email.stato] ?? { label: email.stato, className: "bg-muted text-muted-foreground border-border" };

  const ordine = email.email_allegati?.find((a) => a.parsed_data?.ordine)?.parsed_data?.ordine;

  return (
    <Card className="rounded-xl">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full text-left p-4 min-h-[44px]">
            <div className="flex items-start gap-3">
              <Mail className="h-4 w-4 mt-1 text-muted-foreground shrink-0" />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold truncate">{email.subject || "(senza oggetto)"}</span>
                  <Badge variant="outline" className={badge.className}>{badge.label}</Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {email.from_email || "—"} · {fmtDate(email.received_at)} · {email.email_allegati?.length || 0} allegati
                </p>
                {email.match_motivo && (
                  <p className="text-xs text-muted-foreground line-clamp-1">{email.match_motivo}</p>
                )}
              </div>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4">
            {email.errore_testo && (
              <div className="flex gap-2 text-xs text-red-600">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{email.errore_testo}</span>
              </div>
            )}

            {ordine && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Dati estratti</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Cliente</p>
                    <p className="font-medium truncate">{ordine.cliente_nome || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Azienda</p>
                    <p className="font-medium truncate">{ordine.azienda_nome || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Data</p>
                    <p className="font-medium tabular-nums">{ordine.data_ordine || "—"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Imponibile</p>
                    <p className="font-semibold tabular-nums">
                      {ordine.imponibile_totale ? fmtEur.format(Number(ordine.imponibile_totale)) : "—"}
                    </p>
                  </div>
                </div>
                {Array.isArray(ordine.righe) && ordine.righe.length > 0 && (
                  <div className="space-y-1">
                    {ordine.righe.slice(0, 12).map((r: any, i: number) => (
                      <div key={i} className="flex items-center justify-between gap-3 text-xs border-b border-border/60 py-1">
                        <span className="truncate">{r.nome_prodotto || r.codice_prodotto || "—"}</span>
                        <span className="tabular-nums text-muted-foreground shrink-0">
                          {Number(r.quantita_cartoni ?? 0)} ct · {fmtEur.format(Number(r.prezzo_per_cartone ?? 0))}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              {email.email_allegati?.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-xs truncate">{a.file_name}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => apriAllegato(a.storage_path)}>
                    Apri
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {email.ordine_id && (
                <Button asChild size="sm" variant="outline">
                  <Link to="/ordini">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Ordine {email.ordini?.codice || ""}
                  </Link>
                </Button>
              )}
              {email.stato !== "archiviata" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => aggiornaStato.mutate({ id: email.id, stato: "archiviata" })}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Segna come rivista
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => elimina.mutate(email.id)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Elimina
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export default function EmailOrdini() {
  const { data, isLoading } = useEmailIngest();
  const [tab, setTab] = useState<"da_rivedere" | "abbinata" | "errore" | "tutte">("da_rivedere");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const emails = data || [];
  const filtered = useMemo(
    () => (tab === "tutte" ? emails : emails.filter((e) => e.stato === tab)),
    [emails, tab],
  );

  const conta = (s: string) => emails.filter((e) => e.stato === s).length;

  return (
    <div className="min-h-[100dvh] bg-background">
      <Sidebar mobileOpen={mobileMenuOpen} onMobileOpenChange={setMobileMenuOpen} />
      <main className="lg:pl-64 pb-24 lg:pb-8">
        <div className="p-4 lg:p-6 space-y-6 animate-rise-in">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">Email ordini</h1>
            <p className="text-sm text-muted-foreground">
              Conferme e proforma ricevute via email, elaborate automaticamente.
            </p>
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <TabsList className="w-full grid grid-cols-4">
              <TabsTrigger value="da_rivedere">Da rivedere ({conta("da_rivedere")})</TabsTrigger>
              <TabsTrigger value="abbinata">Abbinate ({conta("abbinata")})</TabsTrigger>
              <TabsTrigger value="errore">Errori ({conta("errore")})</TabsTrigger>
              <TabsTrigger value="tutte">Tutte ({emails.length})</TabsTrigger>
            </TabsList>
          </Tabs>

          {isLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <Card className="rounded-xl">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Inbox className="h-4 w-4 text-muted-foreground" />
                  Nessuna email in questa vista
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Inoltra una conferma d'ordine all'indirizzo dedicato: comparirà qui in pochi secondi.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filtered.map((e) => (
                <EmailCard key={e.id} email={e} />
              ))}
            </div>
          )}
        </div>
      </main>
      <BottomNav onMenuClick={() => setMobileMenuOpen(true)} />
    </div>
  );
}
