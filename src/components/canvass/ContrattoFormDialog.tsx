import { useState, useEffect, useMemo } from "react";
import { ContrattoCliente } from "@/hooks/useCanvass";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Building2, Users, Trophy, Search, Check, Target } from "lucide-react";

interface ContrattoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingContratto: ContrattoCliente | null;
  aziende: any[];
  clienti: any[];
  consorzi: (string | null)[];
  onSave: (form: ContrattoFormData) => void;
  isPending: boolean;
}

export interface ContrattoFormData {
  cliente_id: string;
  azienda_id: string;
  anno: number;
  percentuale_premio: number;
  soglia_fatturato: number;
  note: string;
  consorzio: string;
  is_consorzio: boolean;
}

export function ContrattoFormDialog({ 
  open, 
  onOpenChange, 
  editingContratto, 
  aziende, 
  clienti, 
  consorzi,
  onSave,
  isPending 
}: ContrattoFormDialogProps) {
  const [form, setForm] = useState<ContrattoFormData>({
    cliente_id: "",
    azienda_id: "",
    anno: new Date().getFullYear(),
    percentuale_premio: 0,
    soglia_fatturato: 0,
    note: "",
    consorzio: "",
    is_consorzio: false,
  });

  const [clienteSearch, setClienteSearch] = useState("");

  useEffect(() => {
    if (open) {
      if (editingContratto) {
        setForm({
          cliente_id: editingContratto.cliente_id || "",
          azienda_id: editingContratto.azienda_id,
          anno: editingContratto.anno,
          percentuale_premio: editingContratto.percentuale_premio,
          soglia_fatturato: editingContratto.soglia_fatturato || 0,
          note: editingContratto.note || "",
          consorzio: editingContratto.consorzio || "",
          is_consorzio: editingContratto.is_consorzio,
        });
      } else {
        setForm({
          cliente_id: "",
          azienda_id: "",
          anno: new Date().getFullYear(),
          percentuale_premio: 0,
          soglia_fatturato: 0,
          note: "",
          consorzio: "",
          is_consorzio: false,
        });
      }
      setClienteSearch("");
    }
  }, [open, editingContratto]);

  const filteredClienti = useMemo(() => {
    if (!clienteSearch) return clienti;
    const search = clienteSearch.toLowerCase();
    return clienti.filter(c => 
      c.nome.toLowerCase().includes(search) || 
      c.azienda?.toLowerCase().includes(search)
    );
  }, [clienti, clienteSearch]);

  const clientiConsorzio = useMemo(() => 
    form.consorzio ? clienti.filter(c => c.consorzio === form.consorzio) : [],
    [clienti, form.consorzio]
  );

  const selectedCliente = clienti.find(c => c.id === form.cliente_id);
  const selectedAzienda = aziende.find(a => a.id === form.azienda_id);

  const handleSave = () => {
    if (form.is_consorzio) {
      if (!form.consorzio || !form.azienda_id) return;
    } else {
      if (!form.cliente_id || !form.azienda_id) return;
    }
    onSave(form);
  };

  const isValid = form.azienda_id && (form.is_consorzio ? form.consorzio : form.cliente_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            {editingContratto ? "Modifica Contratto Premio" : "Nuovo Contratto Premio"}
          </DialogTitle>
          <DialogDescription>
            Configura un contratto premio fine anno per un cliente o consorzio
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 py-4">
            {/* Tipo Contratto */}
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, is_consorzio: false, consorzio: "" }))}
                className={`p-4 rounded-xl border-2 flex items-center gap-3 transition-all ${
                  !form.is_consorzio 
                    ? "border-primary bg-primary/5" 
                    : "border-muted hover:border-muted-foreground/30"
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  !form.is_consorzio ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}>
                  <Users className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <p className="font-semibold">Cliente Singolo</p>
                  <p className="text-xs text-muted-foreground">Contratto individuale</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, is_consorzio: true, cliente_id: "" }))}
                className={`p-4 rounded-xl border-2 flex items-center gap-3 transition-all ${
                  form.is_consorzio 
                    ? "border-primary bg-primary/5" 
                    : "border-muted hover:border-muted-foreground/30"
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  form.is_consorzio ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}>
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <p className="font-semibold">Consorzio</p>
                  <p className="text-xs text-muted-foreground">Contratto collettivo</p>
                </div>
              </button>
            </div>

            <Separator />

            {/* Azienda Selection */}
            <div className="p-4 border-2 border-dashed rounded-xl bg-muted/30">
              <Label className="text-base font-semibold flex items-center gap-2 mb-3">
                <Building2 className="h-5 w-5 text-primary" />
                Azienda Fornitrice *
              </Label>
              <Select 
                value={form.azienda_id} 
                onValueChange={(v) => setForm(f => ({ ...f, azienda_id: v }))}
              >
                <SelectTrigger className="h-12 text-base">
                  <SelectValue placeholder="Seleziona l'azienda fornitrice" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  {aziende.map(a => (
                    <SelectItem key={a.id} value={a.id} className="py-3">
                      <div className="flex items-center gap-2">
                        {a.logo_url && (
                          <img src={a.logo_url} alt="" className="w-6 h-6 rounded object-cover" />
                        )}
                        <span className="font-medium">{a.nome}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedAzienda && (
              <>
                {/* Cliente / Consorzio Selection */}
                {form.is_consorzio ? (
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Seleziona Consorzio *</Label>
                    <Select 
                      value={form.consorzio} 
                      onValueChange={(v) => setForm(f => ({ ...f, consorzio: v }))}
                    >
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Seleziona il consorzio" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border shadow-lg z-50">
                        {consorzi.filter(Boolean).map(c => (
                          <SelectItem key={c!} value={c!} className="py-3">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4" />
                              <span className="font-medium">{c}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.consorzio && clientiConsorzio.length > 0 && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200">
                        <p className="text-sm text-blue-800 dark:text-blue-300 font-medium mb-2">
                          {clientiConsorzio.length} clienti associati al consorzio
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {clientiConsorzio.slice(0, 5).map(c => (
                            <Badge key={c.id} variant="secondary" className="text-xs">{c.nome}</Badge>
                          ))}
                          {clientiConsorzio.length > 5 && (
                            <Badge variant="outline" className="text-xs">+{clientiConsorzio.length - 5} altri</Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Seleziona Cliente *</Label>
                    
                    {/* Selected Client */}
                    {selectedCliente && (
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-600" />
                          <span className="font-medium">{selectedCliente.nome}</span>
                          {selectedCliente.azienda && (
                            <span className="text-sm text-muted-foreground">({selectedCliente.azienda})</span>
                          )}
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setForm(f => ({ ...f, cliente_id: "" }))}
                        >
                          Cambia
                        </Button>
                      </div>
                    )}

                    {/* Client Search and List */}
                    {!selectedCliente && (
                      <>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input 
                            placeholder="Cerca cliente..."
                            value={clienteSearch}
                            onChange={(e) => setClienteSearch(e.target.value)}
                            className="pl-9"
                          />
                        </div>
                        <ScrollArea className="h-[200px] border rounded-lg">
                          <div className="p-2 space-y-1">
                            {filteredClienti.map(c => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => setForm(f => ({ ...f, cliente_id: c.id }))}
                                className="w-full p-3 rounded-lg flex items-center gap-3 bg-muted/30 hover:bg-muted/50 transition-all"
                              >
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <div className="flex-1 text-left">
                                  <p className="font-medium">{c.nome}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {c.azienda || "Nessuna azienda"} {c.consorzio && `• ${c.consorzio}`}
                                  </p>
                                </div>
                              </button>
                            ))}
                          </div>
                        </ScrollArea>
                      </>
                    )}
                  </div>
                )}

                <Separator />

                {/* Dettagli Premio */}
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-2 mb-4">
                    <Trophy className="h-5 w-5 text-amber-600" />
                    <Label className="font-semibold text-amber-800 dark:text-amber-300">Dettagli Premio</Label>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm">Anno</Label>
                      <Input 
                        type="number" 
                        value={form.anno} 
                        onChange={(e) => setForm(f => ({ ...f, anno: parseInt(e.target.value) }))} 
                        className="bg-white dark:bg-background"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Premio %</Label>
                      <div className="relative">
                        <Input 
                          type="number" 
                          step="0.1"
                          value={form.percentuale_premio} 
                          onChange={(e) => setForm(f => ({ ...f, percentuale_premio: parseFloat(e.target.value) || 0 }))} 
                          className="bg-white dark:bg-background pr-8"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Soglia Fatturato</Label>
                      <div className="relative">
                        <Input 
                          type="number" 
                          value={form.soglia_fatturato} 
                          onChange={(e) => setForm(f => ({ ...f, soglia_fatturato: parseFloat(e.target.value) || 0 }))} 
                          className="bg-white dark:bg-background pr-8"
                          placeholder="0 = nessuna soglia"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
                      </div>
                    </div>
                  </div>

                  {form.soglia_fatturato > 0 && (
                    <div className="mt-3 p-2 bg-white dark:bg-background rounded-lg flex items-center gap-2">
                      <Target className="h-4 w-4 text-amber-600" />
                      <p className="text-sm">
                        Premio del <strong>{form.percentuale_premio}%</strong> al raggiungimento di{" "}
                        <strong>€{form.soglia_fatturato.toLocaleString()}</strong> di fatturato
                      </p>
                    </div>
                  )}
                </div>

                {/* Note */}
                <div className="space-y-2">
                  <Label>Note (opzionale)</Label>
                  <Textarea 
                    value={form.note} 
                    onChange={(e) => setForm(f => ({ ...f, note: e.target.value }))} 
                    placeholder="Note aggiuntive sul contratto..."
                    rows={2}
                  />
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        <Separator className="my-4" />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button onClick={handleSave} disabled={isPending || !isValid}>
            {editingContratto ? "Salva Modifiche" : "Crea Contratto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
