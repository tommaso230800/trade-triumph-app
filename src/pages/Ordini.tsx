import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Search, Filter, Download, MoreHorizontal, Loader2 } from "lucide-react";
import { useOrdini, useCreateOrdine, useUpdateOrdineStatus, Ordine } from "@/hooks/useOrdini";
import { useClienti } from "@/hooks/useClienti";
import { useAziende } from "@/hooks/useAziende";
import { format } from "date-fns";

const statusConfig = {
  completato: { label: "Completato", className: "bg-success/10 text-success hover:bg-success/20" },
  in_attesa: { label: "In Attesa", className: "bg-warning/10 text-warning hover:bg-warning/20" },
  spedito: { label: "Spedito", className: "bg-info/10 text-info hover:bg-info/20" },
  annullato: { label: "Annullato", className: "bg-destructive/10 text-destructive hover:bg-destructive/20" },
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(value);

const Ordini = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<Ordine["status"] | "tutti">("tutti");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    cliente_id: "",
    azienda_id: "",
    prodotti: 1,
    totale: 0,
    note: "",
  });

  const { data: ordini, isLoading } = useOrdini(searchTerm, statusFilter);
  const { data: clienti } = useClienti();
  const { data: aziende } = useAziende();
  const createOrdine = useCreateOrdine();
  const updateStatus = useUpdateOrdineStatus();

  const handleSubmit = async () => {
    await createOrdine.mutateAsync({
      cliente_id: formData.cliente_id || undefined,
      azienda_id: formData.azienda_id || undefined,
      prodotti: formData.prodotti,
      totale: formData.totale,
      note: formData.note || undefined,
    });
    setIsDialogOpen(false);
    setFormData({ cliente_id: "", azienda_id: "", prodotti: 1, totale: 0, note: "" });
  };

  const stats = {
    totale: ordini?.length || 0,
    inAttesa: ordini?.filter((o) => o.status === "in_attesa").length || 0,
    completati: ordini?.filter((o) => o.status === "completato").length || 0,
    valoreTotale: ordini?.reduce((sum, o) => sum + Number(o.totale), 0) || 0,
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground">Gestione Ordini</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Crea e gestisci gli ordini dei tuoi clienti
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Nuovo Ordine</span>
                <span className="sm:hidden">Aggiungi</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Crea Nuovo Ordine</DialogTitle>
                <DialogDescription>Inserisci i dettagli per creare un nuovo ordine</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <Select value={formData.cliente_id} onValueChange={(v) => setFormData({ ...formData, cliente_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clienti?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Azienda Fornitrice</Label>
                  <Select value={formData.azienda_id} onValueChange={(v) => setFormData({ ...formData, azienda_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona azienda" />
                    </SelectTrigger>
                    <SelectContent>
                      {aziende?.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Quantità</Label>
                    <Input
                      type="number"
                      value={formData.prodotti}
                      onChange={(e) => setFormData({ ...formData, prodotti: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Importo (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.totale}
                      onChange={(e) => setFormData({ ...formData, totale: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Note</Label>
                  <Textarea
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    placeholder="Note aggiuntive..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annulla
                </Button>
                <Button onClick={handleSubmit} disabled={createOrdine.isPending}>
                  {createOrdine.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Crea Ordine
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-card p-4 shadow-card">
            <p className="text-xs lg:text-sm text-muted-foreground">Ordini Totali</p>
            <p className="text-xl lg:text-2xl font-bold text-card-foreground">{stats.totale}</p>
          </div>
          <div className="rounded-lg bg-card p-4 shadow-card">
            <p className="text-xs lg:text-sm text-muted-foreground">In Attesa</p>
            <p className="text-xl lg:text-2xl font-bold text-warning">{stats.inAttesa}</p>
          </div>
          <div className="rounded-lg bg-card p-4 shadow-card">
            <p className="text-xs lg:text-sm text-muted-foreground">Completati</p>
            <p className="text-xl lg:text-2xl font-bold text-success">{stats.completati}</p>
          </div>
          <div className="rounded-lg bg-card p-4 shadow-card">
            <p className="text-xs lg:text-sm text-muted-foreground">Valore Totale</p>
            <p className="text-xl lg:text-2xl font-bold text-card-foreground">{formatCurrency(stats.valoreTotale)}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cerca ordine..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
            <SelectTrigger className="w-full sm:w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tutti">Tutti</SelectItem>
              <SelectItem value="in_attesa">In Attesa</SelectItem>
              <SelectItem value="spedito">Spedito</SelectItem>
              <SelectItem value="completato">Completato</SelectItem>
              <SelectItem value="annullato">Annullato</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !ordini?.length ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nessun ordine trovato</p>
            <Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
              Crea il primo ordine
            </Button>
          </div>
        ) : (
          <div className="rounded-xl bg-card shadow-card overflow-hidden animate-fade-in">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>ID Ordine</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="hidden sm:table-cell">Prodotti</TableHead>
                    <TableHead>Totale</TableHead>
                    <TableHead className="hidden md:table-cell">Data</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ordini.map((ordine) => (
                    <TableRow key={ordine.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-mono text-xs lg:text-sm font-medium text-primary">
                        {ordine.codice}
                      </TableCell>
                      <TableCell className="font-medium text-card-foreground">
                        <span className="truncate block max-w-[120px] sm:max-w-none">
                          {ordine.clienti?.nome || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{ordine.prodotti} articoli</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(Number(ordine.totale))}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {format(new Date(ordine.created_at), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusConfig[ordine.status].className}>
                          <span className="hidden sm:inline">{statusConfig[ordine.status].label}</span>
                          <span className="sm:hidden">{statusConfig[ordine.status].label.slice(0, 4)}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => updateStatus.mutate({ id: ordine.id, status: "spedito" })}
                            >
                              Segna come Spedito
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => updateStatus.mutate({ id: ordine.id, status: "completato" })}
                            >
                              Segna come Completato
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => updateStatus.mutate({ id: ordine.id, status: "annullato" })}
                            >
                              Annulla
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Ordini;
