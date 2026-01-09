import { useParams, Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { useCliente, useClienteOrdini } from "@/hooks/useClienti";
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
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

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

          {/* Stats */}
          <div className="rounded-xl bg-card p-6 shadow-card space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Euro className="h-5 w-5 text-primary" />
              Statistiche
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-2xl font-bold">{formatCurrency(fatturatoTotale)}</p>
                <p className="text-xs text-muted-foreground">Fatturato Totale</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{ordini?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Ordini Totali</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-success">{ordiniCompletati}</p>
                <p className="text-xs text-muted-foreground">Completati</p>
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {ordini?.length ? formatCurrency(fatturatoTotale / ordini.length) : "—"}
                </p>
                <p className="text-xs text-muted-foreground">Media Ordine</p>
              </div>
            </div>
          </div>
        </div>

        {/* Order History */}
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
      </div>
    </MainLayout>
  );
};

export default ClienteDettaglio;
