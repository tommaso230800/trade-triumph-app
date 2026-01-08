import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Search, Mail, Phone, TrendingUp, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const clienti = [
  {
    id: 1,
    nome: "Mario Rossi",
    azienda: "Rossi S.r.l.",
    email: "mario.rossi@rossisrl.it",
    telefono: "+39 333 1234567",
    fatturato: "€ 45.200",
    ordini: 23,
    status: "premium",
  },
  {
    id: 2,
    nome: "Laura Bianchi",
    azienda: "Bianchi & Co.",
    email: "l.bianchi@bianchico.it",
    telefono: "+39 335 9876543",
    fatturato: "€ 32.100",
    ordini: 18,
    status: "standard",
  },
  {
    id: 3,
    nome: "Giuseppe Verde",
    azienda: "Verde Distribuzione",
    email: "g.verde@verdedist.it",
    telefono: "+39 340 5566778",
    fatturato: "€ 78.500",
    ordini: 42,
    status: "premium",
  },
  {
    id: 4,
    nome: "Anna Neri",
    azienda: "Tech Solutions",
    email: "anna.neri@techsol.it",
    telefono: "+39 339 1122334",
    fatturato: "€ 15.800",
    ordini: 8,
    status: "nuovo",
  },
  {
    id: 5,
    nome: "Paolo Gialli",
    azienda: "Alfa Trading",
    email: "p.gialli@alfatrading.it",
    telefono: "+39 347 8899001",
    fatturato: "€ 52.300",
    ordini: 31,
    status: "standard",
  },
  {
    id: 6,
    nome: "Elena Blu",
    azienda: "Blue Ocean S.r.l.",
    email: "e.blu@blueocean.it",
    telefono: "+39 328 4455667",
    fatturato: "€ 28.900",
    ordini: 15,
    status: "standard",
  },
];

const statusConfig = {
  premium: { label: "Premium", className: "bg-primary/10 text-primary hover:bg-primary/20" },
  standard: { label: "Standard", className: "bg-muted text-muted-foreground hover:bg-muted/80" },
  nuovo: { label: "Nuovo", className: "bg-success/10 text-success hover:bg-success/20" },
};

const Clienti = () => {
  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Portfolio Clienti</h1>
            <p className="mt-1 text-muted-foreground">
              Gestisci i tuoi clienti e monitora le performance
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nuovo Cliente
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg bg-card p-4 shadow-card">
            <p className="text-sm text-muted-foreground">Totale Clienti</p>
            <p className="text-2xl font-bold text-card-foreground">47</p>
          </div>
          <div className="rounded-lg bg-card p-4 shadow-card">
            <p className="text-sm text-muted-foreground">Clienti Premium</p>
            <p className="text-2xl font-bold text-primary">12</p>
          </div>
          <div className="rounded-lg bg-card p-4 shadow-card">
            <p className="text-sm text-muted-foreground">Nuovi questo mese</p>
            <p className="text-2xl font-bold text-success">5</p>
          </div>
          <div className="rounded-lg bg-card p-4 shadow-card">
            <p className="text-sm text-muted-foreground">Fatturato medio</p>
            <p className="text-2xl font-bold text-card-foreground">€ 42.100</p>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Cerca cliente..." className="pl-10" />
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl bg-card shadow-card overflow-hidden animate-fade-in">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Cliente</TableHead>
                <TableHead>Contatti</TableHead>
                <TableHead>Fatturato</TableHead>
                <TableHead>Ordini</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clienti.map((cliente) => (
                <TableRow key={cliente.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {cliente.nome.split(" ").map((n) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-card-foreground">{cliente.nome}</p>
                        <p className="text-sm text-muted-foreground">{cliente.azienda}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">{cliente.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">{cliente.telefono}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-card-foreground">{cliente.fatturato}</span>
                      <TrendingUp className="h-4 w-4 text-success" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-card-foreground">{cliente.ordini}</span>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusConfig[cliente.status as keyof typeof statusConfig].className}>
                      {statusConfig[cliente.status as keyof typeof statusConfig].label}
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
                        <DropdownMenuItem>Nuovo Ordine</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">Elimina</DropdownMenuItem>
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

export default Clienti;
