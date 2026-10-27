import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DEFAULT_ORDER_BODY, DEFAULT_ORDER_SUBJECT, validEmailAddresses } from '@/lib/orderEmailTemplates';
import type { Tables } from '@/integrations/supabase/types';

export type CompanyEmailSettings = Pick<Tables<'azienda_order_email_settings'>, 'to_addresses' | 'cc_addresses' | 'subject_template' | 'body_template' | 'signature' | 'sender_name' | 'reply_to'>;
export const EMPTY_EMAIL_SETTINGS: CompanyEmailSettings = { to_addresses: [], cc_addresses: [], subject_template: DEFAULT_ORDER_SUBJECT, body_template: DEFAULT_ORDER_BODY, signature: '', sender_name: '', reply_to: '' };
export function useCompanyEmailSettings(companyId?: string) {
  const { user } = useAuth();
  return useQuery({ queryKey: ['company-order-email', user?.id, companyId], enabled: !!companyId && !!user, queryFn: async () => {
    const { data, error } = await supabase.from('azienda_order_email_settings').select('*').eq('azienda_id', companyId ?? '').maybeSingle();
    if (error) throw error;
    return data ?? EMPTY_EMAIL_SETTINGS;
  } });
}
export async function saveCompanyEmailSettings(companyId: string, settings: CompanyEmailSettings) {
  if (!validEmailAddresses([...settings.to_addresses, ...settings.cc_addresses, ...(settings.reply_to ? [settings.reply_to] : [])])) throw new Error('Controlla gli indirizzi email.');
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Accedi per salvare le impostazioni.');
  const { error } = await supabase.from('azienda_order_email_settings').upsert({ ...settings, azienda_id: companyId, user_id: user.id, updated_at: new Date().toISOString() });
  if (error) throw error;
}
export function useOrderEmailHistory(orderId?: string) {
  const { user } = useAuth();
  return useQuery({ queryKey: ['order-email-history', user?.id, orderId], enabled: !!orderId && !!user, queryFn: async () => {
    const { data, error } = await supabase.from('order_email_sends').select('*').eq('ordine_id', orderId ?? '').order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }, refetchInterval: query => query.state.data?.some(row => row.status === 'sending') ? 4000 : false });
}