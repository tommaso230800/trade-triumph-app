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
import { Plus, Search, Filter, Download, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ordini = [
  {
    id: "ORD-2024-001",
    cliente: "Rossi S.r.l.",
    prodotti: 5,
    totale: "€ 2.450,00",
    data: "08/01/2025",
    status: "completato",
  },
  {
    id: "ORD-2024-002",
    cliente: "Bianchi & Co.",
    prodotti: 3,
    totale: "€ 1.890,00",
    data: "07/01/2025",
    status: "in_attesa",
  },
  {
    id: "ORD-2024-003",
    cliente: "Verde Distribuzione",
    prodotti: 8,
    totale: "€ 5.200,00",
    data: "06/01/2025",
    status: "spedito",
  },
  {
    id: "ORD-2024-004",
    cliente: "Tech Solutions",
    prodotti: 2,
    totale: "€ 980,00",
    data: "05/01/2025",
    status: "completato",
  },
  {
    id: "ORD-2024-005",
    cliente: "Alfa Trading",
    prodotti: 6,
    totale: "€ 3.100,00",
    data: "04/01/2025",
    status: "in_attesa",
  },
  {
    id: "ORD-2024-006",
    cliente: "Blue Ocean S.r.l.",
    prodotti: 4,
    totale: "€ 2.750,00",
    data: "03/01/2025",
    status: "annullato",
  },
];

const statusConfig = {
  completato: { label: "Completato", className: "bg-success/10 text-success hover:bg-success/20" },
  in_attesa: { label: "In Attesa", className: "bg-warning/10 text-warning hover:bg-warning/20" },
  spedito: { label: "Spedito", className: "bg-info/10 text-info hover:bg-info/20" },
  annullato: { label: "Annullato", className: "bg-destructive/10 text-destructive hover:bg-destructive/20" },
};

const Ordini = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Gestione Ordini</h1>
            <p className="mt-1 text-muted-foreground">
              Crea e gestisci gli ordini dei tuoi clienti
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nuovo Ordine
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Crea Nuovo Ordine</DialogTitle>
                <DialogDescription>
                  Inserisci i dettagli per creare un nuovo ordine
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="cliente">Cliente</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rossi">Rossi S.r.l.</SelectItem>
                      <SelectItem value="bianchi">Bianchi & Co.</SelectItem>
                      <SelectItem value="verde">Verde Distribuzione</SelectItem>
                      <SelectItem value="tech">Tech Solutions</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="azienda">Azienda Fornitrice</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona azienda" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dist">Distribuzione Italia S.p.A.</SelectItem>
                      <SelectItem value="tech">Tech Solutions S.r.l.</SelectItem>
                      <SelectItem value="green">Green Energy Group</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quantita">Quantità</Label>
                    <Input id="quantita" type="number" placeholder="0" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="importo">Importo (€)</Label>
                    <Input id="importo" type="number" placeholder="0,00" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="note">Note</Label>
                  <Textarea id="note" placeholder="Inserisci eventuali note..." />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annulla
                </Button>
                <Button onClick={() => setIsDialogOpen(false)}>Crea Ordine</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg bg-card p-4 shadow-card">
            <p className="text-sm text-muted-foreground">Ordini Totali</p>
            <p className="text-2xl font-bold text-card-foreground">128</p>
          </div>
          <div className="rounded-lg bg-card p-4 shadow-card">
            <p className="text-sm text-muted-foreground">In Attesa</p>
            <p className="text-2xl font-bold text-warning">15</p>
          </div>
          <div className="rounded-lg bg-card p-4 shadow-card">
            <p className="text-sm text-muted-foreground">Completati</p>
            <p className="text-2xl font-bold text-success">98</p>
          </div>
          <div className="rounded-lg bg-card p-4 shadow-card">
            <p className="text-sm text-muted-foreground">Valore Totale</p>
            <p className="text-2xl font-bold text-card-foreground">€ 45.230</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Cerca ordine..." className="pl-10" />
          </div>
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Filtra
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Esporta
          </Button>
        </div>

        {/* Table */}
        <div className="rounded-xl bg-card shadow-card overflow-hidden animate-fade-in">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>ID Ordine</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Prodotti</TableHead>
                <TableHead>Totale</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordini.map((ordine) => (
                <TableRow key={ordine.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-mono font-medium text-primary">
                    {ordine.id}
                  </TableCell>
                  <TableCell className="font-medium text-card-foreground">
                    {ordine.cliente}
                  </TableCell>
                  <TableCell>{ordine.prodotti} articoli</TableCell>
                  <TableCell className="font-semibold">{ordine.totale}</TableCell>
                  <TableCell className="text-muted-foreground">{ordine.data}</TableCell>
                  <TableCell>
                    <Badge className={statusConfig[ordine.status as keyof typeof statusConfig].className}>
                      {statusConfig[ordine.status as keyof typeof statusConfig].label}
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
                        <DropdownMenuItem>Visualizza</DropdownMenuItem>
                        <DropdownMenuItem>Modifica</DropdownMenuItem>
                        <DropdownMenuItem>Duplica</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">Annulla</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </MainLayout>
  );
};

export default Ordini;
