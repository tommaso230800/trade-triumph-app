import { useParams, Link } from "react-router-dom";
import { OrderCompactList } from "@/components/ordini/OrderCompactList";
import { Skeleton } from "@/components/ui/skeleton";
import { DocumentiSection } from "@/components/documenti/DocumentiSection";
import { FileArchive } from '@/components/documenti/FileArchive';
import { AcceptedConditions } from '@/components/proposte/AcceptedConditions';

import { MainLayout } from "@/components/layout/MainLayout";
import { VisitsSection } from "@/components/visite/VisitsSection";
import { CompetitorSection } from "@/components/visite/CompetitorSection";
import { ListinoPersonalizzatoSection } from "@/components/clienti/ListinoPersonalizzatoSection";
import { useCliente, useClienteOrdini } from "@/hooks/useClienti";
import { useCanvassAttive, useCanvassScadute } from "@/hooks/useCanvass";
import { useClientReports } from "@/hooks/useDailyReports";
import { useClienteReorderTracking } from "@/hooks/useReorderTracking";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Building2,
  FileText,
  Euro,
  ShoppingCart,
  Loader2,
  Calendar,
  Gift,
  Percent,
  History,
  ChevronDown,
  ChevronUp,
  Target,
  TrendingUp,
  BookOpen,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useState } from "react";
import { formatEuro } from "@/lib/format";
import { PageSkeleton, ListSkeleton } from "@/components/ui/page-skeleton";
import { ClienteQuickActions } from "@/components/clienti/ClienteQuickActions";
import { isCounted, orderDate } from "@/lib/metricsEngine";
import { formatNumber } from "@/lib/format";

const statusConfig = {
  completato: { label: "Completato", className: "bg-success/10 text-success hover:bg-success/20" },
  in_attesa: { label: "In Attesa", className: "bg-warning/10 text-warning hover:bg-warning/20" },
  spedito: { label: "Spedito", className: "bg-info/10 text-info hover:bg-info/20" },
  annullato: { label: "Annullato", className: "bg-destructive/10 text-destructive hover:bg-destructive/20" },
};

const formatCurrency = (value: number) =>
  formatEuro(value);

