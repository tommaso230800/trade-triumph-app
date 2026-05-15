import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useClienti } from "@/hooks/useClienti";
import {
  useVisitPreparations,
  usePrepareVisitAI,
} from "@/hooks/useVisitPreparations";
import { VisitPreparationView } from "@/components/visite/VisitPreparationView";
import { Sparkles, ChevronsUpDown, Check, Loader2, Brain, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { it } from "date-fns/locale";

const PreparaVisita = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialClient = searchParams.get("cliente") ?? undefined;
  const [clienteId, setClienteId] = useState<string | undefined>(initialClient);
  const [open, setOpen] = useState(false);

  const { data: clienti = [] } = useClienti();
  const { data: preparations = [], isLoading: loadingPreps } = useVisitPreparations(clienteId);
  const prepareAI = usePrepareVisitAI();

  const selectedClient = useMemo(
    () => clienti.find((c) => c.id === clienteId),
    [clienti, clienteId]
  );

  const latest = preparations[0];
  const previous = preparations.slice(1);

  const handleSelect = (id: string) => {
    setClienteId(id);
    setSearchParams({ cliente: id });
    setOpen(false);
  };

  const handleGenerate = () => {
    if (!clienteId) return;
    prepareAI.mutate({ cliente_id: clienteId });
  };

  return (
    <MainLayout>
      <div className="space-y-6 max-w-5xl mx-auto animate-rise-in pb-24">
        {/* Header */}
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow flex-shrink-0">
            <Brain className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <h1 className="text-heading-lg font-display font-bold leading-tight">
              Prepara Visita
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Seleziona un cliente e l'AI prepara la visita usando storico, concorrenza, obiettivi e obiezioni.
            </p>
          </div>
        </div>

        {/* Client selector */}
        <Card className="surface-glass border-primary/20 shadow-card">
          <CardContent className="p-4 sm:p-5 space-y-3">
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between h-12 text-left font-normal"
                >
                  <span className="truncate">
                    {selectedClient ? selectedClient.nome : "Scegli cliente…"}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50 flex-shrink-0" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0 max-h-[60dvh]" align="start">
                <Command>
                  <CommandInput placeholder="Cerca cliente…" className="h-11" />
                  <CommandList className="max-h-[50dvh] overflow-y-auto">
                    <CommandEmpty>Nessun cliente trovato</CommandEmpty>
                    <CommandGroup>
                      {clienti.map((c) => (
                        <CommandItem
                          key={c.id}
                          value={`${c.nome} ${c.azienda ?? ""} ${c.citta ?? ""}`}
                          onSelect={() => handleSelect(c.id)}
                          className="cursor-pointer"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              clienteId === c.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{c.nome}</p>
                            {(c.azienda || c.citta) && (
                              <p className="text-xs text-muted-foreground truncate">
                                {[c.azienda, c.citta].filter(Boolean).join(" • ")}
                              </p>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {selectedClient && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {selectedClient.tipologia_cliente && (
                  <Badge variant="secondary" className="capitalize">
                    {selectedClient.tipologia_cliente}
                  </Badge>
                )}
                {selectedClient.consorzio && (
                  <Badge variant="outline">{selectedClient.consorzio}</Badge>
                )}
                {selectedClient.citta && (
                  <Badge variant="outline">{selectedClient.citta}</Badge>
                )}
                {typeof selectedClient.fatturato === "number" && selectedClient.fatturato > 0 && (
                  <Badge variant="outline">
                    € {Math.round(selectedClient.fatturato).toLocaleString("it-IT")}
                  </Badge>
                )}
              </div>
            )}

            <Button
              onClick={handleGenerate}
              disabled={!clienteId || prepareAI.isPending}
              size="lg"
              className="w-full gap-2 h-12 bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-glow"
            >
              {prepareAI.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  L'AI sta preparando la visita…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  {latest ? "Rigenera preparazione" : "Genera preparazione AI"}
                </>
              )}
            </Button>
            {prepareAI.isPending && (
              <p className="text-xs text-muted-foreground text-center">
                Analisi storico ordini, concorrenza, note e report passati. Di solito 10–25 secondi.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Empty state */}
        {!clienteId && (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center space-y-2">
              <ClipboardList className="h-10 w-10 mx-auto text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                Scegli un cliente per iniziare. La preparazione include obiettivi, prodotti da proporre, mosse contro la concorrenza e obiezioni previste.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Latest preparation */}
        {clienteId && !loadingPreps && !latest && !prepareAI.isPending && (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center space-y-2">
              <Sparkles className="h-10 w-10 mx-auto text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                Nessuna preparazione per {selectedClient?.nome}. Tocca "Genera preparazione AI".
              </p>
            </CardContent>
          </Card>
        )}

        {latest && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-heading-sm font-display font-semibold">
                Preparazione attuale
              </h2>
              <Badge variant="secondary" className="text-xs">
                {format(new Date(latest.created_at), "d MMM yyyy, HH:mm", { locale: it })}
              </Badge>
            </div>
            <VisitPreparationView prep={latest} defaultOpen />
          </div>
        )}

        {/* History */}
        {previous.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-heading-sm font-display font-semibold px-1">
              Preparazioni precedenti
            </h2>
            {previous.map((p) => (
              <VisitPreparationView key={p.id} prep={p} />
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default PreparaVisita;
