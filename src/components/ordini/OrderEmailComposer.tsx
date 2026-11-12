import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { FileText, Send, Save, X, AlertCircle, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useCompanyEmailSettings, useOrderEmailHistory, saveCompanyEmailSettings, EMPTY_EMAIL_SETTINGS } from '@/hooks/useOrderEmail';
import { dynamicEmailTemplate, renderEmailTemplate, romeEmailContext, validEmailAddresses } from '@/lib/orderEmailTemplates';
import { invokeOrderEmail, type OrderMailbox } from '@/lib/orderEmailSnapshot';
import type { ProformaData } from './ProformaDialog';
import { OrderPdfPreview } from './OrderPdfPreview';
import { RecipientInput } from '@/components/email/RecipientInput';
import { useEmailContacts, useSaveEmailContact } from '@/hooks/useEmailContacts';
import { useAziende } from '@/hooks/useAziende';
import { useAgencyMembers, memberName } from '@/hooks/useAgency';
import { defaultRecipients, normalizeEmail } from '@/lib/recipients';

export type PreparedOrderEmail = { data: ProformaData; version: string; senderEmail: string; requiredSender: string; senderAuthorised: boolean; mailboxes: OrderMailbox[]; pdf: Blob; filename: string };
export function OrderEmailComposer({ prepared, onClose }: { prepared: PreparedOrderEmail; onClose: () => void }) {
  const settings = useCompanyEmailSettings(prepared.data.azienda_id ?? undefined);
  const history = useOrderEmailHistory(prepared.data.ordine_id);
  const cache = useQueryClient();
  const [context] = useState(() => romeEmailContext(prepared.data.cliente_nome, ''));
  const [to, setTo] = useState<string[]>([]);
  const [cc, setCc] = useState<string[]>([]);
  const contacts = useEmailContacts();
  const saveContact = useSaveEmailContact();
  const { data: aziende } = useAziende();
  const aziendaNames = new Map((aziende ?? []).map(a => [a.id, a.nome] as [string, string]));
  const [bookDraft, setBookDraft] = useState<{ email: string; nome: string } | null>(null);
  const aziendaId = prepared.data.azienda_id ?? null;
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [senderName, setSenderName] = useState('');
  const [replyTo, setReplyTo] = useState('');
  // Agency mailbox is the default; a personal one appears only for the profile allowed to use it.
  const [mailboxKind, setMailboxKind] = useState<OrderMailbox['kind']>('agenzia');
  const mailbox = prepared.mailboxes.find(m => m.kind === mailboxKind) ?? prepared.mailboxes[0];
  const mailboxReady = !!mailbox?.available;
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
    if (!settings.data || !contacts.data || initialized.current) return;
    initialized.current = true;
    const s = settings.data;
    const c = { ...context, firma: s.signature };
    // Recipients come from the company address book; legacy settings only when it is empty.
    const book = aziendaId ? defaultRecipients(contacts.data, aziendaId) : { to: [], cc: [] };
    const legacyTo = s.to_addresses.map(normalizeEmail);
    const nextTo = book.to.length || book.cc.length ? book.to : legacyTo;
    const nextCc = (book.to.length || book.cc.length ? book.cc : s.cc_addresses.map(normalizeEmail)).filter(e => !nextTo.includes(e));
    setTo([...new Set(nextTo)]); setCc([...new Set(nextCc)]);
    setSubject(renderEmailTemplate(s.subject_template, c)); setBody(renderEmailTemplate(s.body_template, c));
    setSenderName(s.sender_name); setReplyTo(s.reply_to);
  }, [settings.data, contacts.data, context, aziendaId]);

  const saveDefaults = async () => {
    if (!prepared.data.azienda_id) return;
    setSaving(true); setError('');
    try {
      // Recipients are managed in the company address book, not here.
      await saveCompanyEmailSettings(prepared.data.azienda_id, { ...(settings.data ?? EMPTY_EMAIL_SETTINGS),
        subject_template: dynamicEmailTemplate(subject, templateContext), body_template: dynamicEmailTemplate(body, templateContext),
        sender_name: senderName, reply_to: replyTo });
      await cache.invalidateQueries({ queryKey: ['company-order-email'] });
      toast.success('Oggetto e testo salvati come predefiniti');
    } catch (e) { setError(e instanceof Error ? e.message : 'Salvataggio non riuscito'); }
    finally { setSaving(false); }
  };
  const send = async () => {
    if (lock.current || finished || uncertain) return;
    if (!mailboxReady) { setError(`La casella ${mailbox?.email ?? ''} non è collegata.`); return; }
    const recipients = to, copies = cc;
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
      const result = await invokeOrderEmail({ action: 'send', mailbox: mailbox.kind, orderId: prepared.data.ordine_id, attemptId: attempt.current,
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
  const statusLabel = finished ? 'Inviato' : uncertain || busy ? 'In invio' : 'In preparazione';
  const confirmBook = async () => {
    if (!bookDraft || !aziendaId) return;
    try {
      await saveContact.mutateAsync({ azienda_id: aziendaId, nome: bookDraft.nome || bookDraft.email, email: bookDraft.email });
      toast.success('Indirizzo salvato nella rubrica');
      setBookDraft(null);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Salvataggio non riuscito'); }
  };
  return <>
    <Dialog open onOpenChange={v => { if (!v && !busy) onClose(); }}>
      <DialogContent className="flex h-[100dvh] max-h-[100dvh] w-full max-w-full flex-col gap-0 overflow-hidden rounded-none p-0 sm:h-auto sm:max-h-[90dvh] sm:max-w-2xl sm:rounded-xl" onInteractOutside={e => { if (busy) e.preventDefault(); }}>
        <DialogHeader className="shrink-0 border-b border-border p-4 sm:p-6"><DialogTitle>Invia ordine via email</DialogTitle><DialogDescription className="break-words">{prepared.data.cliente_nome} · {prepared.data.azienda_nome}</DialogDescription></DialogHeader>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          {settings.isLoading || contacts.isLoading ? <Skeleton className="h-80 w-full" /> : settings.isError || contacts.isError ? <div className="space-y-2"><p className="text-sm text-destructive">Impostazioni email non disponibili.</p><Button variant="outline" onClick={() => { settings.refetch(); contacts.refetch(); }}>Riprova</Button></div> : <>
            {prepared.mailboxes.length > 1 ? <fieldset className="space-y-2">
              <div className="flex items-center justify-between gap-2"><legend className="text-sm font-medium">Invia da</legend><span className={`rounded-md px-2 py-0.5 text-xs font-medium ${finished ? 'bg-success/10 text-success' : busy || uncertain ? 'bg-warning/10 text-warning' : 'bg-muted text-muted-foreground'}`}>{statusLabel}</span></div>
              <div role="radiogroup" aria-label="Casella mittente" className="grid gap-2 sm:grid-cols-2">
                {prepared.mailboxes.map(m => {
                  const active = m.kind === mailbox.kind;
                  return <button key={m.kind} type="button" role="radio" aria-checked={active} disabled={disabled} onClick={() => { setMailboxKind(m.kind); setError(''); }}
                    className={`min-h-11 min-w-0 rounded-lg border p-3 text-left transition-colors duration-150 disabled:opacity-60 ${active ? 'border-primary bg-primary/5' : 'border-border bg-muted/30'}`}>
                    <span className="block text-sm font-medium">{m.kind === 'agenzia' ? 'Email agenzia' : 'Email personale'}</span>
                    <span className="block break-all text-xs text-muted-foreground">{m.email}{!m.available && ' · non collegata'}</span>
                  </button>;
                })}
              </div>
            </fieldset> : <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 p-3">
              <p className="min-w-0 break-all text-sm"><span className="text-muted-foreground">Da </span><span className="font-medium">{mailbox?.email ?? prepared.requiredSender}</span></p>
              <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${finished ? 'bg-success/10 text-success' : busy || uncertain ? 'bg-warning/10 text-warning' : 'bg-muted text-muted-foreground'}`}>{statusLabel}</span>
            </div>}
            {!mailboxReady && <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" /><span>La casella <strong className="break-all">{mailbox?.email}</strong> non è collegata: l’invio da questa casella resta bloccato.</span></div>}
            <div className="grid gap-4">
              <RecipientInput label="A" value={to} other={cc} otherLabel="CC" onChange={setTo} contacts={contacts.data ?? []} aziendaId={aziendaId} aziendaNames={aziendaNames} disabled={disabled} onSaveToBook={email => setBookDraft({ email, nome: '' })} />
              <RecipientInput label="CC" value={cc} other={to} otherLabel="A" onChange={setCc} contacts={contacts.data ?? []} aziendaId={aziendaId} aziendaNames={aziendaNames} disabled={disabled} onSaveToBook={email => setBookDraft({ email, nome: '' })} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="order-sender">Nome mittente</Label><Input id="order-sender" value={senderName} disabled={disabled} onChange={e => setSenderName(e.target.value)} className="h-11 rounded-lg border-border bg-muted/30 text-base sm:text-sm" /></div>
              <div className="space-y-2"><Label htmlFor="order-reply">Indirizzo di risposta</Label><Input id="order-reply" type="email" value={replyTo} disabled={disabled} onChange={e => setReplyTo(e.target.value)} className="h-11 rounded-lg border-border bg-muted/30 text-base sm:text-sm" /></div>
            </div>
            <div className="space-y-2"><Label htmlFor="order-subject">Oggetto</Label><Input id="order-subject" value={subject} disabled={disabled} onChange={e => setSubject(e.target.value)} className="h-11 rounded-lg border-border bg-muted/30 text-base sm:text-sm" /></div>
            <div className="space-y-2"><Label htmlFor="order-body">Testo</Label><Textarea id="order-body" rows={10} value={body} disabled={disabled} onChange={e => setBody(e.target.value)} className="rounded-lg border-border bg-muted/30 text-base sm:text-sm" /></div>
            <div className="flex min-w-0 items-center gap-3 rounded-lg border border-border p-3"><FileText className="h-5 w-5 shrink-0 text-primary" /><span className="min-w-0 flex-1 break-all text-sm">{prepared.filename}</span><Button variant="outline" className="min-h-11 shrink-0" onClick={() => setPreview(true)}>Visualizza</Button></div>
            <Button variant="outline" className="min-h-11 w-full gap-2 whitespace-normal" disabled={disabled || saving} onClick={saveDefaults}><Save className="h-4 w-4 shrink-0" />{saving ? 'Salvataggio…' : 'Salva oggetto e testo come predefiniti'}</Button>
          </>}
          {finished && <p role="status" className="text-sm font-medium text-success">Inviata · {prepared.filename}</p>}
          {error && <div role="alert" className="flex items-start gap-2 text-sm text-destructive"><AlertCircle className="h-4 w-4 shrink-0" /><span>{error}</span></div>}
        </div>
        <div className="flex shrink-0 gap-2 border-t border-border bg-background p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button variant="outline" className="min-h-11" onClick={onClose} disabled={busy}><X className="mr-2 h-4 w-4" />Chiudi</Button>
          <Button className="min-h-11 flex-1 gap-2" disabled={disabled || settings.isLoading || settings.isError || !mailboxReady} onClick={send}><Send className="h-4 w-4" />{busy ? 'Invio in corso…' : finished ? 'Inviata' : uncertain ? 'In corso di verifica' : error ? 'Riprova invio' : 'Invia email'}</Button>
        </div>
      </DialogContent>
    </Dialog>
    <Dialog open={!!bookDraft} onOpenChange={v => { if (!v) setBookDraft(null); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader><DialogTitle>Salvare nella rubrica?</DialogTitle><DialogDescription className="break-all">{bookDraft?.email} sarà proposto negli ordini di {prepared.data.azienda_nome}.</DialogDescription></DialogHeader>
        <div className="space-y-2"><Label htmlFor="book-name">Nome o descrizione</Label><Input id="book-name" value={bookDraft?.nome ?? ''} onChange={e => bookDraft && setBookDraft({ ...bookDraft, nome: e.target.value })} placeholder="Es. Ufficio ordini" className="h-12 text-base" /></div>
        <div className="flex gap-2"><Button variant="outline" className="min-h-11 flex-1" onClick={() => setBookDraft(null)}>Non salvare</Button><Button className="min-h-11 flex-1" disabled={saveContact.isPending} onClick={confirmBook}>Salva in rubrica</Button></div>
      </DialogContent>
    </Dialog>
    <Dialog open={preview} onOpenChange={setPreview}><DialogContent className="flex h-[90dvh] max-w-3xl flex-col"><DialogHeader><DialogTitle className="break-all text-base">{prepared.filename}</DialogTitle></DialogHeader><OrderPdfPreview file={prepared.pdf} /><Button variant="outline" asChild><a href={pdfUrl} target="_blank" rel="noreferrer">Apri PDF</a></Button></DialogContent></Dialog>
  </>;
}

export function OrderEmailHistory({ orderId }: { orderId?: string }) {
  const history = useOrderEmailHistory(orderId);
  const members = useAgencyMembers();
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
      <summary className="flex min-h-11 cursor-pointer flex-wrap items-center justify-between gap-2 text-sm"><span className="tabular-nums">{new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', dateStyle: 'short', timeStyle: 'short' }).format(new Date(row.sent_at ?? row.created_at))}</span><span className={row.status === 'sent' ? 'text-success' : row.status === 'error' ? 'text-destructive' : 'text-warning'}>{row.status === 'sent' ? 'Inviato' : row.status === 'error' ? 'Errore' : 'In invio'}</span></summary>
      <div className="space-y-2 break-words pt-2 text-sm">{memberName(members.data ?? [], (row as { sent_by?: string | null }).sent_by) && <p className="text-xs text-muted-foreground">Inviato da {memberName(members.data ?? [], (row as { sent_by?: string | null }).sent_by)}</p>}{(row as { sender_email?: string | null }).sender_email && <p>Da: {(row as { sender_email?: string | null }).sender_email}</p>}<p>A: {row.to_addresses.join(', ')}</p>{row.cc_addresses.length > 0 && <p>CC: {row.cc_addresses.join(', ')}</p>}<p className="font-semibold">{row.subject}</p><p className="whitespace-pre-wrap">{row.body}</p>{row.error_message && <p className="text-destructive">{row.error_message}</p>}<Button variant="outline" className="min-h-11 max-w-full gap-2 whitespace-normal text-left" disabled={opening === row.id} onClick={() => openPdf(row.id)}><FileText className="h-4 w-4 shrink-0" />{row.pdf_filename}</Button></div>
    </details>)}
  </section>;
}