const ClienteDettaglio = () => {
  const { id } = useParams<{ id: string }>();
  const { data: cliente, isLoading } = useCliente(id);
  const { data: ordini, isLoading: ordiniLoading } = useClienteOrdini(id);
  const { data: promozioniAttive } = useCanvassAttive();
  const { data: promozioniScadute } = useCanvassScadute();
  const { data: clientReports = [] } = useClientReports(id);
  const { data: reorderData = [] } = useClienteReorderTracking(id);
  const [expandedPromo, setExpandedPromo] = useState<string | null>(null);

  // Filtra le promozioni applicabili a questo cliente
  const promozioniCliente = promozioniAttive?.filter(promo => 
    promo.tutti_clienti || 
    promo.canvass_clienti?.some(cc => cc.cliente_id === id)
  ) || [];

  // Filtra le promozioni scadute applicabili a questo cliente
  const promozioniScaduteCliente = promozioniScadute?.filter(promo => 
    promo.tutti_clienti || 
    promo.canvass_clienti?.some(cc => cc.cliente_id === id)
  ) || [];

  // Filtra gli ordini effettuati durante una promozione
  const getOrdiniDurantePromo = (promo: any) => {
    if (!ordini) return [];
    return ordini.filter(ordine => {
      const dataOrdine = ordine.data_ordine || ordine.created_at?.split("T")[0];
      if (!dataOrdine) return false;
      
      // Check main period
      if (dataOrdine >= promo.data_inizio && dataOrdine <= promo.data_fine) {
        // Check if order is from the same company
        return ordine.azienda_id === promo.azienda_id;
      }
      
      // Check additional periods
      return promo.canvass_periodi?.some((p: any) => 
        dataOrdine >= p.data_inizio && dataOrdine <= p.data_fine && ordine.azienda_id === promo.azienda_id
      );
    });
  };

  if (isLoading) {
    return (
      <MainLayout>
        <PageSkeleton />
      </MainLayout>
    );
  }

  if (!cliente) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Cliente non trovato</p>
          <Link to="/clienti">
            <Button className="mt-4">Torna ai clienti</Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  // Stesse regole del resto dell'app (metricsEngine): data d'ordine, esclusi annullati e stand-by.
  const annoCorrente = new Date().getFullYear();
  const ordiniValidi = (ordini ?? []).filter((o) => isCounted(o));
  const ordiniAnno = ordiniValidi.filter((o) => (orderDate(o) ?? "").startsWith(String(annoCorrente)));
  const fatturatoTotale = ordiniAnno.reduce((sum, o) => sum + Number(o.totale), 0);
  const ordiniCompletati = ordini?.filter((o) => o.status === "completato").length || 0;
  const ordiniEsclusi = (ordini?.length ?? 0) - ordiniValidi.length;
  const ultimoOrdine = ordiniValidi.map((o) => orderDate(o)).filter((d): d is string => !!d).sort().at(-1) ?? null;
  // Il campo storico del cliente è il fatturato 2025: confronto solo quando l'anno precedente è il 2025.
  const fatturatoAnnoPrec = annoCorrente - 1 === 2025 ? cliente.fatturato_2025 ?? null : null;

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon" aria-label="Torna ai clienti">
            <Link to="/clienti">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="break-words text-2xl font-bold tracking-tight text-foreground">
              {cliente.nome}
            </h1>
            <p className="text-sm text-muted-foreground">{[cliente.azienda, cliente.citta].filter(Boolean).join(" · ") || "—"}</p>
          </div>
          <Badge
            className={
              cliente.status === "premium"
                ? "bg-primary/10 text-primary"
                : cliente.status === "standard"
                ? "bg-muted text-muted-foreground"
                : "bg-success/10 text-success"
            }
          >
            {cliente.status.charAt(0).toUpperCase() + cliente.status.slice(1)}
          </Badge>
        </div>

        {/* Azioni a un tocco */}
        <ClienteQuickActions cliente={cliente} />

        {/* Preparazione visite AI + Storico */}
        <VisitsSection clienteId={cliente.id} />

        {/* Concorrenza cliente */}
        <CompetitorSection clienteId={cliente.id} />

        {/* Info Cards */}
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
          {/* Contact Info */}
          <div className="rounded-xl bg-card p-6 shadow-card space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Informazioni
            </h3>
            <div className="space-y-3 text-sm">
              {cliente.partita_iva && (
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span>P.IVA: {cliente.partita_iva}</span>
                </div>
              )}
              {cliente.codice_sdi && (
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span>SDI: {cliente.codice_sdi}</span>
                </div>
              )}
              {(cliente.indirizzo || cliente.citta) && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    {cliente.indirizzo && <p>{cliente.indirizzo}</p>}
                    <p>
                      {cliente.cap} {cliente.citta} {cliente.provincia && `(${cliente.provincia})`}
                    </p>
                  </div>
                </div>
              )}
              {cliente.consorzio && (
                <div className="pt-2">
                  <Badge variant="outline">{cliente.consorzio}</Badge>
                </div>
              )}
            </div>
          </div>

          {/* Contact Details */}
          <div className="rounded-xl bg-card p-6 shadow-card space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Contatti
            </h3>
            <div className="space-y-3 text-sm">
              {cliente.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${cliente.email}`} className="text-primary hover:underline">
                    {cliente.email}
                  </a>
                </div>
              )}
              {cliente.pec && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" />
                  <a href={`mailto:${cliente.pec}`} className="text-primary hover:underline">
                    {cliente.pec} (PEC)
                  </a>
                </div>
              )}
              {cliente.telefono && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${cliente.telefono}`} className="hover:underline">
                    {cliente.telefono}
                  </a>
                </div>
              )}
              {cliente.email_aggiuntive && cliente.email_aggiuntive.length > 0 && (
                <div className="pt-2">
                  <p className="text-xs text-muted-foreground mb-1">Email aggiuntive:</p>
                  {cliente.email_aggiuntive.map((email) => (
                    <a
                      key={email}
                      href={`mailto:${email}`}
                      className="text-primary hover:underline block"
                    >
                      {email}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Fatturato del cliente: anno in corso vs anno precedente */}
          <div className="rounded-xl bg-card p-4 shadow-card space-y-4 sm:p-6">
            <h3 className="text-base font-semibold flex items-center gap-2">
              <Euro className="h-4 w-4 text-primary" />
              Fatturato {annoCorrente}
            </h3>
            <div className="space-y-1">
              <p className="text-3xl font-bold tracking-tight tabular-nums">{formatCurrency(fatturatoTotale)}</p>
              {fatturatoAnnoPrec && fatturatoAnnoPrec > 0 ? (
                <p className="text-sm text-muted-foreground tabular-nums">
                  <span className={fatturatoTotale >= fatturatoAnnoPrec ? "font-medium text-success" : "font-medium text-destructive"}>
                    {formatNumber((fatturatoTotale / fatturatoAnnoPrec) * 100, 1)}%
                  </span>{" "}
                  del {annoCorrente - 1} ({formatCurrency(fatturatoAnnoPrec)})
                  {fatturatoTotale < fatturatoAnnoPrec && ` · mancano ${formatCurrency(fatturatoAnnoPrec - fatturatoTotale)}`}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">Fatturato {annoCorrente - 1}: N/D</p>
              )}
              {fatturatoAnnoPrec && fatturatoAnnoPrec > 0 && (
                <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
                  <div
                    className={`h-full rounded-full ${fatturatoTotale >= fatturatoAnnoPrec ? "bg-success" : "bg-primary"}`}
                    style={{ width: `${Math.min((fatturatoTotale / fatturatoAnnoPrec) * 100, 100)}%` }}
                  />
                </div>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3 border-t pt-3">
              <div>
                <p className="text-xs text-muted-foreground">Ultimo ordine</p>
                <p className="text-sm font-semibold tabular-nums">
                  {ultimoOrdine ? format(new Date(ultimoOrdine.length === 10 ? `${ultimoOrdine}T12:00:00` : ultimoOrdine), "d MMM yyyy", { locale: it }) : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ordini {annoCorrente}</p>
                <p className="text-sm font-semibold tabular-nums">{ordiniAnno.length}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Completati</p>
                <p className="text-sm font-semibold tabular-nums">{ordiniCompletati}</p>
              </div>
            </div>
            {ordiniEsclusi > 0 && (
              <p className="text-xs text-muted-foreground">
                {ordiniEsclusi} {ordiniEsclusi === 1 ? "ordine annullato o in stand-by escluso" : "ordini annullati o in stand-by esclusi"} dal fatturato.
              </p>
            )}
          </div>
        </div>




        {/* Frequenza Riordino per Azienda */}
        {reorderData.length > 0 && (
          <div className="rounded-xl bg-card p-6 shadow-card">
            <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
              <RefreshCw className="h-5 w-5 text-primary" />
              Frequenza Riordino per Azienda
            </h3>
            <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {reorderData.map((rt: any) => {
                const previsto = rt.prossimo_riordino_previsto ? new Date(rt.prossimo_riordino_previsto) : null;
                const giorniRitardo = rt.giorni_ritardo;
                const inRitardo = giorniRitardo > 0;

                return (
                  <div
                    key={rt.id}
                    className={`rounded-lg border p-4 space-y-2 ${inRitardo ? 'border-destructive/50 bg-destructive/5' : 'border-border'}`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">{rt.azienda_nome}</p>
                      {inRitardo && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          +{giorniRitardo} gg
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>Frequenza operativa: <span className="font-semibold text-foreground">{rt.media_giorni_riordino == null ? 'N/D — storico insufficiente' : `${Math.round(rt.media_giorni_riordino)} giorni`}</span></p>
                      <p>Ordini totali: {rt.numero_ordini}</p>
                      {rt.ultimo_ordine_data && (
                        <p>Ultimo ordine: {format(new Date(rt.ultimo_ordine_data), "d MMM yyyy", { locale: it })}</p>
                      )}
                      {previsto && (
                        <p>Prossimo previsto: <span className={inRitardo ? 'text-destructive font-semibold' : 'text-foreground font-semibold'}>
                          {format(previsto, "d MMM yyyy", { locale: it })}
                        </span></p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="rounded-xl bg-card p-4 sm:p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              Storico Ordini
            </h3>
          </div>

          {ordiniLoading ? (
            <div className="space-y-2" aria-busy="true" aria-label="Caricamento ordini">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : !ordini?.length ? (
            <p className="text-center text-muted-foreground py-8">Nessun ordine per questo cliente</p>
          ) : (
            <>
            <OrderCompactList
              className="md:hidden"
              orders={ordini}
              statusConfig={statusConfig}
              formatCurrency={formatCurrency}
              dateField="created_at"
            />
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Codice</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Azienda</TableHead>
                    <TableHead>Prodotti</TableHead>
                    <TableHead className="text-right">Totale</TableHead>
                    <TableHead>Stato</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ordini.map((ordine: any) => (
                    <TableRow key={ordine.id} className="hover:bg-muted/30">
                      <TableCell className="font-mono text-sm font-medium text-primary">
                        {ordine.codice}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(ordine.created_at), "dd MMM yyyy", { locale: it })}
                        </div>
                      </TableCell>
                      <TableCell>{ordine.aziende?.nome || "—"}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {ordine.ordini_righe?.slice(0, 3).map((riga: any) => (
                            <p key={riga.id} className="text-xs">
                              {riga.prodotti?.nome} × {riga.quantita_pezzi + riga.quantita_cartoni * (riga.prodotti?.pezzi_per_cartone || 1)}
                            </p>
                          ))}
                          {ordine.ordini_righe?.length > 3 && (
                            <p className="text-xs text-muted-foreground">
                              +{ordine.ordini_righe.length - 3} altri
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">{formatCurrency(Number(ordine.totale))}</TableCell>
                      <TableCell>
                        <Badge className={statusConfig[ordine.status as keyof typeof statusConfig]?.className}>
                          {statusConfig[ordine.status as keyof typeof statusConfig]?.label || ordine.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            </>
          )}
        </div>

        {id && <ListinoPersonalizzatoSection clienteId={id} />}
        <AcceptedConditions customerId={id}/>
        <section className="space-y-4"><h2 className="text-base font-semibold">File e documenti cliente</h2><FileArchive customerId={id}/></section>

        {/* Promozioni Attive */}
        <div className="rounded-xl bg-card p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              Promozioni Attive
            </h3>
            <Badge variant="outline" className="bg-success/10 text-success">
              {promozioniCliente.length} attive
            </Badge>
          </div>

          {promozioniCliente.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nessuna promozione attiva per questo cliente
            </p>
          ) : (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {promozioniCliente.map((promo) => (
                <div
                  key={promo.id}
                  className="rounded-lg border border-border p-4 space-y-3 hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-foreground">{promo.nome}</h4>
                      <p className="text-sm text-muted-foreground">
                        {promo.azienda?.nome}
                      </p>
                    </div>
                    <Badge className="bg-primary/10 text-primary">
                      {promo.tipo === "sconto_percentuale" && (
                        <><Percent className="h-3 w-3 mr-1" /> {promo.valore}%</>
                      )}
                      {promo.tipo === "prezzo_fisso" && (
                        <>{promo.valore}€</>
                      )}
                      {promo.tipo === "premio_fine_anno" && (
                        <>Premio {promo.valore}%</>
                      )}
                    </Badge>
                  </div>
                  
                  {promo.descrizione && (
                    <p className="text-xs text-muted-foreground">{promo.descrizione}</p>
                  )}
                  
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {format(new Date(promo.data_inizio), "dd MMM", { locale: it })} - {format(new Date(promo.data_fine), "dd MMM yyyy", { locale: it })}
                    </span>
                  </div>

                  {promo.cartoni_acquisto && promo.cartoni_omaggio ? (
                    <div className="flex items-center gap-2 text-xs">
                      <Gift className="h-3 w-3 text-success" />
                      <span className="text-success font-medium">
                        {promo.cartoni_acquisto}+{promo.cartoni_omaggio} cartoni omaggio
                      </span>
                    </div>
                  ) : null}

                  {promo.canvass_prodotti && promo.canvass_prodotti.length > 0 && (
                    <div className="pt-2 border-t border-border">
                      <p className="text-xs text-muted-foreground mb-1">Prodotti inclusi:</p>
                      <div className="flex flex-wrap gap-1">
                        {promo.canvass_prodotti.slice(0, 3).map((cp: any) => (
                          <Badge key={cp.id} variant="outline" className="text-xs">
                            {cp.prodotti?.nome}
                          </Badge>
                        ))}
                        {promo.canvass_prodotti.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{promo.canvass_prodotti.length - 3} altri
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Storico Promozioni Scadute */}
        <div className="rounded-xl bg-card p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Storico Promozioni Scadute
            </h3>
            <Badge variant="outline" className="bg-muted text-muted-foreground">
              {promozioniScaduteCliente.length} promozioni
            </Badge>
          </div>

          {promozioniScaduteCliente.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nessuna promozione scaduta per questo cliente
            </p>
          ) : (
            <div className="space-y-4">
              {promozioniScaduteCliente.map((promo) => {
                const ordiniPromo = getOrdiniDurantePromo(promo);
                const fatturatoPromo = ordiniPromo.reduce((sum, o) => sum + Number(o.totale), 0);
                const isExpanded = expandedPromo === promo.id;
                
                return (
                  <div
                    key={promo.id}
                    className="rounded-lg border border-border overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedPromo(isExpanded ? null : promo.id)}
                      className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-left">
                          <h4 className="font-medium text-foreground">{promo.nome}</h4>
                          <p className="text-sm text-muted-foreground">
                            {promo.azienda?.nome}
                          </p>
                        </div>
                        <Badge variant="outline" className="bg-muted/50">
                          {promo.tipo === "sconto_percentuale" && `${promo.valore}%`}
                          {promo.tipo === "prezzo_fisso" && `${promo.valore}€`}
                          {promo.tipo === "premio_fine_anno" && `Premio ${promo.valore}%`}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-medium">{ordiniPromo.length} ordini</p>
                          <p className="text-xs text-muted-foreground">{formatCurrency(fatturatoPromo)}</p>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(promo.data_inizio), "dd/MM/yy", { locale: it })} - {format(new Date(promo.data_fine), "dd/MM/yy", { locale: it })}
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-border bg-muted/20 p-4">
                        {promo.descrizione && (
                          <p className="text-sm text-muted-foreground mb-4">{promo.descrizione}</p>
                        )}
                        
                        {promo.cartoni_acquisto && promo.cartoni_omaggio ? (
                          <div className="flex items-center gap-2 text-sm mb-4">
                            <Gift className="h-4 w-4 text-success" />
                            <span className="text-success">
                              {promo.cartoni_acquisto}+{promo.cartoni_omaggio} cartoni omaggio
                            </span>
                          </div>
                        ) : null}

                        {promo.canvass_prodotti && promo.canvass_prodotti.length > 0 && (
                          <div className="mb-4">
                            <p className="text-xs text-muted-foreground mb-2">Prodotti inclusi:</p>
                            <div className="flex flex-wrap gap-1">
                              {promo.canvass_prodotti.map((cp: any) => (
                                <Badge key={cp.prodotto_id} variant="outline" className="text-xs">
                                  {cp.prodotti?.nome}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {ordiniPromo.length > 0 ? (
                          <div>
                            <p className="text-xs text-muted-foreground mb-2">Ordini effettuati durante la promozione:</p>
                            <OrderCompactList
                              className="md:hidden bg-card"
                              orders={ordiniPromo}
                              statusConfig={statusConfig}
                              formatCurrency={formatCurrency}
                              showAzienda={false}
                            />
                            <div className="hidden md:block">
                              <Table>
                                <TableHeader>
                                  <TableRow className="bg-muted/50">
                                    <TableHead className="text-xs">Codice</TableHead>
                                    <TableHead className="text-xs">Data</TableHead>
                                    <TableHead className="text-xs">Prodotti</TableHead>
                                    <TableHead className="text-xs text-right">Totale</TableHead>
                                    <TableHead className="text-xs">Stato</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {ordiniPromo.map((ordine: any) => (
                                    <TableRow key={ordine.id} className="hover:bg-muted/30">
                                      <TableCell className="font-mono text-xs font-medium text-primary">
                                        {ordine.codice}
                                      </TableCell>
                                      <TableCell className="text-xs text-muted-foreground">
                                        {format(new Date(ordine.data_ordine || ordine.created_at), "dd/MM/yy", { locale: it })}
                                      </TableCell>
                                      <TableCell className="text-xs">
                                        {ordine.ordini_righe?.length || 0} prodotti
                                      </TableCell>
                                      <TableCell className="text-xs text-right font-semibold tabular-nums">
                                        {formatCurrency(Number(ordine.totale))}
                                      </TableCell>
                                      <TableCell>
                                        <Badge className={`text-xs ${statusConfig[ordine.status as keyof typeof statusConfig]?.className}`}>
                                          {statusConfig[ordine.status as keyof typeof statusConfig]?.label || ordine.status}
                                        </Badge>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            Nessun ordine effettuato durante questa promozione
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Ultimi Report/Note */}
        <div className="rounded-xl bg-card p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Ultimi Report
            </h3>
            <Link to="/diario">
              <Button variant="outline" size="sm">
                Vai al Diario
              </Button>
            </Link>
          </div>

          {clientReports.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nessun report per questo cliente
            </p>
          ) : (
            <div className="space-y-3">
              {clientReports.map((report) => (
                <Link
                  key={report.id}
                  to="/diario"
                  className="block p-3 rounded-lg border border-border hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{report.titolo}</span>
                    <Badge variant="outline" className="text-xs">
                      {format(new Date(report.data_report), "dd MMM", { locale: it })}
                    </Badge>
                  </div>
                  {report.testo_report && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {report.testo_report}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6">
          <DocumentiSection entita="cliente" entita_id={id} title="Documenti cliente" />
        </div>
      </div>
    </MainLayout>

  );
};

export default ClienteDettaglio;
