import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Mail, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { EMPTY_EMAIL_SETTINGS, saveCompanyEmailSettings, useCompanyEmailSettings, type CompanyEmailSettings } from '@/hooks/useOrderEmail';
import { parseEmailAddresses } from '@/lib/orderEmailTemplates';

export function OrderEmailSettings({ companyId }: { companyId: string }) {
  const query = useCompanyEmailSettings(companyId);
  const cache = useQueryClient();
  const [form, setForm] = useState<CompanyEmailSettings>(EMPTY_EMAIL_SETTINGS);
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (query.data) { setForm(query.data); setTo(query.data.to_addresses.join(', ')); setCc(query.data.cc_addresses.join(', ')); } }, [query.data]);
  const save = async () => {
    setSaving(true);
    try {
      await saveCompanyEmailSettings(companyId, { ...form, to_addresses: parseEmailAddresses(to), cc_addresses: parseEmailAddresses(cc) });
      await cache.invalidateQueries({ queryKey: ['company-order-email'] });
      toast.success('Impostazioni invio ordini salvate');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Salvataggio non riuscito'); }
    finally { setSaving(false); }
  };
  return <section className="min-w-0 space-y-4 border-y border-border py-6">
    <h2 className="flex items-center gap-2 text-base font-semibold"><Mail className="h-5 w-5 text-primary" />Impostazioni invio ordini</h2>
    {query.isLoading ? <Skeleton className="h-48 w-full" /> : query.isError ? <div className="space-y-2"><p className="text-sm text-destructive">Impostazioni non disponibili.</p><Button variant="outline" onClick={() => query.refetch()}>Riprova</Button></div> : <>
      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        <div className="min-w-0 space-y-2"><Label htmlFor="company-order-to">A</Label><Textarea id="company-order-to" value={to} onChange={e => setTo(e.target.value)} placeholder="ordini@azienda.it, commerciale@azienda.it" className="min-h-20 text-base sm:text-sm" /></div>
        <div className="min-w-0 space-y-2"><Label htmlFor="company-order-cc">CC</Label><Textarea id="company-order-cc" value={cc} onChange={e => setCc(e.target.value)} placeholder="Indirizzi in copia" className="min-h-20 text-base sm:text-sm" /></div>
        <div className="space-y-2"><Label htmlFor="company-sender">Nome mittente</Label><Input id="company-sender" value={form.sender_name} onChange={e => setForm({ ...form, sender_name: e.target.value })} className="h-11 text-base sm:text-sm" /></div>
        <div className="space-y-2"><Label htmlFor="company-reply">Indirizzo di risposta</Label><Input id="company-reply" type="email" value={form.reply_to} onChange={e => setForm({ ...form, reply_to: e.target.value })} className="h-11 text-base sm:text-sm" /></div>
      </div>
      <div className="space-y-2"><Label htmlFor="company-subject">Oggetto predefinito</Label><Input id="company-subject" value={form.subject_template} onChange={e => setForm({ ...form, subject_template: e.target.value })} className="h-11 text-base sm:text-sm" /></div>
      <div className="space-y-2"><Label htmlFor="company-body">Testo predefinito</Label><Textarea id="company-body" rows={10} value={form.body_template} onChange={e => setForm({ ...form, body_template: e.target.value })} className="text-base sm:text-sm" /></div>
      <div className="space-y-2"><Label htmlFor="company-signature">Firma</Label><Textarea id="company-signature" rows={3} value={form.signature} onChange={e => setForm({ ...form, signature: e.target.value })} className="text-base sm:text-sm" /></div>
      <Button onClick={save} disabled={saving} className="min-h-11 gap-2"><Save className="h-4 w-4" />{saving ? 'Salvataggio…' : 'Salva impostazioni'}</Button>
    </>}
  </section>;
}