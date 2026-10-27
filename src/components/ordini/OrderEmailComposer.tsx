import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { FileText, Send, Save, X, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useCompanyEmailSettings, useOrderEmailHistory, saveCompanyEmailSettings, EMPTY_EMAIL_SETTINGS } from '@/hooks/useOrderEmail';
import { dynamicEmailTemplate, parseEmailAddresses, renderEmailTemplate, romeEmailContext, validEmailAddresses } from '@/lib/orderEmailTemplates';
import { invokeOrderEmail } from '@/lib/orderEmailSnapshot';
import type { ProformaData } from './ProformaDialog';
import { OrderPdfPreview } from './OrderPdfPreview';

export type PreparedOrderEmail = { data: ProformaData; version: string; senderEmail: string; pdf: Blob; filename: string };
export function OrderEmailComposer({ prepared, onClose }: { prepared: PreparedOrderEmail; onClose: () => void }) {
  const settings = useCompanyEmailSettings(prepared.data.azienda_id ?? undefined);
  const history = useOrderEmailHistory(prepared.data.ordine_id);
  const cache = useQueryClient();
  const [context] = useState(() => romeEmailContext(prepared.data.cliente_nome, ''));
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [senderName, setSenderName] = useState('');
  const [replyTo, setReplyTo] = useState('');
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [finished, setFinished] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [preview, setPreview] = useState(false);
  const [pdfUrl] = useState(() => URL.createObjectURL(prepared.pdf));
  const initialized = useRef(false);
  const lock = useRef(false);
  const attempt = useRef(crypto.randomUUID());
  const signature = settings.data?.signature ?? '';
  const templateContext = { ...context, firma: signature };
  useEffect(() => () => URL.revokeObjectURL(pdfUrl), [pdfUrl]);
  useEffect(() => {
    if (!settings.data || initialized.current) return;
    initialized.current = true;
    const s = settings.data;
    const c = { ...context, firma: s.signature };
    setTo(s.to_addresses.join(', ')); setCc(s.cc_addresses.join(', '));
    setSubject(renderEmailTemplate(s.subject_template, c)); setBody(renderEmailTemplate(s.body_template, c));
    setSenderName(s.sender_name); setReplyTo(s.reply_to);
  }, [settings.data, context]);

  const saveDefaults = async () => {
    if (!prepared.data.azienda_id) return;
    setSaving(true); setError('');
    try {
      await saveCompanyEmailSettings(prepared.data.azienda_id, { ...(settings.data ?? EMPTY_EMAIL_SETTINGS),
        to_addresses: parseEmailAddresses(to), cc_addresses: parseEmailAddresses(cc),
        subject_template: dynamicEmailTemplate(subject, templateContext), body_template: dynamicEmailTemplate(body, templateContext),
        sender_name: senderName, reply_to: replyTo });
      await cache.invalidateQueries({ queryKey: ['company-order-email'] });
      toast.success('Predefiniti azienda salvati');
    } catch (e) { setError(e instanceof Error ? e.message : 'Salvataggio non riuscito'); }
    finally { setSaving(false); }
  };
  const send = async () => {
    if (lock.current || finished || uncertain) return;
    const recipients = parseEmailAddresses(to), copies = parseEmailAddresses(cc);
    if (!recipients.length || !validEmailAddresses([...recipients, ...copies, ...(replyTo ? [replyTo] : [])]) || !subject.trim() || !body.trim()) {
      setError('Inserisci almeno un destinatario valido, oggetto e testo.'); return;
    }
    if (!prepared.data.ordine_id) return;
    lock.current = true; setBusy(true); setError('');
    try {
      // Refresh the day at click, but preserve any manually edited subject.
      const today = romeEmailContext(prepared.data.cliente_nome, signature);
      const originalSubject = renderEmailTemplate(settings.data?.subject_template ?? EMPTY_EMAIL_SETTINGS.subject_template, templateContext);
      const sentSubject = subject === originalSubject ? renderEmailTemplate(settings.data?.subject_template ?? EMPTY_EMAIL_SETTINGS.subject_template, today) : subject;
      setSubject(sentSubject);
      const bytes = new Uint8Array(await prepared.pdf.arrayBuffer());
      let binary = '';
      for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
      const result = await invokeOrderEmail({ action: 'send', orderId: prepared.data.ordine_id, attemptId: attempt.current,
        version: prepared.version, to: recipients, cc: copies, subject: sentSubject, body, senderName, replyTo, filename: prepared.filename, pdf: btoa(binary) });
      if (result.send?.status === 'sent') { setFinished(true); toast.success('Ordine inviato via email'); }
      else if (result.send?.status === 'sending') { setUncertain(true); setError(result.error || result.send.error_message || 'Invio in corso. Attendi la conferma nello storico.'); }
      else { attempt.current = crypto.randomUUID(); setError(result.error || 'Invio non riuscito. Riprova.'); }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invio non riuscito. Il testo è conservato.');
      // Read back the claim after a transport failure rather than blindly retrying.
      const rows = await history.refetch();
      const last = rows.data?.find(row => row.id === attempt.current);
      if (last?.status === 'sent') setFinished(true);
      else if (last?.status === 'sending') setUncertain(true);
      else if (last?.status === 'error') attempt.current = crypto.randomUUID();
    } finally {
      await cache.invalidateQueries({ queryKey: ['order-email-history'] });
      lock.current = false; setBusy(false);
    }
  };
  const disabled = busy || finished || uncertain;
  return <>
    <Dialog open onOpenChange={v => { if (!v && !busy) onClose(); }}>
      <DialogContent className="flex h-[100dvh] max-h-[100dvh] w-full max-w-full flex-col gap-0 overflow-hidden rounded-none p-0 sm:h-auto sm:max-h-[90dvh] sm:max-w-2xl sm:rounded-xl" onInteractOutside={e => { if (busy) e.preventDefault(); }}>
        <DialogHeader className="shrink-0 border-b border-border p-4 sm:p-6"><DialogTitle>Invia ordine via email</DialogTitle><DialogDescription className="break-words">{prepared.data.cliente_nome} · {prepared.data.azienda_nome}</DialogDescription></DialogHeader>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          {settings.isLoading ? <Skeleton className="h-80 w-full" /> : settings.isError ? <div className="space-y-2"><p className="text-sm text-destructive">Impostazioni email non disponibili.</p><Button variant="outline" onClick={() => settings.refetch()}>Riprova</Button></div> : <>
            <p className="break-all text-xs text-muted-foreground">Da: {prepared.senderEmail}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="order-to">A</Label><Textarea id="order-to" value={to} disabled={disabled} onChange={e => setTo(e.target.value)} placeholder="Destinatari" className="min-h-20 rounded-lg border-border bg-muted/30 text-base sm:text-sm" /></div>
              <div className="space-y-2"><Label htmlFor="order-cc">CC</Label><Textarea id="order-cc" value={cc} disabled={disabled} onChange={e => setCc(e.target.value)} placeholder="Destinatari in copia" className="min-h-20 rounded-lg border-border bg-muted/30 text-base sm:text-sm" /></div>
              <div className="space-y-2"><Label htmlFor="order-sender">Nome mittente</Label><Input id="order-sender" value={senderName} disabled={disabled} onChange={e => setSenderName(e.target.value)} className="h-11 rounded-lg border-border bg-muted/30 text-base sm:text-sm" /></div>
              <div className="space-y-2"><Label htmlFor="order-reply">Indirizzo di risposta</Label><Input id="order-reply" type="email" value={replyTo} disabled={disabled} onChange={e => setReplyTo(e.target.value)} className="h-11 rounded-lg border-border bg-muted/30 text-base sm:text-sm" /></div>
            </div>
            <div className="space-y-2"><Label htmlFor="order-subject">Oggetto</Label><Input id="order-subject" value={subject} disabled={disabled} onChange={e => setSubject(e.target.value)} className="h-11 rounded-lg border-border bg-muted/30 text-base sm:text-sm" /></div>
            <div className="space-y-2"><Label htmlFor="order-body">Testo</Label><Textarea id="order-body" rows={10} value={body} disabled={disabled} onChange={e => setBody(e.target.value)} className="rounded-lg border-border bg-muted/30 text-base sm:text-sm" /></div>
            <div className="flex min-w-0 items-center gap-3 rounded-lg border border-border p-3"><FileText className="h-5 w-5 shrink-0 text-primary" /><span className="min-w-0 flex-1 break-all text-sm">{prepared.filename}</span><Button variant="outline" className="min-h-11 shrink-0" onClick={() => setPreview(true)}>Visualizza</Button></div>
            <Button variant="outline" className="min-h-11 w-full gap-2 whitespace-normal" disabled={disabled || saving} onClick={saveDefaults}><Save className="h-4 w-4 shrink-0" />{saving ? 'Salvataggio…' : 'Salva come predefiniti dell’azienda'}</Button>
          </>}
          {finished && <p role="status" className="text-sm font-medium text-success">Inviata · {prepared.filename}</p>}
          {error && <div role="alert" className="flex items-start gap-2 text-sm text-destructive"><AlertCircle className="h-4 w-4 shrink-0" /><span>{error}</span></div>}
        </div>
        <div className="flex shrink-0 gap-2 border-t border-border bg-background p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button variant="outline" className="min-h-11" onClick={onClose} disabled={busy}><X className="mr-2 h-4 w-4" />Chiudi</Button>
          <Button className="min-h-11 flex-1 gap-2" disabled={disabled || settings.isLoading || settings.isError} onClick={send}><Send className="h-4 w-4" />{busy ? 'Invio in corso…' : finished ? 'Inviata' : uncertain ? 'In corso di verifica' : error ? 'Riprova invio' : 'Invia email'}</Button>
        </div>
      </DialogContent>
    </Dialog>
    <Dialog open={preview} onOpenChange={setPreview}><DialogContent className="flex h-[90dvh] max-w-3xl flex-col"><DialogHeader><DialogTitle className="break-all text-base">{prepared.filename}</DialogTitle></DialogHeader><OrderPdfPreview file={prepared.pdf} /><Button variant="outline" asChild><a href={pdfUrl} target="_blank" rel="noreferrer">Apri PDF</a></Button></DialogContent></Dialog>
  </>;
}

