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


  return (
    <div className="space-y-6">
      {/* Header con importazione */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Scadenziario Clienti</h3>
          <p className="text-sm text-muted-foreground">
            Gestisci le fatture da incassare e le provvigioni maturate
          </p>
        </div>
        <ImportExcelDialog />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Da Incassare (Clienti)</p>
                <p className="text-2xl font-bold">€{totaleScaduto.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Banknote className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Provv. da Incassare</p>
                <p className="text-2xl font-bold text-amber-600">€{totaleProvvigioniDaIncassare.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Provv. Incassate</p>
                <p className="text-2xl font-bold text-green-600">€{totaleProvvigioniIncassate.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Provv. Totale Maturata</p>
                <p className="text-2xl font-bold">€{provvigioneMaturata.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sub-Tabs per Scadenziario/Incassate */}
      <Tabs defaultValue="scadenziario" className="space-y-4">
        <TabsList>
          <TabsTrigger value="scadenziario" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Da Incassare ({fattureScadute.length})
          </TabsTrigger>
          <TabsTrigger value="provvigioni_da_incassare" className="gap-2">
            <Banknote className="h-4 w-4" />
            Provvigioni da Incassare ({provvigioniDaIncassare.length})
          </TabsTrigger>
          <TabsTrigger value="incassate" className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Provvigioni Incassate ({provvigioniIncassate.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab Scadenziario */}
        <TabsContent value="scadenziario">
          <Card>
            <CardHeader>
              <CardTitle>Fatture da Incassare</CardTitle>
              <CardDescription>
                Fatture scadute o in scadenza ancora da incassare
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingScadute ? (
                <p className="text-muted-foreground py-8 text-center">Caricamento...</p>
              ) : fattureScadute.length === 0 ? (
                <div className="text-center py-12">
                  <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nessuna fattura da incassare</p>
                  <p className="text-sm text-muted-foreground">
                    Importa uno scadenziario Excel per iniziare
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Azienda</TableHead>
                        <TableHead>N. Fattura</TableHead>
                        <TableHead>Scadenza</TableHead>
                        <TableHead className="text-right">Importo</TableHead>
                        <TableHead className="text-right">Provvigione</TableHead>
                        <TableHead>Ritardo</TableHead>
                        <TableHead className="text-right">Azioni</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fattureScadute.map((fattura) => {
                        const giorniRitardo = calcGiorniRitardo(fattura.data_scadenza);
                        return (
                          <TableRow key={fattura.id}>
                            <TableCell className="font-medium">{fattura.cliente_nome}</TableCell>
                            <TableCell>{fattura.azienda_nome}</TableCell>
                            <TableCell>{fattura.numero_fattura}</TableCell>
                            <TableCell>{formatDate(fattura.data_scadenza)}</TableCell>
                            <TableCell className="text-right font-medium">
                              €{Number(fattura.importo).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right text-green-600">
                              €{Number(fattura.provvigione_calcolata).toFixed(2)}
                            </TableCell>
                            <TableCell>
                              {giorniRitardo > 0 ? (
                                <Badge variant="destructive">
                                  +{giorniRitardo}gg
                                </Badge>
                              ) : giorniRitardo === 0 ? (
                                <Badge variant="secondary">Oggi</Badge>
                              ) : (
                                <Badge variant="outline">
                                  {Math.abs(giorniRitardo)}gg
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => setIncassataDialog({ open: true, fattura })}
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-1" />
                                  Incassa
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
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
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Provvigioni da Incassare */}
        <TabsContent value="provvigioni_da_incassare">
          <Card>
            <CardHeader>
              <CardTitle>Provvigioni da Incassare</CardTitle>
              <CardDescription>
                Fatture incassate dal cliente, provvigione ancora da riscuotere dall'azienda
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingIncassate ? (
                <p className="text-muted-foreground py-8 text-center">Caricamento...</p>
              ) : provvigioniDaIncassare.length === 0 ? (
                <div className="text-center py-12">
                  <Banknote className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nessuna provvigione da incassare</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Azienda</TableHead>
                        <TableHead>N. Fattura</TableHead>
                        <TableHead>Data Incasso Cliente</TableHead>
                        <TableHead className="text-right">Importo</TableHead>
                        <TableHead className="text-right">Provvigione</TableHead>
                        <TableHead>Trimestre</TableHead>
                        <TableHead className="text-right">Azioni</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {provvigioniDaIncassare.map((fattura) => (
                        <TableRow key={fattura.id}>
                          <TableCell className="font-medium">{fattura.cliente_nome}</TableCell>
                          <TableCell>{fattura.azienda_nome}</TableCell>
                          <TableCell>{fattura.numero_fattura}</TableCell>
                          <TableCell>{formatDate(fattura.data_incasso)}</TableCell>
                          <TableCell className="text-right">
                            €{Number(fattura.importo).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right font-medium text-amber-600">
                            €{Number(fattura.provvigione_calcolata).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{fattura.trimestre_provvigione}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              onClick={() => {
                                const oggi = new Date().toISOString().split('T')[0];
                                segnaProvvigioneIncassata.mutate({ id: fattura.id, data_incasso_provvigione: oggi });
                              }}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Incassata
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Provvigioni Incassate */}
        <TabsContent value="incassate">
          <div className="space-y-6">
            {loadingIncassate ? (
              <p className="text-muted-foreground py-8 text-center">Caricamento...</p>
            ) : provvigioniIncassate.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nessuna provvigione incassata</p>
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
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-5 w-5 text-muted-foreground" />
                              <CardTitle>{trimestre}</CardTitle>
                            </div>
                            <Badge className="bg-green-500/10 text-green-600 text-lg px-4 py-1">
                              €{totTrimestre.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Azienda</TableHead>
                                <TableHead>N. Fattura</TableHead>
                                <TableHead>Data Incasso Provv.</TableHead>
                                <TableHead className="text-right">Importo</TableHead>
                                <TableHead className="text-right">% Provv.</TableHead>
                                <TableHead className="text-right">Provvigione</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {fatture.map((fattura) => (
                                <TableRow key={fattura.id}>
                                  <TableCell className="font-medium">{fattura.cliente_nome}</TableCell>
                                  <TableCell>{fattura.azienda_nome}</TableCell>
                                  <TableCell>{fattura.numero_fattura}</TableCell>
                                  <TableCell>{formatDate(fattura.data_incasso_provvigione)}</TableCell>
                                  <TableCell className="text-right">
                                    €{Number(fattura.importo).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {Number(fattura.percentuale_provvigione).toFixed(1)}%
                                  </TableCell>
                                  <TableCell className="text-right font-medium text-green-600">
                                    €{Number(fattura.provvigione_calcolata).toFixed(2)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
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

      {/* Dialog Conferma Eliminazione */}
      <AlertDialog 
        open={deleteDialog.open} 
        onOpenChange={(open) => setDeleteDialog({ open, fattura: open ? deleteDialog.fattura : null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Elimina Fattura</AlertDialogTitle>
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
