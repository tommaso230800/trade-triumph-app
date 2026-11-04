import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAziende } from '@/hooks/useAziende';
import { useClienti } from '@/hooks/useClienti';
import {
  useDocumenti, useUploadDocumento, useUpdateDocumento, useDeleteDocumento, getDocumentoSignedUrl,
  useDocumentiAziende, CATEGORIE_DOCUMENTO, TIPO_TO_CATEGORIA, STATO_LABEL, type Documento,
} from '@/hooks/useDocumenti';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DocumentThumbnail } from './DocumentThumbnail';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import {
  Upload, Download, Eye, Pencil, Plus, Trash2, RefreshCw, X, FolderOpen, Folder,
  FileText, AlertTriangle, CheckCircle2, Loader2, ChevronRight, ArrowLeft,
  Cloud, CloudUpload, ExternalLink,
} from 'lucide-react';
import { useOneDrivePush } from '@/hooks/useOneDriveSync';
import { toast } from 'sonner';
import { OrderPdfPreview } from '@/components/ordini/OrderPdfPreview';

type UploadItem = { name: string; state: 'attesa' | 'caricamento' | 'analisi' | 'fatto' | 'errore' };

const STATO_VARIANT: Record<Documento['stato_elaborazione'], 'default' | 'secondary' | 'outline' | 'destructive'> = {
  in_elaborazione: 'secondary',
  archiviato: 'default',
  da_verificare: 'outline',
  errore: 'destructive',
};

function categoriaOf(d: Documento): string {
  return d.category || TIPO_TO_CATEGORIA[d.tipo] || 'Altri documenti';
}

async function extractText(d: Documento): Promise<string | undefined> {
  if (!/\.(xlsx?|xlsm|csv|pdf|docx)$/i.test(d.nome_file)) return undefined;
  const url = await getDocumentoSignedUrl(d.storage_path);
  const blob = await (await fetch(url)).blob();
  const file = new File([blob], d.nome_file, { type: d.mime_type || undefined });
  if (/\.pdf$/i.test(d.nome_file)) {
    const { readPdfText } = await import('@/lib/pdfDocumentText');
    return readPdfText(file).catch(() => '');
  }
  const { spreadsheetText, wordText, isWordFile } = await import('@/lib/documentText');
  if (isWordFile(d.nome_file)) return wordText(file).catch(() => '');
  return spreadsheetText(file).catch(() => '');
}

