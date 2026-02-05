import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";
import { useScadenziario, ImportFatturaData } from "@/hooks/useScadenziario";
import { useAziende } from "@/hooks/useAziende";

interface ParsedRow {
  cliente: string;
  azienda: string;
  numero_fattura: string;
  data_fattura: string;
  data_scadenza: string;
  importo: number;
  provvigione: number;
  isValid: boolean;
  errors: string[];
}

export const ImportExcelDialog = () => {
  const [open, setOpen] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [aziendaNome, setAziendaNome] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { importFatture } = useScadenziario();
  const { data: aziende = [] } = useAziende();

  const parseExcelDate = (value: any): string | null => {
    if (!value) return null;
    
    // Se è già una stringa data
    if (typeof value === 'string') {
      // Prova formato italiano DD/MM/YYYY
      const italianMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (italianMatch) {
        return `${italianMatch[3]}-${italianMatch[2].padStart(2, '0')}-${italianMatch[1].padStart(2, '0')}`;
      }
      // Prova formato MM/DD/YY (Excel US format)
      const usShortMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
      if (usShortMatch) {
        const year = parseInt(usShortMatch[3]) > 50 ? `19${usShortMatch[3]}` : `20${usShortMatch[3]}`;
        return `${year}-${usShortMatch[1].padStart(2, '0')}-${usShortMatch[2].padStart(2, '0')}`;
      }
      // Prova formato ISO
      if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
        return value.split('T')[0];
      }
    }
    
    // Se è un numero (Excel serial date)
    if (typeof value === 'number') {
      const date = new Date((value - 25569) * 86400 * 1000);
      return date.toISOString().split('T')[0];
    }
    
    return null;
  };

  const parseNumber = (value: any): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      // Rimuovi simbolo valuta e spazi
      // Gestisce formato europeo con punti come separatori migliaia e virgola decimale
      let cleaned = value.replace(/[€$\s]/g, '');
      // Se contiene sia punti che virgole, assume formato europeo (1.234,56)
      if (cleaned.includes('.') && cleaned.includes(',')) {
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
      } else if (cleaned.includes(',')) {
        // Solo virgola - potrebbe essere decimale
        cleaned = cleaned.replace(',', '.');
      }
      return parseFloat(cleaned) || 0;
    }
    return 0;
  };

  const findAziendaProvvigione = (aziendaNome: string): number => {
    const azienda = aziende.find(a => 
      a.nome.toLowerCase().includes(aziendaNome.toLowerCase()) ||
      aziendaNome.toLowerCase().includes(a.nome.toLowerCase())
    );
    return azienda?.provvigione_percentuale || 0;
  };

  // Parser per il formato specifico del file scadenziario
  const parseScadenziarioFormat = (jsonData: any[]): ParsedRow[] => {
    const rows: ParsedRow[] = [];
    let currentCliente = '';
    
    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i] as any[];
      if (!row || row.length === 0) continue;
      
      // Controlla se è una riga "Cliente:"
      const rowStr = row.join(' ');
      if (rowStr.includes('Cliente :') || rowStr.includes('Cliente:')) {
        // Cerca il nome cliente nella stessa riga o nella colonna successiva
        for (let j = 0; j < row.length; j++) {
          const cell = String(row[j] || '');
          if (cell.includes('Cliente :') || cell.includes('Cliente:')) {
            // Il nome cliente è spesso nelle colonne successive
            // Cerca una cella che non sia un codice numerico puro
            for (let k = j + 1; k < row.length; k++) {
              const potentialName = String(row[k] || '').trim();
              // Salta codici come "02.0.07662" e celle vuote
              if (potentialName && !potentialName.match(/^\d{2}\.\d\.\d+$/) && potentialName.length > 3) {
                currentCliente = potentialName;
                break;
              }
            }
            break;
          }
        }
        continue;
      }
      
      // Salta righe di totale, intestazioni, zone, indirizzi
      if (rowStr.includes('Totale cliente') || 
          rowStr.includes('Totale Zona') || 
          rowStr.includes('Totale generale') ||
          rowStr.includes('Numero') && rowStr.includes('partita') ||
          rowStr.includes('Zona :') ||
          rowStr.includes('VIA ') ||
          rowStr.includes('STRADA ') ||
          /^\d{5}\s+[A-Z]/.test(rowStr)) { // CAP + città
        continue;
      }
      
      // Cerca righe fattura: devono avere un numero partita nella prima colonna
      // e contenere "Fattura nr." nel testo
      const firstCell = String(row[0] || '').trim();
      const hasInvoiceRef = rowStr.includes('Fattura nr.');
      
      if (firstCell && /^\d+$/.test(firstCell) && hasInvoiceRef) {
        const errors: string[] = [];
        
        // Estrai dati dalle colonne
        // Formato: Numero partita | Data partita | Data Scadenza | Importo | Descrizione | ... | Totale da pagare
        const numeroFattura = firstCell;
        const dataFattura = parseExcelDate(row[1]);
        const dataScadenza = parseExcelDate(row[2]);
        const importo = parseNumber(row[3]); // Importo Iniziale
        
        // Validazioni
        if (!currentCliente) errors.push('Cliente non identificato');
        if (!dataFattura) errors.push('Data fattura non valida');
        if (!dataScadenza) errors.push('Data scadenza non valida');
        if (importo <= 0) errors.push('Importo non valido');
        
        // Provvigione dall'azienda selezionata
        const provvigione = findAziendaProvvigione(aziendaNome);
        
        rows.push({
          cliente: currentCliente,
          azienda: aziendaNome,
          numero_fattura: numeroFattura,
          data_fattura: dataFattura || '',
          data_scadenza: dataScadenza || '',
          importo,
          provvigione,
          isValid: errors.length === 0,
          errors,
        });
      }
    }
    
    return rows;
  };

  // Parser generico per formati standard
  const parseStandardFormat = (jsonData: any[]): ParsedRow[] => {
    if (jsonData.length < 2) return [];
    
    // Prima riga = intestazioni
    const headers = (jsonData[0] as any[]).map(h => String(h).toLowerCase().trim());
    
    // Mappatura colonne (flessibile)
    const findColumn = (keywords: string[]): number => {
      return headers.findIndex(h => keywords.some(k => h.includes(k)));
    };

    const colMap = {
      cliente: findColumn(['cliente', 'ragione sociale', 'denominazione']),
      azienda: findColumn(['azienda', 'fornitore', 'brand', 'marca']),
      numero: findColumn(['numero', 'n.', 'fattura', 'doc']),
      dataFattura: findColumn(['data fattura', 'data doc', 'emissione']),
      dataScadenza: findColumn(['scadenza', 'data scadenza']),
      importo: findColumn(['importo', 'totale', 'valore', 'euro']),
      provvigione: findColumn(['provvigione', '%', 'percentuale']),
    };

    const rows: ParsedRow[] = [];

    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i] as any[];
      if (!row || row.length === 0 || !row.some(cell => cell)) continue;

      const errors: string[] = [];
      
      const cliente = colMap.cliente >= 0 ? String(row[colMap.cliente] || '').trim() : '';
      const azienda = colMap.azienda >= 0 ? String(row[colMap.azienda] || '').trim() : aziendaNome;
      const numero = colMap.numero >= 0 ? String(row[colMap.numero] || '').trim() : '';
      const dataFattura = colMap.dataFattura >= 0 ? parseExcelDate(row[colMap.dataFattura]) : null;
      const dataScadenza = colMap.dataScadenza >= 0 ? parseExcelDate(row[colMap.dataScadenza]) : null;
      const importo = colMap.importo >= 0 ? parseNumber(row[colMap.importo]) : 0;
      let provvigione = colMap.provvigione >= 0 ? parseNumber(row[colMap.provvigione]) : null;

      // Se non c'è provvigione nel file, usa quella dell'azienda
      if (provvigione === null || provvigione === 0) {
        provvigione = findAziendaProvvigione(azienda);
      }

      // Validazioni
      if (!cliente) errors.push('Cliente mancante');
      if (!azienda) errors.push('Azienda mancante');
      if (!numero) errors.push('Numero fattura mancante');
      if (!dataFattura) errors.push('Data fattura non valida');
      if (!dataScadenza) errors.push('Data scadenza non valida');
      if (importo <= 0) errors.push('Importo non valido');

      rows.push({
        cliente,
        azienda,
        numero_fattura: numero,
        data_fattura: dataFattura || '',
        data_scadenza: dataScadenza || '',
        importo,
        provvigione: provvigione || 0,
        isValid: errors.length === 0,
        errors,
      });
    }
    
    return rows;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);

    try {
      // Importa xlsx dinamicamente
      const XLSX = await import('xlsx');
      
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (jsonData.length < 2) {
        throw new Error('File vuoto o senza dati');
      }

      // Determina il formato del file
      const firstRow = jsonData[0] as any[];
      const fileContent = JSON.stringify(jsonData).toLowerCase();
      
      let rows: ParsedRow[];
      
      // Rileva formato scadenziario (contiene "Cliente :" e "Fattura nr.")
      if (fileContent.includes('cliente :') && fileContent.includes('fattura nr.')) {
        rows = parseScadenziarioFormat(jsonData);
      } else {
        rows = parseStandardFormat(jsonData);
      }

      setParsedData(rows);
    } catch (error) {
      console.error('Errore parsing file:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    const validRows = parsedData.filter(r => r.isValid);
    
    const dataToImport: ImportFatturaData[] = validRows.map(r => ({
      cliente_nome: r.cliente,
      azienda_nome: r.azienda,
      numero_fattura: r.numero_fattura,
      data_fattura: r.data_fattura,
      data_scadenza: r.data_scadenza,
      importo: r.importo,
      percentuale_provvigione: r.provvigione,
    }));

    await importFatture.mutateAsync(dataToImport);
    setOpen(false);
    setParsedData([]);
    setFileName(null);
    setAziendaNome("");
  };

  const validCount = parsedData.filter(r => r.isValid).length;
  const invalidCount = parsedData.filter(r => !r.isValid).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Upload className="h-4 w-4" />
          Importa Scadenziario da Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importa Scadenziario Clienti
          </DialogTitle>
          <DialogDescription>
            Carica un file Excel con le fatture da incassare. Supporta sia formati standard
            che il formato scadenziario con righe per cliente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Selezione azienda */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Azienda mandante *</label>
            <select
              value={aziendaNome}
              onChange={(e) => setAziendaNome(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Seleziona azienda...</option>
              {aziende.map((a) => (
                <option key={a.id} value={a.nome}>
                  {a.nome} {a.provvigione_percentuale ? `(${a.provvigione_percentuale}%)` : ''}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              La provvigione verrà calcolata in base alla percentuale dell'azienda selezionata
            </p>
          </div>

          {/* Upload area */}
          <div 
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              aziendaNome 
                ? 'border-muted hover:border-primary/50 cursor-pointer' 
                : 'border-muted/50 opacity-50 cursor-not-allowed'
            }`}
            onClick={() => aziendaNome && fileInputRef.current?.click()}
          >
            <Input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
              disabled={!aziendaNome}
            />
            <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            {fileName ? (
              <p className="font-medium">{fileName}</p>
            ) : !aziendaNome ? (
              <p className="text-muted-foreground">
                Seleziona prima un'azienda mandante
              </p>
            ) : (
              <p className="text-muted-foreground">
                Clicca o trascina un file Excel (.xlsx, .xls, .csv)
              </p>
            )}
          </div>

          {isProcessing && (
            <p className="text-center text-muted-foreground">Elaborazione in corso...</p>
          )}

          {/* Anteprima dati */}
          {parsedData.length > 0 && (
            <>
              <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">{validCount} valide</span>
                </div>
                {invalidCount > 0 && (
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-5 w-5" />
                    <span className="font-medium">{invalidCount} con errori</span>
                  </div>
                )}
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-64">
                  <table className="w-full text-sm">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left">Stato</th>
                        <th className="px-3 py-2 text-left">Cliente</th>
                        <th className="px-3 py-2 text-left">Azienda</th>
                        <th className="px-3 py-2 text-left">N. Fattura</th>
                        <th className="px-3 py-2 text-left">Scadenza</th>
                        <th className="px-3 py-2 text-right">Importo</th>
                        <th className="px-3 py-2 text-right">Provv. %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData.slice(0, 50).map((row, idx) => (
                        <tr 
                          key={idx} 
                          className={`border-t ${!row.isValid ? 'bg-destructive/10' : ''}`}
                        >
                          <td className="px-3 py-2">
                            {row.isValid ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-destructive" />
                            )}
                          </td>
                          <td className="px-3 py-2">{row.cliente}</td>
                          <td className="px-3 py-2">{row.azienda}</td>
                          <td className="px-3 py-2">{row.numero_fattura}</td>
                          <td className="px-3 py-2">{row.data_scadenza}</td>
                          <td className="px-3 py-2 text-right">€{row.importo.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right">{row.provvigione}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parsedData.length > 50 && (
                  <p className="p-2 text-center text-sm text-muted-foreground bg-muted">
                    Mostrate 50 di {parsedData.length} righe
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => {
                  setParsedData([]);
                  setFileName(null);
                }}>
                  Annulla
                </Button>
                <Button 
                  onClick={handleImport} 
                  disabled={validCount === 0 || importFatture.isPending || !aziendaNome}
                >
                  {importFatture.isPending ? 'Importazione...' : `Importa ${validCount} fatture`}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
