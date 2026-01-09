import { useState, useEffect, useMemo } from "react";
import { Canvass } from "@/hooks/useCanvass";
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
import { 
  Plus, Percent, Tag, Trophy, Building2, Users, Package, Calendar, 
  Gift, Trash2, Search, Check, X
} from "lucide-react";

interface PromoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingPromo: Canvass | null;
  aziende: any[];
  clienti: any[];
  prodotti: any[];
  onSave: (form: PromoFormData) => void;
  isPending: boolean;
}

export interface PromoFormData {
  nome: string;
  descrizione: string;
  tipo: "sconto_percentuale" | "prezzo_fisso" | "premio_fine_anno";
  valore: number;
  data_inizio: string;
  data_fine: string;
  attivo: boolean;
  tutti_clienti: boolean;
  azienda_id: string;
  clienti_ids: string[];
  prodotti: { prodotto_id: string; valore_override?: number }[];
  cartoni_omaggio: number;
  cartoni_acquisto: number;
  periodi_aggiuntivi: { data_inizio: string; data_fine: string }[];
}

const tipoConfig = {
  sconto_percentuale: { label: "Sconto %", icon: Percent, color: "border-blue-300 bg-blue-50 dark:bg-blue-900/20" },
  prezzo_fisso: { label: "Prezzo Fisso", icon: Tag, color: "border-green-300 bg-green-50 dark:bg-green-900/20" },
  premio_fine_anno: { label: "Premio Fine Anno", icon: Trophy, color: "border-amber-300 bg-amber-50 dark:bg-amber-900/20" },
};

