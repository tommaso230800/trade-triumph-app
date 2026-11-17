import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Receipt, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp,
  Trash2,
  Calendar,
  Banknote,
} from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { useScadenziario, ScadenziarioFattura } from "@/hooks/useScadenziario";
import { ImportExcelDialog } from "@/components/scadenziario/ImportExcelDialog";
import { SegnaIncassataDialog } from "@/components/scadenziario/SegnaIncassataDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatEuro, formatPercent } from "@/lib/format";

export const ScadenziarioTab = () => {
  const {
    fattureScadute,
    fattureIncassate,
    provvigioniDaIncassare,
    provvigioniIncassate,
    loadingScadute,
    loadingIncassate,
    eliminaFattura,
    segnaProvvigioneIncassata,
    totaleScaduto,
    provvigionePotenziale,
    totaleIncassato,
    provvigioneMaturata,
    totaleProvvigioniDaIncassare,
    totaleProvvigioniIncassate,
  } = useScadenziario();

  const [incassataDialog, setIncassataDialog] = useState<{
    open: boolean;
    fattura: ScadenziarioFattura | null;
  }>({ open: false, fattura: null });

  const [confirmProvvigione, setConfirmProvvigione] = useState<ScadenziarioFattura | null>(null);

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    fattura: ScadenziarioFattura | null;
  }>({ open: false, fattura: null });

  const calcGiorniRitardo = (dataScadenza: string): number => {
    const oggi = new Date();
    const scadenza = parseISO(dataScadenza);
    return differenceInDays(oggi, scadenza);
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return format(parseISO(date), 'dd/MM/yyyy', { locale: it });
  };

  const handleDelete = async () => {
    if (deleteDialog.fattura) {
      await eliminaFattura.mutateAsync(deleteDialog.fattura.id);
      setDeleteDialog({ open: false, fattura: null });
    }
  };


  const scaduteCount = fattureScadute.filter((f) => calcGiorniRitardo(f.data_scadenza) > 0).length;

  const RitardoBadge = ({ giorni }: { giorni: number }) =>
    giorni > 0 ? (
      <Badge variant="destructive" className="whitespace-nowrap tabular-nums">Scaduta da {giorni} gg</Badge>
    ) : giorni === 0 ? (
      <Badge variant="warning" className="whitespace-nowrap">Scade oggi</Badge>
    ) : (
      <Badge variant="outline" className="whitespace-nowrap tabular-nums">Tra {Math.abs(giorni)} gg</Badge>
    );

  const ListSkeleton = () => (
    <div className="space-y-2" aria-busy="true" aria-label="Caricamento">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-lg" />
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header con importazione */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold">Scadenziario clienti</h3>
          <p className="text-sm text-muted-foreground">
            Fatture da incassare e provvigioni maturate
          </p>
        </div>
        <ImportExcelDialog />
      </div>

      {/* KPI: il dato protagonista è quanto i clienti devono ancora pagare */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="col-span-2 rounded-xl border bg-card p-4 shadow-card md:col-span-1">
          <p className="text-xs text-muted-foreground">Da incassare dai clienti</p>
          <p className="text-3xl font-bold tracking-tight tabular-nums">{formatEuro(totaleScaduto)}</p>
          {scaduteCount > 0 ? (
            <p className="mt-1 flex items-center gap-1 text-xs font-medium text-destructive">
              <AlertTriangle className="h-3 w-3" />
              {scaduteCount} {scaduteCount === 1 ? "fattura scaduta" : "fatture scadute"}
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">Nessuna fattura scaduta</p>
          )}
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-card">
          <p className="text-xs text-muted-foreground">Provv. da ricevere</p>
          <p className="whitespace-nowrap text-lg font-bold tabular-nums sm:text-xl text-warning">{formatEuro(totaleProvvigioniDaIncassare)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-card">
          <p className="text-xs text-muted-foreground">Provv. incassate</p>
          <p className="whitespace-nowrap text-lg font-bold tabular-nums sm:text-xl text-success">{formatEuro(totaleProvvigioniIncassate)}</p>
        </div>
        <div className="col-span-2 rounded-xl border bg-card p-4 shadow-card md:col-span-1">
          <p className="text-xs text-muted-foreground">Provv. totale maturata</p>
          <p className="whitespace-nowrap text-lg font-bold tabular-nums sm:text-xl">{formatEuro(provvigioneMaturata)}</p>
        </div>
      </div>

      {/* Sotto-schede */}
      <Tabs defaultValue="scadenziario" className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-3">
          <TabsTrigger value="scadenziario" className="min-h-11 whitespace-normal text-xs sm:text-sm">
            Da incassare ({fattureScadute.length})
          </TabsTrigger>
          <TabsTrigger value="provvigioni_da_incassare" className="min-h-11 whitespace-normal text-xs sm:text-sm">
            Provv. da ricevere ({provvigioniDaIncassare.length})
          </TabsTrigger>
          <TabsTrigger value="incassate" className="min-h-11 whitespace-normal text-xs sm:text-sm">
            Incassate ({provvigioniIncassate.length})
          </TabsTrigger>
        </TabsList>

        {/* Fatture da incassare */}
        <TabsContent value="scadenziario">
          <Card>
            <CardHeader>
              <CardTitle>Fatture da incassare</CardTitle>
              <CardDescription>Fatture scadute o in scadenza ancora da incassare</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingScadute ? (
                <ListSkeleton />
              ) : fattureScadute.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <Receipt className="mx-auto h-6 w-6 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Nessuna fattura da incassare</p>
                  <p className="text-xs text-muted-foreground">Importa uno scadenziario Excel per iniziare</p>
                </div>
              ) : (
                <>
                  {/* Mobile */}
                  <ul className="md:hidden divide-y rounded-lg border">
                    {fattureScadute.map((fattura) => {
                      const giorni = calcGiorniRitardo(fattura.data_scadenza);
                      return (
                        <li
                          key={fattura.id}
                          className={cn("space-y-2 p-3", giorni > 0 && "border-l-4 border-l-destructive")}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="line-clamp-2 break-words text-sm font-semibold">{fattura.cliente_nome}</p>
                              <p className="truncate text-xs text-muted-foreground">
                                {[fattura.azienda_nome, fattura.numero_fattura && `Fatt. ${fattura.numero_fattura}`].filter(Boolean).join(" · ")}
                              </p>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="text-sm font-semibold tabular-nums">{formatEuro(Number(fattura.importo))}</p>
                              <p className="text-xs text-muted-foreground tabular-nums">
                                provv. {formatEuro(Number(fattura.provvigione_calcolata))}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <RitardoBadge giorni={giorni} />
                            <span className="text-xs text-muted-foreground tabular-nums">{formatDate(fattura.data_scadenza)}</span>
                          </div>
                          <div className="flex items-center justify-end gap-2">
                            <div className="flex shrink-0 items-center">
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Elimina fattura ${fattura.numero_fattura ?? ""}`}
                                onClick={() => setDeleteDialog({ open: true, fattura })}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                              <Button size="sm" onClick={() => setIncassataDialog({ open: true, fattura })}>
                                <CheckCircle2 className="h-4 w-4" />
                                Incassa
                              </Button>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>

                  {/* Desktop */}
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Azienda</TableHead>
                          <TableHead>N. fattura</TableHead>
                          <TableHead>Scadenza</TableHead>
                          <TableHead>Stato</TableHead>
                          <TableHead className="text-right">Importo</TableHead>
                          <TableHead className="text-right">Provvigione</TableHead>
                          <TableHead className="text-right"><span className="sr-only">Azioni</span></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {fattureScadute.map((fattura) => {
                          const giorni = calcGiorniRitardo(fattura.data_scadenza);
                          return (
                            <TableRow key={fattura.id}>
                              <TableCell className="font-medium">{fattura.cliente_nome}</TableCell>
                              <TableCell>{fattura.azienda_nome}</TableCell>
                              <TableCell>{fattura.numero_fattura}</TableCell>
                              <TableCell className="tabular-nums">{formatDate(fattura.data_scadenza)}</TableCell>
                              <TableCell><RitardoBadge giorni={giorni} /></TableCell>
                              <TableCell className="text-right font-medium tabular-nums">
                                {formatEuro(Number(fattura.importo))}
                              </TableCell>
                              <TableCell className="text-right tabular-nums text-muted-foreground">
                                {formatEuro(Number(fattura.provvigione_calcolata))}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Button size="sm" onClick={() => setIncassataDialog({ open: true, fattura })}>
                                    <CheckCircle2 className="h-4 w-4" />
                                    Incassa
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    aria-label={`Elimina fattura ${fattura.numero_fattura ?? ""}`}
                                    onClick={() => setDeleteDialog({ open: true, fattura })}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Provvigioni da ricevere */}
        <TabsContent value="provvigioni_da_incassare">
          <Card>
            <CardHeader>
              <CardTitle>Provvigioni da ricevere</CardTitle>
              <CardDescription>
                Fatture incassate dal cliente, provvigione ancora da riscuotere dall'azienda
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingIncassate ? (
                <ListSkeleton />
              ) : provvigioniDaIncassare.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <Banknote className="mx-auto h-6 w-6 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Nessuna provvigione da ricevere</p>
                </div>
              ) : (
                <>
                  <ul className="md:hidden divide-y rounded-lg border">
                    {provvigioniDaIncassare.map((fattura) => (
                      <li key={fattura.id} className="flex items-center gap-3 p-3">
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 break-words text-sm font-semibold">{fattura.cliente_nome}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {[fattura.azienda_nome, fattura.trimestre_provvigione, `incassata ${formatDate(fattura.data_incasso)}`].filter(Boolean).join(" · ")}
                          </p>
                          <p className="text-sm font-semibold tabular-nums text-warning">
                            {formatEuro(Number(fattura.provvigione_calcolata))}
                          </p>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => setConfirmProvvigione(fattura)}>
                          <CheckCircle2 className="h-4 w-4" />
                          Ricevuta
                        </Button>
                      </li>
                    ))}
                  </ul>
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Azienda</TableHead>
                          <TableHead>N. fattura</TableHead>
                          <TableHead>Incasso cliente</TableHead>
                          <TableHead className="text-right">Importo</TableHead>
                          <TableHead className="text-right">Provvigione</TableHead>
                          <TableHead>Trimestre</TableHead>
                          <TableHead className="text-right"><span className="sr-only">Azioni</span></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {provvigioniDaIncassare.map((fattura) => (
                          <TableRow key={fattura.id}>
                            <TableCell className="font-medium">{fattura.cliente_nome}</TableCell>
                            <TableCell>{fattura.azienda_nome}</TableCell>
                            <TableCell>{fattura.numero_fattura}</TableCell>
                            <TableCell className="tabular-nums">{formatDate(fattura.data_incasso)}</TableCell>
                            <TableCell className="text-right tabular-nums">{formatEuro(Number(fattura.importo))}</TableCell>
                            <TableCell className="text-right font-medium tabular-nums text-warning">
                              {formatEuro(Number(fattura.provvigione_calcolata))}
                            </TableCell>
                            <TableCell><Badge variant="outline">{fattura.trimestre_provvigione}</Badge></TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" variant="outline" onClick={() => setConfirmProvvigione(fattura)}>
                                <CheckCircle2 className="h-4 w-4" />
                                Ricevuta
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Provvigioni incassate */}
        <TabsContent value="incassate">
          <div className="space-y-6">
            {loadingIncassate ? (
              <ListSkeleton />
            ) : provvigioniIncassate.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center space-y-2 sm:py-8">
                  <TrendingUp className="mx-auto h-6 w-6 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Nessuna provvigione incassata</p>
                </CardContent>
              </Card>
            ) : (
              (() => {
                const perTrimestre = provvigioniIncassate.reduce((acc, f) => {
                  const trimestre = f.trimestre_provvigione || 'Non classificato';
                  if (!acc[trimestre]) acc[trimestre] = [];
                  acc[trimestre].push(f);
                  return acc;
                }, {} as Record<string, ScadenziarioFattura[]>);

                return Object.entries(perTrimestre)
                  .sort((a, b) => b[0].localeCompare(a[0]))
                  .map(([trimestre, fatture]) => {
                    const totTrimestre = fatture.reduce((s, f) => s + Number(f.provvigione_calcolata), 0);
                    return (
                      <Card key={trimestre}>
                        <CardHeader>
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <CardTitle>{trimestre}</CardTitle>
                            </div>
                            <p className="text-base font-semibold tabular-nums text-success">{formatEuro(totTrimestre)}</p>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <ul className="md:hidden divide-y rounded-lg border">
                            {fatture.map((fattura) => (
                              <li key={fattura.id} className="flex items-center justify-between gap-3 p-3">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium">{fattura.cliente_nome}</p>
                                  <p className="truncate text-xs text-muted-foreground">
                                    {[fattura.azienda_nome, formatDate(fattura.data_incasso_provvigione)].filter(Boolean).join(" · ")}
                                  </p>
                                </div>
                                <p className="shrink-0 text-sm font-semibold tabular-nums text-success">
                                  {formatEuro(Number(fattura.provvigione_calcolata))}
                                </p>
                              </li>
                            ))}
                          </ul>
                          <div className="hidden md:block">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Cliente</TableHead>
                                  <TableHead>Azienda</TableHead>
                                  <TableHead>N. fattura</TableHead>
                                  <TableHead>Incasso provv.</TableHead>
                                  <TableHead className="text-right">Importo</TableHead>
                                  <TableHead className="text-right">% provv.</TableHead>
                                  <TableHead className="text-right">Provvigione</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {fatture.map((fattura) => (
                                  <TableRow key={fattura.id}>
                                    <TableCell className="font-medium">{fattura.cliente_nome}</TableCell>
                                    <TableCell>{fattura.azienda_nome}</TableCell>
                                    <TableCell>{fattura.numero_fattura}</TableCell>
                                    <TableCell className="tabular-nums">{formatDate(fattura.data_incasso_provvigione)}</TableCell>
                                    <TableCell className="text-right tabular-nums">{formatEuro(Number(fattura.importo))}</TableCell>
                                    <TableCell className="text-right tabular-nums">
                                      {formatPercent(Number(fattura.percentuale_provvigione))}
                                    </TableCell>
                                    <TableCell className="text-right font-medium tabular-nums text-success">
                                      {formatEuro(Number(fattura.provvigione_calcolata))}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  });
              })()
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog Segna Incassata */}
      <SegnaIncassataDialog
        fattura={incassataDialog.fattura}
        open={incassataDialog.open}
        onOpenChange={(open) => setIncassataDialog({ open, fattura: open ? incassataDialog.fattura : null })}
      />

      {/* Conferma provvigione ricevuta (prima era un tocco senza conferma) */}
      <AlertDialog open={!!confirmProvvigione} onOpenChange={(open) => !open && setConfirmProvvigione(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Provvigione ricevuta?</AlertDialogTitle>
            <AlertDialogDescription>
              Segno come ricevuta oggi la provvigione di{" "}
              {confirmProvvigione ? formatEuro(Number(confirmProvvigione.provvigione_calcolata)) : ""} per{" "}
              {confirmProvvigione?.cliente_nome}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!confirmProvvigione) return;
                const oggi = new Date().toISOString().split('T')[0];
                segnaProvvigioneIncassata.mutate({ id: confirmProvvigione.id, data_incasso_provvigione: oggi });
                setConfirmProvvigione(null);
              }}
            >
              Conferma
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Conferma Eliminazione */}
      <AlertDialog 
        open={deleteDialog.open} 
        onOpenChange={(open) => setDeleteDialog({ open, fattura: open ? deleteDialog.fattura : null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Elimina fattura</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare la fattura {deleteDialog.fattura?.numero_fattura}? 
              Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
