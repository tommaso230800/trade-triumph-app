import { useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Loader2, Sparkles, Trash2, Upload, FileText, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAziende } from "@/hooks/useAziende";
import { useClienti } from "@/hooks/useClienti";
import { useProdotti } from "@/hooks/useProdotti";
import { useCreateCanvass } from "@/hooks/useCanvass";

type Tipologia =
  | "sconto_percentuale"
  | "prezzo_promozionale"
  | "prezzo_netto"
  | "x_piu_y"
  | "cartoni_omaggio"
  | "sconto_cartone"
  | "sconto_pallet"
  | "contributo_fisso"
  | "premio_sell_in"
  | "premio_sell_out"
  | "incentivo_quantita"
  | "bonus_carburante"
  | "materiale_promozionale"
  | "canvass_obiettivo"
  | "altro";

interface Riga {
  prodotto_testo: string;
  codice_prodotto?: string | null;
  prodotto_id?: string | null;
  candidati_prodotti?: { id: string; nome: string; codice?: string | null; score: number }[];
  tipologia: Tipologia;
  prezzo_promozionale?: number | null;
  sconto_percentuale?: number | null;
  cartoni_acquisto?: number | null;
  cartoni_omaggio?: number | null;
  quantita_minima?: number | null;
  data_inizio?: string | null;
  data_fine?: string | null;
  note?: string | null;
  warnings?: string[];
  salva_come?: "canvass" | "promozione";
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const TIPOLOGIA_LABELS: Record<Tipologia, string> = {
  sconto_percentuale: "Sconto %",
  prezzo_promozionale: "Prezzo promo",
  prezzo_netto: "Prezzo netto",
  x_piu_y: "X + Y omaggio",
  cartoni_omaggio: "Cartoni omaggio",
  sconto_cartone: "Sconto a cartone",
  sconto_pallet: "Sconto a pallet",
  contributo_fisso: "Contributo fisso",
  premio_sell_in: "Premio sell-in",
  premio_sell_out: "Premio sell-out",
  incentivo_quantita: "Incentivo a quantità",
  bonus_carburante: "Bonus carburante",
  materiale_promozionale: "Materiale/attrezzatura",
  canvass_obiettivo: "Canvass obiettivo",
  altro: "Altro",
};

function tipologiaToCanvass(t: Tipologia): "sconto_percentuale" | "prezzo_fisso" | "premio_fine_anno" {
  if (t === "sconto_percentuale" || t === "sconto_cartone" || t === "sconto_pallet") return "sconto_percentuale";
  if (t === "prezzo_promozionale" || t === "prezzo_netto" || t === "x_piu_y" || t === "cartoni_omaggio") return "prezzo_fisso";
  return "premio_fine_anno";
}

export function AIImportCanvassDialog({ open, onOpenChange }: Props) {
  const { data: aziende = [] } = useAziende();
  const { data: clienti = [] } = useClienti();
  const { data: prodottiAll = [] } = useProdotti();
  const createCanvass = useCreateCanvass();

  const [aziendaId, setAziendaId] = useState<string>("");
  const [inputMode, setInputMode] = useState<"file" | "text">("file");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<"input" | "preview">("input");
  const [righe, setRighe] = useState<Riga[]>([]);
  const [tipoSuggerito, setTipoSuggerito] = useState<"canvass" | "promozione" | "misto">("promozione");
  const [warningsGlobali, setWarningsGlobali] = useState<string[]>([]);
  const [periodoGenerale, setPeriodoGenerale] = useState<{ data_inizio: string; data_fine: string }>({
    data_inizio: "",
    data_fine: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const prodottiAzienda = useMemo(
    () => prodottiAll.filter((p) => p.azienda_id === aziendaId),
    [prodottiAll, aziendaId],
  );

  const reset = () => {
    setAziendaId("");
    setText("");
    setFile(null);
    setStep("input");
    setRighe([]);
    setWarningsGlobali([]);
    setPeriodoGenerale({ data_inizio: "", data_fine: "" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const analyze = async () => {
    if (!aziendaId) {
      toast.error("Seleziona prima l'azienda di riferimento");
      return;
    }
    if (inputMode === "file" && !file) {
      toast.error("Carica un file da analizzare");
      return;
    }
    if (inputMode === "text" && !text.trim()) {
      toast.error("Inserisci il testo da analizzare");
      return;
    }

    setAnalyzing(true);
    try {
      const azienda = aziende.find((a) => a.id === aziendaId);
      let payload: any = {
        azienda_id: aziendaId,
        azienda_nome: azienda?.nome,
        clienti: clienti.map((c) => ({ nome: c.nome, consorzio: c.consorzio })),
        aziende: aziende.map((a) => ({ nome: a.nome })),
        prodotti: prodottiAzienda.map((p) => ({
          id: p.id,
          nome: p.nome,
          codice: p.codice,
          formato: p.formato,
        })),
      };

      if (inputMode === "text") {
        payload.text_input = text.trim();
      } else if (file) {
        const b64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        payload.file_base64 = b64;
        payload.file_type = file.type;
      }

      const { data, error } = await supabase.functions.invoke("parse-canvass-document", { body: payload });
      if (error || data?.error) {
        toast.error(data?.error || error?.message || "Errore nell'analisi");
        return;
      }
      const parsed = data.data;
      const suggerito: "canvass" | "promozione" | "misto" = parsed.tipo_suggerito || "promozione";
      const defaultSalva: "canvass" | "promozione" = suggerito === "canvass" ? "canvass" : "promozione";
      const rows: Riga[] = (parsed.righe || []).map((r: any) => ({
        ...r,
        salva_come: r.tipologia === "canvass_obiettivo" ? "canvass" : defaultSalva,
      }));
      if (!rows.length) {
        toast.warning("L'AI non ha estratto righe. Prova con un altro documento o del testo.");
        return;
      }
      setRighe(rows);
      setTipoSuggerito(suggerito);
      setWarningsGlobali(parsed.warnings_globali || []);
      setPeriodoGenerale({
        data_inizio: parsed.periodo_generale?.data_inizio || "",
        data_fine: parsed.periodo_generale?.data_fine || "",
      });
      setStep("preview");
    } catch (e: any) {
      toast.error("Errore: " + (e.message || "sconosciuto"));
    } finally {
      setAnalyzing(false);
    }
  };

  const updateRiga = (idx: number, patch: Partial<Riga>) => {
    setRighe((rs) => rs.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };
  const removeRiga = (idx: number) => setRighe((rs) => rs.filter((_, i) => i !== idx));

  const saveAll = async () => {
    if (!aziendaId) return;
    const yearNow = new Date().getFullYear();
    const defaultStart = periodoGenerale.data_inizio || `${yearNow}-01-01`;
    const defaultEnd = periodoGenerale.data_fine || `${yearNow}-12-31`;

    setSaving(true);
    let ok = 0;
    let fail = 0;

    for (const r of righe) {
      try {
        const tipo = tipologiaToCanvass(r.tipologia);
        const valore =
          tipo === "sconto_percentuale"
            ? r.sconto_percentuale ?? 0
            : tipo === "prezzo_fisso"
              ? r.prezzo_promozionale ?? 0
              : r.quantita_minima ?? 0;

        await createCanvass.mutateAsync({
          canvass: {
            azienda_id: aziendaId,
            nome: `${r.salva_come === "canvass" ? "[Canvass] " : ""}${r.prodotto_testo || TIPOLOGIA_LABELS[r.tipologia]}`,
            descrizione: [TIPOLOGIA_LABELS[r.tipologia], r.note].filter(Boolean).join(" - ") || null,
            tipo,
            valore: Number(valore) || 0,
            data_inizio: r.data_inizio || defaultStart,
            data_fine: r.data_fine || defaultEnd,
            attivo: true,
            tutti_clienti: true,
            cartoni_omaggio: r.cartoni_omaggio ?? 0,
            cartoni_acquisto: r.cartoni_acquisto ?? 0,
          },
          clienti_ids: [],
          prodotti: r.prodotto_id ? [{ prodotto_id: r.prodotto_id }] : [],
          periodi: [],
        });
        ok++;
      } catch (e) {
        console.error(e);
        fail++;
      }
    }
    setSaving(false);
    if (ok) toast.success(`Importate ${ok} righe${fail ? `, ${fail} in errore` : ""}`);
    else if (fail) toast.error(`Impossibile salvare (${fail} errori)`);
    if (ok) handleClose(false);
  };

  const azienda = aziende.find((a) => a.id === aziendaId);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Importazione AI - Canvass & Promozioni
          </DialogTitle>
          <DialogDescription>
            Seleziona l'azienda, carica un documento o incolla il testo. L'AI riconosce prodotti e condizioni. Rivedi e conferma prima del salvataggio.
          </DialogDescription>
        </DialogHeader>

        {step === "input" && (
          <div className="space-y-5">
            <div>
              <Label>Azienda di riferimento *</Label>
              <Select value={aziendaId} onValueChange={setAziendaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona azienda..." />
                </SelectTrigger>
                <SelectContent>
                  {aziende.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {aziendaId && (
                <p className="text-xs text-muted-foreground mt-1">
                  {prodottiAzienda.length} prodotti nel catalogo di {azienda?.nome}
                </p>
              )}
            </div>

            <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as any)}>
              <TabsList>
                <TabsTrigger value="file">
                  <Upload className="h-4 w-4 mr-2" />
                  File / Immagine / PDF
                </TabsTrigger>
                <TabsTrigger value="text">
                  <FileText className="h-4 w-4 mr-2" />
                  Testo libero
                </TabsTrigger>
              </TabsList>
              <TabsContent value="file" className="pt-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                />
                {file && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {file.name} - {(file.size / 1024).toFixed(0)} KB
                  </p>
                )}
              </TabsContent>
              <TabsContent value="text" className="pt-3">
                <Textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Incolla qui il testo di una circolare, email o listino..."
                  rows={10}
                />
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button variant="outline" onClick={() => handleClose(false)}>
                Annulla
              </Button>
              <Button onClick={analyze} disabled={analyzing || !aziendaId}>
                {analyzing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Analizza con AI
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Azienda: {azienda?.nome}</Badge>
                <Badge>Suggerito: {tipoSuggerito}</Badge>
                <Badge variant="outline">{righe.length} righe estratte</Badge>
              </div>
              <div className="flex items-center gap-2">
                <div>
                  <Label className="text-xs">Periodo dal</Label>
                  <Input
                    type="date"
                    value={periodoGenerale.data_inizio}
                    onChange={(e) => setPeriodoGenerale((p) => ({ ...p, data_inizio: e.target.value }))}
                    className="h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs">al</Label>
                  <Input
                    type="date"
                    value={periodoGenerale.data_fine}
                    onChange={(e) => setPeriodoGenerale((p) => ({ ...p, data_fine: e.target.value }))}
                    className="h-8"
                  />
                </div>
              </div>
            </div>

            {warningsGlobali.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Attenzione</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-4 text-sm">
                    {warningsGlobali.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Prodotto</TableHead>
                    <TableHead>Tipologia</TableHead>
                    <TableHead>Prezzo</TableHead>
                    <TableHead>Sconto %</TableHead>
                    <TableHead>Q.tà</TableHead>
                    <TableHead>Omaggio</TableHead>
                    <TableHead>Validità</TableHead>
                    <TableHead>Salva come</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {righe.map((r, idx) => (
                    <TableRow key={idx} className={r.warnings?.length ? "bg-amber-500/5" : ""}>
                      <TableCell className="space-y-1">
                        <div className="text-xs text-muted-foreground">{r.prodotto_testo}</div>
                        <Select
                          value={r.prodotto_id || "__none__"}
                          onValueChange={(v) => updateRiga(idx, { prodotto_id: v === "__none__" ? null : v })}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Seleziona prodotto" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">— Nessun prodotto —</SelectItem>
                            {r.candidati_prodotti?.slice(0, 5).map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.nome} {c.codice ? `[${c.codice}]` : ""} ({Math.round(c.score * 100)}%)
                              </SelectItem>
                            ))}
                            {prodottiAzienda
                              .filter((p) => !r.candidati_prodotti?.some((c) => c.id === p.id))
                              .map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.nome} {p.codice ? `[${p.codice}]` : ""}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        {r.warnings?.map((w, wi) => (
                          <div key={wi} className="text-xs text-amber-600 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {w}
                          </div>
                        ))}
                      </TableCell>
                      <TableCell>
                        <Select value={r.tipologia} onValueChange={(v) => updateRiga(idx, { tipologia: v as Tipologia })}>
                          <SelectTrigger className="h-8 text-xs w-[160px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.keys(TIPOLOGIA_LABELS) as Tipologia[]).map((t) => (
                              <SelectItem key={t} value={t}>
                                {TIPOLOGIA_LABELS[t]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          value={r.prezzo_promozionale ?? ""}
                          onChange={(e) =>
                            updateRiga(idx, {
                              prezzo_promozionale: e.target.value === "" ? null : parseFloat(e.target.value),
                            })
                          }
                          className="h-8 w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          value={r.sconto_percentuale ?? ""}
                          onChange={(e) =>
                            updateRiga(idx, {
                              sconto_percentuale: e.target.value === "" ? null : parseFloat(e.target.value),
                            })
                          }
                          className="h-8 w-16"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={r.cartoni_acquisto ?? ""}
                          onChange={(e) =>
                            updateRiga(idx, {
                              cartoni_acquisto: e.target.value === "" ? null : parseInt(e.target.value),
                            })
                          }
                          className="h-8 w-16"
                          placeholder="ct"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={r.cartoni_omaggio ?? ""}
                          onChange={(e) =>
                            updateRiga(idx, {
                              cartoni_omaggio: e.target.value === "" ? null : parseInt(e.target.value),
                            })
                          }
                          className="h-8 w-16"
                          placeholder="ct"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Input
                            type="date"
                            value={r.data_inizio || ""}
                            onChange={(e) => updateRiga(idx, { data_inizio: e.target.value || null })}
                            className="h-7 text-xs"
                          />
                          <Input
                            type="date"
                            value={r.data_fine || ""}
                            onChange={(e) => updateRiga(idx, { data_fine: e.target.value || null })}
                            className="h-7 text-xs"
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={r.salva_come || "promozione"}
                          onValueChange={(v) => updateRiga(idx, { salva_come: v as "canvass" | "promozione" })}
                        >
                          <SelectTrigger className="h-8 text-xs w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="promozione">Promozione</SelectItem>
                            <SelectItem value="canvass">Canvass</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" onClick={() => removeRiga(idx)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("input")} disabled={saving}>
                Indietro
              </Button>
              <Button onClick={saveAll} disabled={saving || righe.length === 0}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Conferma e importa {righe.length} righe
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
