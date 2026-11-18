import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Mail, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { EMPTY_EMAIL_SETTINGS, saveCompanyEmailSettings, useCompanyEmailSettings, type CompanyEmailSettings } from '@/hooks/useOrderEmail';
import { renderEmailTemplate, romeEmailContext } from '@/lib/orderEmailTemplates';
import { CompanyEmailContacts } from '@/components/email/CompanyEmailContacts';
import { cn } from '@/lib/utils';

/** Campi automatici del modello: si sostituiscono al momento dell'invio. */
const SEGNAPOSTO: Array<{ tag: string; spiega: string }> = [
  { tag: '{saluto}', spiega: 'Buongiorno / Buonasera in base all’ora' },
  { tag: '{nome_cliente}', spiega: 'nome del cliente dell’ordine' },
  { tag: '{data_del_giorno}', spiega: 'data di invio' },
  { tag: '{chiusura}', spiega: 'Buona giornata / Buona serata' },
  { tag: '{firma}', spiega: 'la firma qui sotto' },
];

const fieldCls = 'rounded-lg border-border bg-card text-base sm:text-sm';

/**
 * Email d'ordine all'azienda: destinatari, mittente e messaggio usati quando
 * si invia un ordine a questa azienda. Card richiusa con riepilogo; si apre
 * per modificare. Salvataggio invariato (saveCompanyEmailSettings).
 */
export function OrderEmailSettings({ companyId }: { companyId: string }) {
  const query = useCompanyEmailSettings(companyId);
  const cache = useQueryClient();
  const [form, setForm] = useState<CompanyEmailSettings>(EMPTY_EMAIL_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => { if (query.data) setForm(query.data); }, [query.data]);

  const save = async () => {
    setSaving(true);
    try {
      await saveCompanyEmailSettings(companyId, form);
      await cache.invalidateQueries({ queryKey: ['company-order-email'] });
      toast.success("Email d'ordine salvata");
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Salvataggio non riuscito'); }
    finally { setSaving(false); }
  };

  const anteprima = useMemo(() => {
    const ctx = romeEmailContext('Nome del cliente', form.signature || '(firma)');
    return { oggetto: renderEmailTemplate(form.subject_template, ctx), testo: renderEmailTemplate(form.body_template, ctx) };
  }, [form.subject_template, form.body_template, form.signature]);

  const modificato = !!query.data && JSON.stringify(query.data) !== JSON.stringify(form);

  return (
    <Collapsible open={open} onOpenChange={setOpen} asChild>
      <section className="min-w-0 rounded-xl border bg-card shadow-card">
        <CollapsibleTrigger className="flex min-h-11 w-full items-start gap-3 p-4 text-left sm:p-6">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Mail className="h-4 w-4 text-primary" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-base font-semibold">Email d'ordine all'azienda</span>
            <span className="block text-xs text-muted-foreground">
              Destinatari, oggetto e testo usati quando invii un ordine a questa azienda
            </span>
            {!open && !query.isLoading && !query.isError && (
              <span className="mt-2 block truncate text-sm">
                <span className="text-muted-foreground">Oggetto: </span>{anteprima.oggetto}
              </span>
            )}
          </span>
          <ChevronDown className={cn('mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200', open && 'rotate-180')} />
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="space-y-6 border-t p-4 sm:p-6">
            {/* 1. Destinatari */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">1 · Destinatari</h3>
              <CompanyEmailContacts aziendaId={companyId} />
            </div>

            {query.isLoading ? <Skeleton className="h-48 w-full" /> : query.isError ? (
              <div className="space-y-2">
                <p className="text-sm text-destructive">Impostazioni non disponibili.</p>
                <Button variant="outline" onClick={() => query.refetch()}>Riprova</Button>
              </div>
            ) : (
              <>
                {/* 2. Mittente */}
                <div className="space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold">2 · Mittente</h3>
                    <p className="text-xs text-muted-foreground">Gli ordini partono dalla casella dell’agenzia: agenziamazzigroup@gmail.com</p>
                  </div>
                  <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="company-sender">Nome mittente</Label>
                      <Input id="company-sender" placeholder="Es. Agenzia Mazzi Group" value={form.sender_name} onChange={e => setForm({ ...form, sender_name: e.target.value })} className={cn('h-11', fieldCls)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company-reply">Rispondi a</Label>
                      <Input id="company-reply" type="email" inputMode="email" placeholder="Es. ordini@tuodominio.it" value={form.reply_to} onChange={e => setForm({ ...form, reply_to: e.target.value })} className={cn('h-11', fieldCls)} />
                    </div>
                  </div>
                </div>

                {/* 3. Messaggio */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">3 · Messaggio</h3>
                  <div className="space-y-2">
                    <Label htmlFor="company-subject">Oggetto</Label>
                    <Input id="company-subject" value={form.subject_template} onChange={e => setForm({ ...form, subject_template: e.target.value })} className={cn('h-11', fieldCls)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company-body">Testo</Label>
                    <Textarea id="company-body" rows={7} value={form.body_template} onChange={e => setForm({ ...form, body_template: e.target.value })} className={fieldCls} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company-signature">Firma</Label>
                    <Textarea id="company-signature" rows={3} placeholder={'Es. Tommaso Salti\nAgenzia Mazzi Group · 333 1234567'} value={form.signature} onChange={e => setForm({ ...form, signature: e.target.value })} className={fieldCls} />
                  </div>
                  <details className="rounded-lg bg-muted/50 p-3 text-xs">
                    <summary className="min-h-11 cursor-pointer content-center font-medium">Campi automatici tra parentesi graffe</summary>
                    <ul className="mt-2 space-y-1">
                      {SEGNAPOSTO.map(s => (
                        <li key={s.tag} className="flex flex-wrap gap-x-2">
                          <code className="font-medium text-foreground">{s.tag}</code>
                          <span className="text-muted-foreground">{s.spiega}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                </div>

                {/* Anteprima */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Anteprima</h3>
                  <div className="space-y-2 rounded-lg border bg-background p-3 text-sm">
                    <p className="break-words"><span className="text-muted-foreground">Oggetto: </span>{anteprima.oggetto}</p>
                    <p className="whitespace-pre-line break-words text-muted-foreground">{anteprima.testo}</p>
                  </div>
                </div>

                <Button onClick={save} disabled={saving || !modificato} className="min-h-11 w-full gap-2 sm:w-auto">
                  <Save className="h-4 w-4" />
                  {saving ? 'Salvataggio…' : modificato ? 'Salva email d’ordine' : 'Nessuna modifica da salvare'}
                </Button>
              </>
            )}
          </div>
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}
