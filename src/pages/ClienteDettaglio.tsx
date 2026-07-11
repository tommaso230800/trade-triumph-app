import { useParams, Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { VisitsSection } from "@/components/visite/VisitsSection";
import { CompetitorSection } from "@/components/visite/CompetitorSection";
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

const statusConfig = {
  completato: { label: "Completato", className: "bg-success/10 text-success hover:bg-success/20" },
  in_attesa: { label: "In Attesa", className: "bg-warning/10 text-warning hover:bg-warning/20" },
  spedito: { label: "Spedito", className: "bg-info/10 text-info hover:bg-info/20" },
  annullato: { label: "Annullato", className: "bg-destructive/10 text-destructive hover:bg-destructive/20" },
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(value);

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
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
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

  const fatturatoTotale = ordini?.reduce((sum, o) => sum + Number(o.totale), 0) || 0;
  const ordiniCompletati = ordini?.filter((o) => o.status === "completato").length || 0;

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link to="/clienti">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
              {cliente.nome}
            </h1>
            <p className="text-muted-foreground">{cliente.azienda || "—"}</p>
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

          {/* Stats con confronto 2025 */}
          <div className="rounded-xl bg-card p-6 shadow-card space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Euro className="h-5 w-5 text-primary" />
              Statistiche & Confronto 2025
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-2xl font-bold">{formatCurrency(fatturatoTotale)}</p>
                <p className="text-xs text-muted-foreground">Fatturato 2026</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-500">
                  {cliente.fatturato_2025 ? formatCurrency(cliente.fatturato_2025) : "—"}
                </p>
                <p className="text-xs text-muted-foreground">Fatturato 2025</p>
              </div>
              {cliente.fatturato_2025 && cliente.fatturato_2025 > 0 && (
                <>
                  <div className="col-span-2 border-t border-border pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Avanzamento vs 2025:</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${Math.min((fatturatoTotale / cliente.fatturato_2025) * 100, 100)}%` }}
                          />
                        </div>
                        <span className={`text-sm font-semibold ${fatturatoTotale >= cliente.fatturato_2025 ? 'text-success' : 'text-muted-foreground'}`}>
                          {((fatturatoTotale / cliente.fatturato_2025) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Mancano {formatCurrency(Math.max(0, cliente.fatturato_2025 - fatturatoTotale))} per raggiungere il 2025
                    </p>
                  </div>
                </>
              )}
              <div>
                <p className="text-2xl font-bold">{ordini?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Ordini Totali</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-success">{ordiniCompletati}</p>
                <p className="text-xs text-muted-foreground">Completati</p>
              </div>
            </div>
          </div>
        </div>

        {/* Scoring e Budget Promo */}
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          <ClienteScoringCard
            fatturato={cliente.fatturato || 0}
            fatturatoTarget={cliente.fatturato_target || 10000}
            nPromo={cliente.n_promo_concesse || 0}
            crescitaPercentuale={0}
            nomeCliente={cliente.nome}
          />
          <BudgetPromoCalculator
            clienteFatturato={cliente.fatturato || 0}
            clienteBudgetPercentuale={cliente.budget_promo_percentuale || 5}
            clienteCostoPromoGiaConcesse={cliente.costo_promo_totale || 0}
            clienteScontoMaxPolicy={cliente.sconto_max_policy || 15}
          />
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
                const oggi = new Date();
                const previsto = rt.prossimo_riordino_previsto ? new Date(rt.prossimo_riordino_previsto) : null;
                const inRitardo = previsto && oggi > previsto;
                const giorniRitardo = previsto ? Math.max(0, Math.floor((oggi.getTime() - previsto.getTime()) / (1000 * 60 * 60 * 24))) : 0;

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
                      <p>Media riordino: <span className="font-semibold text-foreground">{Math.round(rt.media_giorni_riordino)} giorni</span></p>
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

        <div className="rounded-xl bg-card p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              Storico Ordini
            </h3>
          </div>

          {ordiniLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : !ordini?.length ? (
            <p className="text-center text-muted-foreground py-8">Nessun ordine per questo cliente</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Codice</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Azienda</TableHead>
                    <TableHead>Prodotti</TableHead>
                    <TableHead>Totale</TableHead>
                    <TableHead>Status</TableHead>
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
                      <TableCell className="font-semibold">{formatCurrency(Number(ordine.totale))}</TableCell>
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
          )}
        </div>

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
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow className="bg-muted/50">
                                    <TableHead className="text-xs">Codice</TableHead>
                                    <TableHead className="text-xs">Data</TableHead>
                                    <TableHead className="text-xs">Prodotti</TableHead>
                                    <TableHead className="text-xs">Totale</TableHead>
                                    <TableHead className="text-xs">Status</TableHead>
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
                                      <TableCell className="text-xs font-semibold">
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
      </div>
    </MainLayout>
  );
};

export default ClienteDettaglio;