export function OrderEmailHistory({ orderId }: { orderId?: string }) {
  const history = useOrderEmailHistory(orderId);
  const [opening, setOpening] = useState<string | null>(null);
  const openPdf = async (sendId: string) => {
    setOpening(sendId);
    // Open synchronously for Safari; populate only after authorization succeeds.
    const tab = window.open('', '_blank');
    if (tab) tab.opener = null;
    try {
      const result = await invokeOrderEmail({ action: 'pdf', sendId });
      if (tab) tab.location.href = result.url;
      else window.location.assign(result.url);
    } catch (e) { tab?.close(); toast.error(e instanceof Error ? e.message : 'PDF non disponibile'); }
    finally { setOpening(null); }
  };
  if (!orderId) return null;
  return <section className="print:hidden space-y-3 border-t border-border pt-4">
    <h3 className="text-base font-semibold">Storico invii</h3>
    {history.isLoading ? <Skeleton className="h-20 w-full" /> : history.isError ? <div><p className="text-sm text-destructive">Storico non disponibile.</p><Button variant="outline" onClick={() => history.refetch()}>Riprova</Button></div> : !history.data?.length ? <p className="text-sm text-muted-foreground">Nessun invio per questo ordine.</p> : history.data.map(row => <details key={row.id} className="min-w-0 rounded-lg border border-border p-3">
      <summary className="flex min-h-11 cursor-pointer flex-wrap items-center justify-between gap-2 text-sm"><span className="tabular-nums">{new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', dateStyle: 'short', timeStyle: 'short' }).format(new Date(row.sent_at ?? row.created_at))}</span><span className={row.status === 'sent' ? 'text-success' : row.status === 'error' ? 'text-destructive' : 'text-warning'}>{row.status === 'sent' ? 'Inviata' : row.status === 'error' ? 'Errore' : 'Invio in corso'}</span></summary>
      <div className="space-y-2 break-words pt-2 text-sm"><p>A: {row.to_addresses.join(', ')}</p>{row.cc_addresses.length > 0 && <p>CC: {row.cc_addresses.join(', ')}</p>}<p className="font-semibold">{row.subject}</p><p className="whitespace-pre-wrap">{row.body}</p>{row.error_message && <p className="text-destructive">{row.error_message}</p>}<Button variant="outline" className="min-h-11 max-w-full gap-2 whitespace-normal text-left" disabled={opening === row.id} onClick={() => openPdf(row.id)}><FileText className="h-4 w-4 shrink-0" />{row.pdf_filename}</Button></div>
    </details>)}
  </section>;
}