export function PromoFormDialog({ 
  open, 
  onOpenChange, 
  editingPromo, 
  aziende, 
  clienti, 
  prodotti,
  onSave,
  isPending 
}: PromoFormDialogProps) {
  const [form, setForm] = useState<PromoFormData>({
    nome: "",
    descrizione: "",
    tipo: "sconto_percentuale",
    valore: 0,
    data_inizio: "",
    data_fine: "",
    attivo: true,
    tutti_clienti: true,
    azienda_id: "",
    clienti_ids: [],
    prodotti: [],
    cartoni_omaggio: 0,
    cartoni_acquisto: 0,
    periodi_aggiuntivi: [],
  });

  const [clienteSearch, setClienteSearch] = useState("");
  const [prodottoSearch, setProdottoSearch] = useState("");
  const [step, setStep] = useState(1);

  // Reset form when opening/closing or when editingPromo changes
  useEffect(() => {
    if (open) {
      if (editingPromo) {
        setForm({
          nome: editingPromo.nome,
          descrizione: editingPromo.descrizione || "",
          tipo: editingPromo.tipo,
          valore: editingPromo.valore,
          data_inizio: editingPromo.data_inizio,
          data_fine: editingPromo.data_fine,
          attivo: editingPromo.attivo,
          tutti_clienti: editingPromo.tutti_clienti,
          azienda_id: editingPromo.azienda_id,
          clienti_ids: editingPromo.canvass_clienti?.map(cc => cc.cliente_id) || [],
          prodotti: editingPromo.canvass_prodotti?.map(cp => ({ 
            prodotto_id: cp.prodotto_id, 
            valore_override: cp.valore_override || undefined 
          })) || [],
          cartoni_omaggio: editingPromo.cartoni_omaggio || 0,
          cartoni_acquisto: editingPromo.cartoni_acquisto || 0,
          periodi_aggiuntivi: editingPromo.canvass_periodi?.map(p => ({ 
            data_inizio: p.data_inizio, 
            data_fine: p.data_fine 
          })) || [],
        });
        setStep(1);
      } else {
        setForm({
          nome: "",
          descrizione: "",
          tipo: "sconto_percentuale",
          valore: 0,
          data_inizio: "",
          data_fine: "",
          attivo: true,
          tutti_clienti: true,
          azienda_id: "",
          clienti_ids: [],
          prodotti: [],
          cartoni_omaggio: 0,
          cartoni_acquisto: 0,
          periodi_aggiuntivi: [],
        });
        setStep(1);
      }
    }
  }, [open, editingPromo]);

  const filteredProdotti = useMemo(() => {
    let filtered = form.azienda_id ? prodotti.filter(p => p.azienda_id === form.azienda_id) : prodotti;
    if (prodottoSearch) {
      const search = prodottoSearch.toLowerCase();
      filtered = filtered.filter(p => 
        p.nome.toLowerCase().includes(search) || 
        p.codice?.toLowerCase().includes(search)
      );
    }
    return filtered;
  }, [prodotti, form.azienda_id, prodottoSearch]);

  const filteredClienti = useMemo(() => {
    if (!clienteSearch) return clienti;
    const search = clienteSearch.toLowerCase();
    return clienti.filter(c => 
      c.nome.toLowerCase().includes(search) || 
      c.azienda?.toLowerCase().includes(search)
    );
  }, [clienti, clienteSearch]);

  const selectedClienti = useMemo(() => 
    clienti.filter(c => form.clienti_ids.includes(c.id)),
    [clienti, form.clienti_ids]
  );

  const selectedProdotti = useMemo(() => 
    prodotti.filter(p => form.prodotti.some(fp => fp.prodotto_id === p.id)),
    [prodotti, form.prodotti]
  );

  const selectedAzienda = aziende.find(a => a.id === form.azienda_id);

  const toggleCliente = (clienteId: string) => {
    setForm(f => ({
      ...f,
      clienti_ids: f.clienti_ids.includes(clienteId)
        ? f.clienti_ids.filter(id => id !== clienteId)
        : [...f.clienti_ids, clienteId]
    }));
  };

  const toggleProdotto = (prodottoId: string) => {
    setForm(f => ({
      ...f,
      prodotti: f.prodotti.some(p => p.prodotto_id === prodottoId)
        ? f.prodotti.filter(p => p.prodotto_id !== prodottoId)
        : [...f.prodotti, { prodotto_id: prodottoId }]
    }));
  };

  const handleSave = () => {
    if (!form.nome || !form.azienda_id || !form.data_inizio || !form.data_fine) return;
    onSave(form);
  };

  const isStep1Valid = form.azienda_id && form.nome && form.data_inizio && form.data_fine;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {editingPromo ? "Modifica Promozione" : "Nuova Promozione"}
          </DialogTitle>
          <DialogDescription>
            {step === 1 && "Configura i dettagli principali della promozione"}
            {step === 2 && "Seleziona i clienti a cui applicare la promozione"}
            {step === 3 && "Seleziona i prodotti coinvolti nella promozione"}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center gap-2 py-4">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center flex-1">
              <button
                onClick={() => setStep(s)}
                disabled={s > 1 && !isStep1Valid}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                  step === s 
                    ? "bg-primary text-primary-foreground" 
                    : step > s 
                      ? "bg-green-500 text-white" 
                      : "bg-muted text-muted-foreground"
                } ${s > 1 && !isStep1Valid ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:opacity-80"}`}
              >
                {step > s ? <Check className="h-4 w-4" /> : s}
              </button>
              {s < 3 && (
                <div className={`flex-1 h-1 mx-2 rounded ${step > s ? "bg-green-500" : "bg-muted"}`} />
              )}
            </div>
          ))}
        </div>

        <ScrollArea className="flex-1 pr-4">
          {/* Step 1: Dettagli Base */}
          {step === 1 && (
            <div className="space-y-6">
              {/* Azienda Selection - First */}
              <div className="p-4 border-2 border-dashed rounded-xl bg-muted/30">
                <Label className="text-base font-semibold flex items-center gap-2 mb-3">
                  <Building2 className="h-5 w-5 text-primary" />
                  Azienda Fornitrice *
                </Label>
                <Select 
                  value={form.azienda_id} 
                  onValueChange={(v) => setForm(f => ({ ...f, azienda_id: v, prodotti: [] }))}
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
                  {/* Nome e Tipo */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nome Promozione *</Label>
                      <Input 
                        value={form.nome} 
                        onChange={(e) => setForm(f => ({ ...f, nome: e.target.value }))} 
                        placeholder="Es. Promo Estate 2024"
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tipo Promozione</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {(Object.keys(tipoConfig) as Array<keyof typeof tipoConfig>).map((tipo) => {
                          const config = tipoConfig[tipo];
                          const Icon = config.icon;
                          return (
                            <button
                              key={tipo}
                              type="button"
                              onClick={() => setForm(f => ({ ...f, tipo }))}
                              className={`p-3 rounded-lg border-2 flex flex-col items-center gap-1 transition-all ${
                                form.tipo === tipo 
                                  ? `${config.color} border-primary` 
                                  : "border-muted hover:border-muted-foreground/30"
                              }`}
                            >
                              <Icon className="h-4 w-4" />
                              <span className="text-xs font-medium">{config.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Valore e Status */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>
                        {form.tipo === "sconto_percentuale" || form.tipo === "premio_fine_anno" ? "Valore %" : "Prezzo €"}
                      </Label>
                      <div className="relative">
                        <Input 
                          type="number" 
                          step="0.01"
                          value={form.valore} 
                          onChange={(e) => setForm(f => ({ ...f, valore: parseFloat(e.target.value) || 0 }))} 
                          className="h-11 pr-8"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          {form.tipo === "prezzo_fisso" ? "€" : "%"}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Data Inizio *</Label>
                      <Input 
                        type="date" 
                        value={form.data_inizio} 
                        onChange={(e) => setForm(f => ({ ...f, data_inizio: e.target.value }))} 
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Data Fine *</Label>
                      <Input 
                        type="date" 
                        value={form.data_fine} 
                        onChange={(e) => setForm(f => ({ ...f, data_fine: e.target.value }))} 
                        className="h-11"
                      />
                    </div>
                  </div>

                  {/* Cartoni Omaggio */}
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 mb-3">
                      <Gift className="h-5 w-5 text-green-600" />
                      <Label className="font-semibold text-green-800 dark:text-green-300">Promozione Cartoni Omaggio</Label>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-sm text-green-700 dark:text-green-400">Acquista (cartoni)</Label>
                        <Input 
                          type="number" 
                          value={form.cartoni_acquisto} 
                          onChange={(e) => setForm(f => ({ ...f, cartoni_acquisto: parseInt(e.target.value) || 0 }))} 
                          placeholder="Es. 10"
                          className="bg-white dark:bg-background"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-sm text-green-700 dark:text-green-400">Ricevi Omaggio (cartoni)</Label>
                        <Input 
                          type="number" 
                          value={form.cartoni_omaggio} 
                          onChange={(e) => setForm(f => ({ ...f, cartoni_omaggio: parseInt(e.target.value) || 0 }))} 
                          placeholder="Es. 1"
                          className="bg-white dark:bg-background"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Periodi Aggiuntivi */}
                  <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-purple-600" />
                        <Label className="font-semibold text-purple-800 dark:text-purple-300">Periodi Aggiuntivi</Label>
                      </div>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => setForm(f => ({ 
                          ...f, 
                          periodi_aggiuntivi: [...f.periodi_aggiuntivi, { data_inizio: "", data_fine: "" }] 
                        }))}
                        className="bg-white dark:bg-background"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Aggiungi
                      </Button>
                    </div>
                    <p className="text-xs text-purple-600 dark:text-purple-400 mb-3">
                      Aggiungi periodi separati durante l'anno (es. Marzo, Giugno, Ottobre)
                    </p>
                    {form.periodi_aggiuntivi.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-2">
                        Nessun periodo aggiuntivo
                      </p>
                    )}
                    {form.periodi_aggiuntivi.map((periodo, idx) => (
                      <div key={idx} className="grid grid-cols-5 gap-2 items-end mt-2">
                        <div className="col-span-2">
                          <Label className="text-xs">Inizio</Label>
                          <Input 
                            type="date" 
                            value={periodo.data_inizio}
                            onChange={(e) => {
                              const newPeriodi = [...form.periodi_aggiuntivi];
                              newPeriodi[idx].data_inizio = e.target.value;
                              setForm(f => ({ ...f, periodi_aggiuntivi: newPeriodi }));
                            }}
                            className="bg-white dark:bg-background"
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">Fine</Label>
                          <Input 
                            type="date" 
                            value={periodo.data_fine}
                            onChange={(e) => {
                              const newPeriodi = [...form.periodi_aggiuntivi];
                              newPeriodi[idx].data_fine = e.target.value;
                              setForm(f => ({ ...f, periodi_aggiuntivi: newPeriodi }));
                            }}
                            className="bg-white dark:bg-background"
                          />
                        </div>
                        <Button 
                          type="button"
                          variant="ghost" 
                          size="icon"
                          onClick={() => setForm(f => ({ 
                            ...f, 
                            periodi_aggiuntivi: f.periodi_aggiuntivi.filter((_, i) => i !== idx) 
                          }))}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  {/* Descrizione */}
                  <div className="space-y-2">
                    <Label>Descrizione (opzionale)</Label>
                    <Textarea 
                      value={form.descrizione} 
                      onChange={(e) => setForm(f => ({ ...f, descrizione: e.target.value }))} 
                      placeholder="Note aggiuntive sulla promozione..."
                      rows={2}
                    />
                  </div>

                  {/* Stato Attivo */}
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Checkbox 
                      id="attivo" 
                      checked={form.attivo} 
                      onCheckedChange={(c) => setForm(f => ({ ...f, attivo: !!c }))} 
                    />
                    <div>
                      <Label htmlFor="attivo" className="font-medium cursor-pointer">Promozione Attiva</Label>
                      <p className="text-xs text-muted-foreground">Disattiva per nascondere temporaneamente</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 2: Clienti */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200">
                <Checkbox 
                  id="tutti_clienti" 
                  checked={form.tutti_clienti} 
                  onCheckedChange={(c) => setForm(f => ({ ...f, tutti_clienti: !!c, clienti_ids: [] }))} 
                />
                <div className="flex-1">
                  <Label htmlFor="tutti_clienti" className="font-semibold text-blue-800 dark:text-blue-300 cursor-pointer">
                    Applica a tutti i clienti
                  </Label>
                  <p className="text-xs text-blue-600">Questa promozione sarà visibile per tutti</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>

              {!form.tutti_clienti && (
                <>
                  {/* Selected Clients Summary */}
                  {selectedClienti.length > 0 && (
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-green-800 dark:text-green-300">
                          {selectedClienti.length} clienti selezionati
                        </span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setForm(f => ({ ...f, clienti_ids: [] }))}
                          className="h-7 text-xs"
                        >
                          Deseleziona tutti
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {selectedClienti.slice(0, 5).map(c => (
                          <Badge key={c.id} variant="secondary" className="text-xs">
                            {c.nome}
                            <button onClick={() => toggleCliente(c.id)} className="ml-1">
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                        {selectedClienti.length > 5 && (
                          <Badge variant="outline" className="text-xs">
                            +{selectedClienti.length - 5} altri
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Cerca cliente per nome o azienda..."
                      value={clienteSearch}
                      onChange={(e) => setClienteSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>

                  {/* Client List */}
                  <ScrollArea className="h-[300px] border rounded-lg">
                    <div className="p-2 space-y-1">
                      {filteredClienti.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => toggleCliente(c.id)}
                          className={`w-full p-3 rounded-lg flex items-center gap-3 transition-all ${
                            form.clienti_ids.includes(c.id)
                              ? "bg-primary/10 border-2 border-primary"
                              : "bg-muted/30 hover:bg-muted/50 border-2 border-transparent"
                          }`}
                        >
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            form.clienti_ids.includes(c.id)
                              ? "bg-primary border-primary"
                              : "border-muted-foreground/30"
                          }`}>
                            {form.clienti_ids.includes(c.id) && (
                              <Check className="h-3 w-3 text-primary-foreground" />
                            )}
                          </div>
                          <div className="flex-1 text-left">
                            <p className="font-medium">{c.nome}</p>
                            <p className="text-xs text-muted-foreground">
                              {c.azienda || "Nessuna azienda"} {c.consorzio && `• ${c.consorzio}`}
                            </p>
                          </div>
                          {c.status && (
                            <Badge variant="outline" className="text-xs">{c.status}</Badge>
                          )}
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </>
              )}
            </div>
          )}

          {/* Step 3: Prodotti */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-xl">
                <p className="text-sm text-muted-foreground">
                  Seleziona i prodotti specifici su cui applicare la promozione. 
                  Se non selezioni nessun prodotto, la promozione varrà per tutti i prodotti dell'azienda.
                </p>
              </div>

              {/* Selected Products Summary */}
              {selectedProdotti.length > 0 && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-green-800 dark:text-green-300">
                      {selectedProdotti.length} prodotti selezionati
                    </span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setForm(f => ({ ...f, prodotti: [] }))}
                      className="h-7 text-xs"
                    >
                      Deseleziona tutti
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {selectedProdotti.slice(0, 5).map(p => (
                      <Badge key={p.id} variant="secondary" className="text-xs">
                        {p.nome}
                        <button onClick={() => toggleProdotto(p.id)} className="ml-1">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                    {selectedProdotti.length > 5 && (
                      <Badge variant="outline" className="text-xs">
                        +{selectedProdotti.length - 5} altri
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Cerca prodotto per nome o codice..."
                  value={prodottoSearch}
                  onChange={(e) => setProdottoSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Product List */}
              <ScrollArea className="h-[300px] border rounded-lg">
                <div className="p-2 space-y-1">
                  {filteredProdotti.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Nessun prodotto disponibile</p>
                      <p className="text-xs">Seleziona prima un'azienda o aggiungi prodotti</p>
                    </div>
                  ) : (
                    filteredProdotti.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => toggleProdotto(p.id)}
                        className={`w-full p-3 rounded-lg flex items-center gap-3 transition-all ${
                          form.prodotti.some(fp => fp.prodotto_id === p.id)
                            ? "bg-primary/10 border-2 border-primary"
                            : "bg-muted/30 hover:bg-muted/50 border-2 border-transparent"
                        }`}
                      >
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          form.prodotti.some(fp => fp.prodotto_id === p.id)
                            ? "bg-primary border-primary"
                            : "border-muted-foreground/30"
                        }`}>
                          {form.prodotti.some(fp => fp.prodotto_id === p.id) && (
                            <Check className="h-3 w-3 text-primary-foreground" />
                          )}
                        </div>
                        {p.immagine_url && (
                          <img src={p.immagine_url} alt="" className="w-10 h-10 rounded object-cover" />
                        )}
                        <div className="flex-1 text-left">
                          <p className="font-medium">{p.nome}</p>
                          <p className="text-xs text-muted-foreground">
                            {p.codice && `Cod: ${p.codice} • `}
                            €{p.prezzo_listino?.toFixed(2)}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          )}
        </ScrollArea>

        <Separator className="my-4" />

        <DialogFooter className="flex-row gap-2">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(s => s - 1)}>
              Indietro
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          {step < 3 ? (
            <Button onClick={() => setStep(s => s + 1)} disabled={!isStep1Valid}>
              Avanti
            </Button>
          ) : (
            <Button onClick={handleSave} disabled={isPending || !isStep1Valid}>
              {editingPromo ? "Salva Modifiche" : "Crea Promozione"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
