import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Building2, MapPin, Phone, Mail, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const aziende = [
  {
    id: 1,
    nome: "Distribuzione Italia S.p.A.",
    settore: "Distribuzione",
    citta: "Milano",
    telefono: "+39 02 1234567",
    email: "info@distribuzioneitalia.it",
    status: "attivo",
    prodotti: 45,
  },
  {
    id: 2,
    nome: "Tech Solutions S.r.l.",
    settore: "Tecnologia",
    citta: "Roma",
    telefono: "+39 06 7654321",
    email: "contatti@techsolutions.it",
    status: "attivo",
    prodotti: 32,
  },
  {
    id: 3,
    nome: "Green Energy Group",
    settore: "Energia",
    citta: "Torino",
    telefono: "+39 011 9876543",
    email: "info@greenenergy.it",
    status: "attivo",
    prodotti: 18,
  },
  {
    id: 4,
    nome: "Food & Beverage Co.",
    settore: "Alimentare",
    citta: "Bologna",
    telefono: "+39 051 1122334",
    email: "ordini@foodbeverage.it",
    status: "in_pausa",
    prodotti: 67,
  },
  {
    id: 5,
    nome: "Fashion Forward",
    settore: "Moda",
    citta: "Firenze",
    telefono: "+39 055 4455667",
    email: "sales@fashionforward.it",
    status: "attivo",
    prodotti: 89,
  },
];

const Aziende = () => {
  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Aziende Partner</h1>
            <p className="mt-1 text-muted-foreground">
              Gestisci le aziende con cui collabori
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nuova Azienda
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cerca azienda..."
              className="pl-10"
            />
          </div>
        </div>

        {/* Companies Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {aziende.map((azienda) => (
            <div
              key={azienda.id}
              className="group rounded-xl bg-card p-6 shadow-card transition-all duration-300 hover:shadow-card-hover animate-fade-in"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl gradient-primary text-primary-foreground font-bold text-lg">
                    {azienda.nome.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-card-foreground">{azienda.nome}</h3>
                    <p className="text-sm text-muted-foreground">{azienda.settore}</p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>Visualizza</DropdownMenuItem>
                    <DropdownMenuItem>Modifica</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">Elimina</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {azienda.citta}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  {azienda.telefono}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  {azienda.email}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                <Badge
                  className={
                    azienda.status === "attivo"
                      ? "bg-success/10 text-success hover:bg-success/20"
                      : "bg-warning/10 text-warning hover:bg-warning/20"
                  }
                >
                  {azienda.status === "attivo" ? "Attivo" : "In Pausa"}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {azienda.prodotti} prodotti
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </MainLayout>
  );
};

export default Aziende;