export function FileArchive({ companyId, customerId, onSelect }: { companyId?: string; customerId?: string; onSelect?: (d: Documento) => void }) {
  const { data: docs = [], isLoading, isError, refetch } = useDocumenti();
  const { data: links = [] } = useDocumentiAziende();
  const { data: companies = [] } = useAziende();
  const { data: clients = [] } = useClienti();
  const upload = useUploadDocumento();
  const update = useUpdateDocumento();
  const remove = useDeleteDocumento();

  const [view, setView] = useState<'cartelle' | 'tutti' | 'verificare'>('cartelle');
  const [openCompany, setOpenCompany] = useState<string | null>(companyId || null);
  const [analyzing, setAnalyzing] = useState(false);
  const [deleting, setDeleting] = useState<Documento | null>(null);
  const [sort, setSort] = useState('recent');
  const [from, setFrom] = useState('');
  const [until, setUntil] = useState('');
  const [company, setCompany] = useState(companyId || '');
  const [customer, setCustomer] = useState(customerId || '');
  const [category, setCategory] = useState('all');
  const [year, setYear] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Documento | null>(null);
  const [detail, setDetail] = useState<Documento | null>(null);
  const [preview, setPreview] = useState<{ url: string; type: string; name: string; blob?: Blob } | null>(null);
  const [queue, setQueue] = useState<UploadItem[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const [searchParams] = useSearchParams();

  // Deep link: /file-documenti?doc=<id> apre direttamente la scheda.
  useEffect(() => {
    const docId = searchParams.get('doc');
    if (docId && docs.length) {
      const found = docs.find(d => d.id === docId);
      if (found) { setDetail(found); setView('tutti'); }
    }
  }, [searchParams, docs]);

  const companyName = (id: string | null) => companies.find(a => a.id === id)?.nome || '—';
  const customerName = (id: string | null) => clients.find(c => c.id === id)?.nome || '—';

  /** Aziende visibili per un documento: principale + collegamenti multi-azienda. */
  const docCompanyIds = (d: Documento) => {
    const ids = new Set<string>();
    if (d.company_id) ids.add(d.company_id);
    if (d.entita === 'azienda' && d.entita_id) ids.add(d.entita_id);
    for (const l of links) if (l.documento_id === d.id) ids.add(l.azienda_id);
    return [...ids];
  };

  const matchesFilters = (d: Documento) => {
    if (company && !docCompanyIds(d).includes(company)) return false;
    if (customer && d.customer_id !== customer && !(d.entita === 'cliente' && d.entita_id === customer)) return false;
    if (category !== 'all' && categoriaOf(d) !== category) return false;
    if (year && String(d.reference_year) !== year && !d.data_documento?.startsWith(year)) return false;
    if (from && d.created_at.slice(0, 10) < from) return false;
    if (until && d.created_at.slice(0, 10) > until) return false;
    if (search) {
      const haystack = `${d.nome_file} ${d.titolo || ''} ${d.riepilogo || ''} ${(d.keywords || []).join(' ')} ${d.testo_estratto || ''} ${d.numero_documento || ''} ${companyName(d.company_id)} ${customerName(d.customer_id)}`.toLowerCase();
      const terms = search.toLowerCase().split(/\s+/).filter(Boolean);
      if (!terms.every(t => haystack.includes(t))) return false;
    }
    return true;
  };

  const filtered = useMemo(
    () => docs.filter(matchesFilters).sort((a, b) =>
      sort === 'name' ? a.nome_file.localeCompare(b.nome_file)
        : sort === 'old' ? a.created_at.localeCompare(b.created_at)
        : b.created_at.localeCompare(a.created_at)),
    [docs, links, company, customer, category, year, from, until, search, sort],
  );

  const daVerificare = docs.filter(d => d.association_status === 'review' || d.stato_elaborazione === 'da_verificare' || d.stato_elaborazione === 'errore');

  /** Cartelle: una per azienda con almeno un documento, più "Senza azienda". */
  const folders = useMemo(() => {
    const map = new Map<string, Documento[]>();
    for (const d of docs) {
      const ids = docCompanyIds(d);
      if (!ids.length) {
        map.set('__none__', [...(map.get('__none__') || []), d]);
      } else {
        for (const id of ids) map.set(id, [...(map.get(id) || []), d]);
      }
    }
    return map;
  }, [docs, links]);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    const items: UploadItem[] = Array.from(files).map(f => ({ name: f.name, state: 'attesa' }));
    setQueue(items);
    let failures = 0;
    for (let i = 0; i < items.length; i++) {
      const file = Array.from(files)[i];
      setQueue(q => q.map((x, k) => k === i ? { ...x, state: 'caricamento' } : x));
      try {
        setQueue(q => q.map((x, k) => k === i ? { ...x, state: 'analisi' } : x));
        await upload.mutateAsync({
          file,
          entita: company ? 'azienda' : 'generico',
          entita_id: company || null,
          company_id: company || null,
          customer_id: customer || null,
          reference_year: year ? Number(year) : null,
          category: category === 'all' ? null : category,
          autoClassify: true,
        });
        setQueue(q => q.map((x, k) => k === i ? { ...x, state: 'fatto' } : x));
      } catch {
        failures++;
        setQueue(q => q.map((x, k) => k === i ? { ...x, state: 'errore' } : x));
      }
    }
    if (failures) toast.error(`${failures} file non caricati. Gli altri sono stati salvati.`);
    setTimeout(() => setQueue([]), 4000);
  }

  async function analyzeOne(d: Documento) {
    const text = await extractText(d).catch(() => undefined);
    const { error } = await supabase.functions.invoke('classify-document', { body: { documento_id: d.id, text } });
    if (error) throw error;
  }

  async function analyzeAll() {
    setAnalyzing(true);
    let failures = 0;
    try {
      for (const d of docs.filter(d => d.association_status !== 'manual')) {
        try { await analyzeOne(d); } catch { failures++; }
      }
      await refetch();
      toast[failures ? 'warning' : 'success'](failures ? `Analisi completata con ${failures} errori. I file restano salvati.` : 'Analisi completata; collegamenti manuali conservati.');
    } finally { setAnalyzing(false); }
  }

  async function open(d: Documento, download = false) {
    try {
      const url = await getDocumentoSignedUrl(d.storage_path);
      if (download) {
        const blob = await (await fetch(url)).blob();
        const href = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = href; a.download = d.nome_file; a.click();
        setTimeout(() => URL.revokeObjectURL(href), 1000);
      } else {
        const blob = d.mime_type === 'application/pdf' ? await (await fetch(url)).blob() : undefined;
        setPreview({ url, type: d.mime_type || '', name: d.nome_file, blob });
      }
    } catch { toast.error('File non disponibile. Riprova.'); }
  }

  function StatoBadge({ d }: { d: Documento }) {
    return (
      <Badge variant={STATO_VARIANT[d.stato_elaborazione]} className="whitespace-normal">
        {d.stato_elaborazione === 'in_elaborazione' && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
        {STATO_LABEL[d.stato_elaborazione]}
      </Badge>
    );
  }

  function SyncBadge({ d }: { d: Documento }) {
    if (d.sync_stato === 'sincronizzato')
      return <Badge variant="secondary" className="whitespace-normal"><Cloud className="mr-1 h-3 w-3" />OneDrive</Badge>;
    if (d.sync_stato === 'conflitto')
      return <Badge variant="destructive" className="whitespace-normal"><AlertTriangle className="mr-1 h-3 w-3" />Conflitto OneDrive</Badge>;
    if (d.sync_stato === 'eliminato_remoto')
      return <Badge variant="outline" className="whitespace-normal">Eliminato su OneDrive</Badge>;
    if (d.sync_stato === 'solo_riferimento')
      return <Badge variant="outline" className="whitespace-normal"><Cloud className="mr-1 h-3 w-3" />Solo riferimento OneDrive</Badge>;
    return null;
  }

  function OneDriveActions({ d, iconOnly }: { d: Documento; iconOnly?: boolean }) {
    const push = useOneDrivePush();
    const canPush = !d.onedrive_item_id && !d.storage_path.startsWith('onedrive://');
    return (
      <>
        {d.onedrive_web_url && (
          <Button aria-label={`Apri ${d.nome_file} in OneDrive`} size={iconOnly ? 'icon' : 'default'} variant="outline"
            onClick={() => window.open(d.onedrive_web_url!, '_blank', 'noopener')}>
            <ExternalLink className={iconOnly ? 'h-4 w-4' : 'mr-2 h-4 w-4'} />{!iconOnly && 'Apri in OneDrive'}
          </Button>
        )}
        {canPush && (
          <Button aria-label={`Carica ${d.nome_file} su OneDrive`} size={iconOnly ? 'icon' : 'default'} variant="outline"
            disabled={push.isPending}
            onClick={() => push.mutate({ documentoId: d.id })}>
            {push.isPending ? <Loader2 className={iconOnly ? 'h-4 w-4 animate-spin' : 'mr-2 h-4 w-4 animate-spin'} /> : <CloudUpload className={iconOnly ? 'h-4 w-4' : 'mr-2 h-4 w-4'} />}
            {!iconOnly && 'Invia a OneDrive'}
          </Button>
        )}
      </>
    );
  }

  function DocRow({ d }: { d: Documento }) {
    return (
      <article className="flex min-w-0 items-start gap-3 rounded-lg border p-4" key={d.id}>
        <button className="w-16 shrink-0 sm:w-20" onClick={() => setDetail(d)} aria-label={`Apri scheda ${d.nome_file}`}>
          <DocumentThumbnail path={d.storage_path} mime={d.mime_type} name={d.nome_file} />
        </button>
        <div className="min-w-0 flex-1">
          <button className="min-w-0 text-left" onClick={() => setDetail(d)}>
            <p className="break-words text-sm font-semibold">{d.titolo || d.nome_file}</p>
            {d.titolo && <p className="break-words text-xs text-muted-foreground">{d.nome_file}</p>}
          </button>
          <div className="my-2 flex flex-wrap gap-2">
            <StatoBadge d={d} />
            <SyncBadge d={d} />
            {d.association_status === 'review' && <Badge variant="outline" className="whitespace-normal">Associazione da verificare</Badge>}
            {d.versione_di && <Badge variant="secondary">Nuova versione</Badge>}
          </div>
          <p className="text-xs text-muted-foreground">
            {categoriaOf(d)}
            {d.data_documento ? ` · doc. ${new Date(d.data_documento + 'T00:00:00').toLocaleDateString('it-IT')}` : ''}
            {` · caricato ${new Date(d.created_at).toLocaleDateString('it-IT')}`}
          </p>
          <p className="text-xs text-muted-foreground">
            {docCompanyIds(d).map(id => companyName(id)).join(', ') || '—'}
            {d.customer_id ? ` · ${customerName(d.customer_id)}` : ''}
          </p>
          {d.riepilogo && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{d.riepilogo}</p>}
          <div className="mt-2 flex flex-wrap gap-2">
            <Button aria-label={`Anteprima ${d.nome_file}`} size="icon" variant="outline" onClick={() => open(d)}><Eye className="h-4 w-4" /></Button>
            <Button aria-label={`Scarica ${d.nome_file}`} size="icon" variant="outline" onClick={() => open(d, true)}><Download className="h-4 w-4" /></Button>
            <Button aria-label={`Modifica ${d.nome_file}`} size="icon" variant="ghost" onClick={() => setEditing({ ...d })}><Pencil className="h-4 w-4" /></Button>
            <OneDriveActions d={d} iconOnly />
            {(d.stato_elaborazione === 'errore' || d.stato_elaborazione === 'da_verificare') && (
              <Button aria-label={`Rianalizza ${d.nome_file}`} size="icon" variant="ghost"
                onClick={async () => { try { await analyzeOne(d); await refetch(); toast.success('Analisi completata'); } catch { toast.error('Analisi non riuscita. Riprova.'); } }}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
            <Button size="icon" variant="ghost" aria-label={`Elimina ${d.nome_file}`} onClick={() => setDeleting(d)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            {onSelect && <Button variant="outline" onClick={() => onSelect(d)}><Plus className="mr-2 h-4 w-4" />Seleziona</Button>}
          </div>
        </div>
      </article>
    );
  }

  const folderList = [...folders.entries()].sort((a, b) =>
    (a[0] === '__none__' ? '￿' : companyName(a[0])).localeCompare(b[0] === '__none__' ? '￿' : companyName(b[0])));

  return (
    <section className="min-w-0 space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Archivio documenti</h2>
          <p className="text-xs text-muted-foreground">{docs.length} documenti · {daVerificare.length} da verificare</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled={analyzing} onClick={analyzeAll}>
            <RefreshCw className={`mr-2 h-4 w-4 ${analyzing ? 'animate-spin' : ''}`} />{analyzing ? 'Analisi…' : 'Analizza archivio'}
          </Button>
          <Button disabled={upload.isPending} onClick={() => fileInput.current?.click()}><Upload className="mr-2 h-4 w-4" />Carica file</Button>
        </div>
      </header>

      <div
        className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed p-4"
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); void onFiles(e.dataTransfer.files); }}
      >
        <Button variant="outline" disabled={upload.isPending} onClick={() => fileInput.current?.click()}>
          <Upload className="mr-2 h-4 w-4" />{upload.isPending ? 'Caricamento…' : 'Carica uno o più file'}
        </Button>
        <input ref={fileInput} className="hidden" type="file" multiple onChange={e => { void onFiles(e.target.files); e.target.value = ''; }} />
        <span className="text-xs text-muted-foreground">Trascina qui i file: l’app li legge, li riconosce e li archivia nella cartella corretta.</span>
      </div>

      {queue.length > 0 && (
        <div className="space-y-2 rounded-lg border p-4">
          {queue.map((q, i) => (
            <p key={i} className="flex items-center gap-2 text-xs">
              {q.state === 'fatto' ? <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                : q.state === 'errore' ? <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
                : <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />}
              <span className="min-w-0 break-words">{q.name}</span>
              <span className="ml-auto shrink-0 text-muted-foreground">
                {q.state === 'attesa' ? 'In attesa' : q.state === 'caricamento' ? 'Caricamento…' : q.state === 'analisi' ? 'Analisi…' : q.state === 'fatto' ? 'Archiviato' : 'Errore'}
              </span>
            </p>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Viste archivio">
        {([['cartelle', 'Cartelle'], ['tutti', 'Tutti i file'], ['verificare', `Da verificare (${daVerificare.length})`]] as const).map(([v, label]) => (
          <Button key={v} role="tab" aria-selected={view === v} variant={view === v ? 'default' : 'outline'} onClick={() => setView(v)}>{label}</Button>
        ))}
      </div>

      {view !== 'cartelle' && (
        <div className="space-y-3 rounded-lg border p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Input aria-label="Cerca nei documenti" placeholder="Cerca anche nel contenuto…" value={search} onChange={e => setSearch(e.target.value)} />
            <SearchableSelect value={company} onValueChange={setCompany} options={[{ value: '', label: 'Tutte le aziende' }, ...companies.map(a => ({ value: a.id, label: a.nome }))]} placeholder="Azienda" />
            <SearchableSelect value={customer} onValueChange={setCustomer} options={[{ value: '', label: 'Tutti i clienti' }, ...clients.map(a => ({ value: a.id, label: a.nome }))]} placeholder="Cliente" />
            <div className="flex gap-2">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="min-w-0"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte le categorie</SelectItem>
                  {CATEGORIE_DOCUMENTO.map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input className="w-24 shrink-0" aria-label="Anno file" placeholder="Anno" type="number" value={year} onChange={e => setYear(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Più recenti</SelectItem>
                <SelectItem value="old">Meno recenti</SelectItem>
                <SelectItem value="name">Nome A–Z</SelectItem>
              </SelectContent>
            </Select>
            <Label>Data dal<Input type="date" value={from} onChange={e => setFrom(e.target.value)} /></Label>
            <Label>Data al<Input type="date" value={until} onChange={e => setUntil(e.target.value)} /></Label>
            {(search || company || customer || category !== 'all' || year || from || until) && (
              <Button variant="ghost" onClick={() => { setSearch(''); setCompany(companyId || ''); setCustomer(customerId || ''); setCategory('all'); setYear(''); setFrom(''); setUntil(''); }}>
                <X className="mr-2 h-4 w-4" />Azzera filtri
              </Button>
            )}
          </div>
        </div>
      )}

      {isLoading ? <div className="h-24 animate-pulse rounded-lg bg-muted" />
        : isError ? <div>Non riesco a caricare i file. <Button variant="outline" onClick={() => refetch()}>Riprova</Button></div>
        : view === 'cartelle' ? (
          openCompany ? (
            <div className="space-y-4">
              <Button variant="ghost" onClick={() => setOpenCompany(null)}><ArrowLeft className="mr-2 h-4 w-4" />Tutte le cartelle</Button>
              <h3 className="flex items-center gap-2 text-base font-semibold">
                <FolderOpen className="h-5 w-5 text-primary" />
                {openCompany === '__none__' ? 'Senza azienda' : companyName(openCompany)}
              </h3>
              {CATEGORIE_DOCUMENTO.map(cat => {
                const catDocs = (folders.get(openCompany) || []).filter(d => categoriaOf(d) === cat);
                if (!catDocs.length) return null;
                return (
                  <section key={cat} className="space-y-2">
                    <h4 className="text-sm font-semibold text-muted-foreground">{cat} ({catDocs.length})</h4>
                    <div className="grid gap-3">{catDocs.map(d => <DocRow key={d.id} d={d} />)}</div>
                  </section>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {folderList.map(([id, folderDocs]) => (
                <button key={id} onClick={() => setOpenCompany(id)}
                  className="flex min-h-20 items-center gap-3 rounded-xl border p-4 text-left transition-colors hover:bg-accent">
                  <Folder className="h-6 w-6 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1">
                    <span className="block break-words text-sm font-semibold">{id === '__none__' ? 'Senza azienda' : companyName(id)}</span>
                    <span className="block text-xs text-muted-foreground">{folderDocs.length} documenti</span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              ))}
              {!folderList.length && <p className="py-8 text-center text-sm text-muted-foreground sm:col-span-2 lg:col-span-3">Nessun documento archiviato</p>}
            </div>
          )
        ) : view === 'verificare' ? (
          <div className="grid gap-3">
            {!daVerificare.length && <p className="py-8 text-center text-sm text-muted-foreground">Nessun documento da verificare</p>}
            {daVerificare.map(d => (
              <article key={d.id} className="min-w-0 space-y-3 rounded-lg border border-warning/50 p-4">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-semibold">{d.titolo || d.nome_file}</p>
                    <div className="mt-1 flex flex-wrap gap-2"><StatoBadge d={d} /></div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setEditing({ ...d })}><Pencil className="mr-2 h-4 w-4" />Correggi</Button>
                </div>
                {d.errore_elaborazione && <p className="text-xs text-destructive">{d.errore_elaborazione}</p>}
                {d.association_details?.reason && <p className="text-xs text-muted-foreground">{d.association_details.reason}</p>}
                {d.association_details?.company?.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted-foreground">Aziende candidate:</span>
                    {d.association_details.company.slice(0, 3).map((c: any) => (
                      <Button key={c.id} variant="outline" size="sm"
                        onClick={async () => { try { await update.mutateAsync({ id: d.id, company_id: c.id, entita: 'azienda', entita_id: c.id, association_status: 'manual', stato_elaborazione: 'archiviato', association_details: d.association_details }); } catch { toast.error('Correzione non riuscita.'); } }}>
                        <CheckCircle2 className="mr-2 h-4 w-4" />{c.name}
                      </Button>
                    ))}
                  </div>
                )}
                {d.stato_elaborazione === 'errore' && (
                  <Button variant="outline" size="sm" onClick={async () => { try { await analyzeOne(d); await refetch(); toast.success('Analisi completata'); } catch { toast.error('Analisi non riuscita. Riprova.'); } }}>
                    <RefreshCw className="mr-2 h-4 w-4" />Riprova analisi
                  </Button>
                )}
              </article>
            ))}
          </div>
        ) : (
          !filtered.length ? <p className="py-8 text-center text-sm text-muted-foreground">Nessun file trovato</p>
            : <div className="grid gap-3">{filtered.map(d => <DocRow key={d.id} d={d} />)}</div>
        )}

      {/* Scheda documento */}
      <Dialog open={!!detail} onOpenChange={v => { if (!v) setDetail(null); }}>
        <DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle className="break-words">{detail?.titolo || detail?.nome_file}</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <StatoBadge d={detail} />
                <SyncBadge d={detail} />
                <Badge variant="secondary">{categoriaOf(detail)}</Badge>
                {detail.versione_di && <Badge variant="secondary">Nuova versione di un documento esistente</Badge>}
              </div>
              {detail.riepilogo && <p className="text-sm">{detail.riepilogo}</p>}
              <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div><dt className="text-xs text-muted-foreground">Azienda</dt><dd>{docCompanyIds(detail).map(id => companyName(id)).join(', ') || 'N/D'}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Cliente</dt><dd>{detail.customer_id ? customerName(detail.customer_id) : 'N/D'}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Data documento</dt><dd>{detail.data_documento ? new Date(detail.data_documento + 'T00:00:00').toLocaleDateString('it-IT') : 'N/D'}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Data caricamento</dt><dd>{new Date(detail.created_at).toLocaleDateString('it-IT')}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Numero documento</dt><dd>{detail.numero_documento || 'N/D'}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Validità</dt><dd>{detail.valid_from || detail.valid_until ? `${detail.valid_from || '…'} → ${detail.valid_until || '…'}` : 'N/D'}</dd></div>
              </dl>
              {detail.keywords?.length ? (
                <div className="flex flex-wrap gap-2">{detail.keywords.map(k => <Badge key={k} variant="outline">{k}</Badge>)}</div>
              ) : null}
              {detail.association_details?.reason && detail.association_status === 'review' && (
                <p className="text-xs text-muted-foreground">Motivo incertezza: {detail.association_details.reason}</p>
              )}
              <div className="flex flex-wrap gap-2 border-t pt-4">
                <Button variant="outline" onClick={() => open(detail)}><Eye className="mr-2 h-4 w-4" />Anteprima</Button>
                <Button variant="outline" onClick={() => open(detail, true)}><Download className="mr-2 h-4 w-4" />Scarica</Button>
                <Button variant="outline" onClick={() => { setEditing({ ...detail }); setDetail(null); }}><Pencil className="mr-2 h-4 w-4" />Correggi</Button>
                <OneDriveActions d={detail} />
                {(detail.stato_elaborazione === 'errore' || detail.stato_elaborazione === 'da_verificare') && (
                  <Button variant="outline" onClick={async () => { try { await analyzeOne(detail); await refetch(); setDetail(null); toast.success('Analisi completata'); } catch { toast.error('Analisi non riuscita. Riprova.'); } }}>
                    <RefreshCw className="mr-2 h-4 w-4" />Riprova analisi
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Anteprima */}
      <Dialog open={!!preview} onOpenChange={v => { if (!v) setPreview(null); }}>
        <DialogContent className="max-h-[90dvh] max-w-3xl overflow-y-auto">
          <DialogHeader><DialogTitle>{preview?.name}</DialogTitle></DialogHeader>
          {preview?.blob ? <OrderPdfPreview file={preview.blob} />
            : preview?.type.startsWith('image/') ? <img src={preview.url} alt={preview.name} className="max-h-[70dvh] w-full object-contain" />
            : <p className="text-sm">Aperto solo tramite download per questo formato.</p>}
        </DialogContent>
      </Dialog>

      {/* Modifica */}
      <Dialog open={!!editing} onOpenChange={v => { if (!v) setEditing(null); }}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>Modifica file</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <Label>Titolo<Input value={editing.titolo || ''} onChange={e => setEditing({ ...editing, titolo: e.target.value || null })} /></Label>
              <Label>Nome file<Input value={editing.nome_file} onChange={e => setEditing({ ...editing, nome_file: e.target.value })} /></Label>
              <Label>Azienda<SearchableSelect value={editing.company_id || ''} onValueChange={v => setEditing({ ...editing, company_id: v || null })} options={companies.map(a => ({ value: a.id, label: a.nome }))} /></Label>
              <Label>Cliente<SearchableSelect value={editing.customer_id || ''} onValueChange={v => setEditing({ ...editing, customer_id: v || null })} options={[{ value: '', label: 'Nessun cliente' }, ...clients.map(a => ({ value: a.id, label: a.nome }))]} /></Label>
              <Label>Categoria
                <Select value={categoriaOf(editing)} onValueChange={v => setEditing({ ...editing, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIE_DOCUMENTO.map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
                </Select>
              </Label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Label>Data documento<Input type="date" value={editing.data_documento || ''} onChange={e => setEditing({ ...editing, data_documento: e.target.value || null })} /></Label>
                <Label>Anno riferimento<Input type="number" value={editing.reference_year || ''} onChange={e => setEditing({ ...editing, reference_year: e.target.value ? Number(e.target.value) : null })} /></Label>
                <Label>Validità dal<Input type="date" value={editing.valid_from || ''} onChange={e => setEditing({ ...editing, valid_from: e.target.value || null })} /></Label>
                <Label>Validità al<Input type="date" value={editing.valid_until || ''} onChange={e => setEditing({ ...editing, valid_until: e.target.value || null })} /></Label>
              </div>
              <Label>Numero documento<Input value={editing.numero_documento || ''} onChange={e => setEditing({ ...editing, numero_documento: e.target.value || null })} /></Label>
              <p className="text-xs text-muted-foreground">{editing.association_details?.reason}</p>
              {editing.association_details?.company?.length > 0 && <p className="text-xs">Aziende candidate: {editing.association_details.company.map((x: any) => x.name).join(', ')}</p>}
              {editing.association_details?.customer?.length > 0 && <p className="text-xs">Clienti candidati: {editing.association_details.customer.map((x: any) => x.name).join(', ')}</p>}
              <Label>Note<Textarea value={editing.note || ''} onChange={e => setEditing({ ...editing, note: e.target.value })} /></Label>
              <Button disabled={update.isPending} onClick={async () => {
                try {
                  await update.mutateAsync({
                    id: editing.id, association_status: 'manual', stato_elaborazione: 'archiviato',
                    entita: editing.company_id ? 'azienda' : 'generico', entita_id: editing.company_id,
                    titolo: editing.titolo, nome_file: editing.nome_file, company_id: editing.company_id,
                    customer_id: editing.customer_id, category: editing.category, reference_year: editing.reference_year,
                    data_documento: editing.data_documento, numero_documento: editing.numero_documento,
                    valid_from: editing.valid_from, valid_until: editing.valid_until, note: editing.note,
                    association_details: editing.association_details,
                  });
                  setEditing(null);
                } catch { toast.error('Il file non può essere modificato.'); }
              }}>Salva</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Eliminazione */}
      <Dialog open={!!deleting} onOpenChange={v => { if (!v) setDeleting(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Elimina file</DialogTitle></DialogHeader>
          <p className="break-words text-sm">{deleting?.nome_file} · {deleting ? new Date(deleting.created_at).toLocaleDateString('it-IT') : ''}</p>
          <p className="text-sm text-muted-foreground">Il file sarà spostato nel cestino. Documenti accettati e immagini condivise sono protetti.</p>
          <Button variant="destructive" disabled={remove.isPending} onClick={async () => {
            if (!deleting) return;
            try { await remove.mutateAsync(deleting); setDeleting(null); } catch { toast.error('Documento collegato a uno storico protetto o non eliminabile.'); }
          }}>Conferma eliminazione</Button>
        </DialogContent>
      </Dialog>
    </section>
  );
}
