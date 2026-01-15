import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface ReportActivity {
  id?: string;
  report_id?: string;
  cliente_id?: string | null;
  azienda_id?: string | null;
  tipo_attivita: string;
  descrizione?: string | null;
  esito?: string | null;
  prossimo_step?: string | null;
  cliente?: { id: string; nome: string } | null;
  azienda?: { id: string; nome: string } | null;
}

export interface DailyReport {
  id: string;
  user_id: string;
  data_report: string;
  titolo: string;
  testo_report?: string | null;
  ordini_fatti: boolean;
  campioni_consegnati: boolean;
  promo_proposte: boolean;
  problemi: boolean;
  incassi: boolean;
  created_at: string;
  updated_at: string;
  activities?: ReportActivity[];
  linked_clients?: { id: string; cliente_id: string; cliente?: { id: string; nome: string } }[];
  linked_orders?: { id: string; ordine_id: string; ordine?: { id: string; codice: string; totale: number } }[];
}

export interface DailyReportFormData {
  data_report: string;
  titolo: string;
  testo_report?: string;
  ordini_fatti: boolean;
  campioni_consegnati: boolean;
  promo_proposte: boolean;
  problemi: boolean;
  incassi: boolean;
  activities: Omit<ReportActivity, 'id' | 'report_id'>[];
  linked_client_ids: string[];
  linked_order_ids: string[];
}

export const TIPO_ATTIVITA_OPTIONS = [
  { value: "visita", label: "Visita" },
  { value: "telefonata", label: "Telefonata" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "ordine", label: "Ordine" },
  { value: "campioni", label: "Campioni" },
  { value: "promo_proposta", label: "Promo proposta" },
  { value: "problema", label: "Problema / contestazione" },
  { value: "recupero_credito", label: "Recupero credito" },
];

export const ESITO_OPTIONS = [
  { value: "ok", label: "Ok" },
  { value: "da_richiamare", label: "Da richiamare" },
  { value: "non_trovato", label: "Non trovato" },
  { value: "non_interessato", label: "Non interessato" },
  { value: "interessato", label: "Interessato" },
];

export function useDailyReports(filters?: {
  searchTerm?: string;
  dateFrom?: string;
  dateTo?: string;
  clienteId?: string;
  tipoAttivita?: string;
}) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["daily-reports", filters],
    queryFn: async () => {
      let query = supabase
        .from("daily_reports")
        .select(`
          *,
          activities:report_activities(
            *,
            cliente:clienti(id, nome),
            azienda:aziende(id, nome)
          ),
          linked_clients:report_clients(
            id,
            cliente_id,
            cliente:clienti(id, nome)
          ),
          linked_orders:report_orders(
            id,
            ordine_id,
            ordine:ordini(id, codice, totale)
          )
        `)
        .order("data_report", { ascending: false });

      if (filters?.dateFrom) {
        query = query.gte("data_report", filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte("data_report", filters.dateTo);
      }
      if (filters?.searchTerm) {
        query = query.or(`titolo.ilike.%${filters.searchTerm}%,testo_report.ilike.%${filters.searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      let results = data as DailyReport[];

      // Filter by cliente if specified (need to check activities and linked_clients)
      if (filters?.clienteId) {
        results = results.filter(report => 
          report.activities?.some(a => a.cliente_id === filters.clienteId) ||
          report.linked_clients?.some(lc => lc.cliente_id === filters.clienteId)
        );
      }

      // Filter by tipo attivita if specified
      if (filters?.tipoAttivita) {
        results = results.filter(report =>
          report.activities?.some(a => a.tipo_attivita === filters.tipoAttivita)
        );
      }

      return results;
    },
    enabled: !!user,
  });
}

export function useDailyReport(id?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["daily-report", id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("daily_reports")
        .select(`
          *,
          activities:report_activities(
            *,
            cliente:clienti(id, nome),
            azienda:aziende(id, nome)
          ),
          linked_clients:report_clients(
            id,
            cliente_id,
            cliente:clienti(id, nome)
          ),
          linked_orders:report_orders(
            id,
            ordine_id,
            ordine:ordini(id, codice, totale)
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as DailyReport;
    },
    enabled: !!user && !!id,
  });
}

export function useTodayReportStats() {
  const { user } = useAuth();
  const today = new Date().toISOString().split("T")[0];

  return useQuery({
    queryKey: ["today-report-stats", today],
    queryFn: async () => {
      // Get today's reports
      const { data: reports, error: reportsError } = await supabase
        .from("daily_reports")
        .select(`
          id,
          activities:report_activities(tipo_attivita, cliente_id),
          linked_orders:report_orders(ordine_id)
        `)
        .eq("data_report", today);

      if (reportsError) throw reportsError;

      const reportCount = reports?.length || 0;
      const ordersCount = reports?.reduce((acc, r) => acc + (r.linked_orders?.length || 0), 0) || 0;
      
      const clientiSet = new Set<string>();
      let campioniCount = 0;
      
      reports?.forEach(r => {
        r.activities?.forEach((a: { tipo_attivita: string; cliente_id?: string | null }) => {
          if (a.cliente_id) clientiSet.add(a.cliente_id);
          if (a.tipo_attivita === "campioni") campioniCount++;
        });
      });

      return {
        reportCount,
        ordersCount,
        clientiCount: clientiSet.size,
        campioniCount,
      };
    },
    enabled: !!user,
  });
}

export function useClientReports(clienteId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["client-reports", clienteId],
    queryFn: async () => {
      if (!clienteId) return [];

      // Get reports where this client is in activities or linked_clients
      const { data, error } = await supabase
        .from("daily_reports")
        .select(`
          id,
          data_report,
          titolo,
          testo_report,
          activities:report_activities!inner(cliente_id)
        `)
        .eq("report_activities.cliente_id", clienteId)
        .order("data_report", { ascending: false })
        .limit(10);

      if (error) throw error;

      // Also get from linked_clients
      const { data: linkedData, error: linkedError } = await supabase
        .from("report_clients")
        .select(`
          report:daily_reports(id, data_report, titolo, testo_report)
        `)
        .eq("cliente_id", clienteId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (linkedError) throw linkedError;

      // Merge and dedupe
      const allReports = [...(data || [])];
      linkedData?.forEach((ld: { report: { id: string; data_report: string; titolo: string; testo_report?: string | null } | null }) => {
        if (ld.report && !allReports.some(r => r.id === ld.report!.id)) {
          allReports.push(ld.report as typeof allReports[0]);
        }
      });

      return allReports.sort((a, b) => 
        new Date(b.data_report).getTime() - new Date(a.data_report).getTime()
      ).slice(0, 10);
    },
    enabled: !!user && !!clienteId,
  });
}

export function useCreateDailyReport() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (formData: DailyReportFormData) => {
      if (!user) throw new Error("User not authenticated");

      // Create the report
      const { data: report, error: reportError } = await supabase
        .from("daily_reports")
        .insert({
          user_id: user.id,
          data_report: formData.data_report,
          titolo: formData.titolo,
          testo_report: formData.testo_report,
          ordini_fatti: formData.ordini_fatti,
          campioni_consegnati: formData.campioni_consegnati,
          promo_proposte: formData.promo_proposte,
          problemi: formData.problemi,
          incassi: formData.incassi,
        })
        .select()
        .single();

      if (reportError) throw reportError;

      // Insert activities
      if (formData.activities.length > 0) {
        const { error: activitiesError } = await supabase
          .from("report_activities")
          .insert(
            formData.activities.map(a => ({
              user_id: user.id,
              report_id: report.id,
              cliente_id: a.cliente_id,
              azienda_id: a.azienda_id,
              tipo_attivita: a.tipo_attivita,
              descrizione: a.descrizione,
              esito: a.esito,
              prossimo_step: a.prossimo_step,
            }))
          );

        if (activitiesError) throw activitiesError;
      }

      // Insert linked clients
      if (formData.linked_client_ids.length > 0) {
        const { error: clientsError } = await supabase
          .from("report_clients")
          .insert(
            formData.linked_client_ids.map(clienteId => ({
              user_id: user.id,
              report_id: report.id,
              cliente_id: clienteId,
            }))
          );

        if (clientsError) throw clientsError;
      }

      // Insert linked orders
      if (formData.linked_order_ids.length > 0) {
        const { error: ordersError } = await supabase
          .from("report_orders")
          .insert(
            formData.linked_order_ids.map(ordineId => ({
              user_id: user.id,
              report_id: report.id,
              ordine_id: ordineId,
            }))
          );

        if (ordersError) throw ordersError;
      }

      return report;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-reports"] });
      queryClient.invalidateQueries({ queryKey: ["today-report-stats"] });
    },
  });
}

export function useUpdateDailyReport() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, formData }: { id: string; formData: DailyReportFormData }) => {
      if (!user) throw new Error("User not authenticated");

      // Update the report
      const { error: reportError } = await supabase
        .from("daily_reports")
        .update({
          data_report: formData.data_report,
          titolo: formData.titolo,
          testo_report: formData.testo_report,
          ordini_fatti: formData.ordini_fatti,
          campioni_consegnati: formData.campioni_consegnati,
          promo_proposte: formData.promo_proposte,
          problemi: formData.problemi,
          incassi: formData.incassi,
        })
        .eq("id", id);

      if (reportError) throw reportError;

      // Delete existing activities, clients, orders
      await supabase.from("report_activities").delete().eq("report_id", id);
      await supabase.from("report_clients").delete().eq("report_id", id);
      await supabase.from("report_orders").delete().eq("report_id", id);

      // Re-insert activities
      if (formData.activities.length > 0) {
        const { error: activitiesError } = await supabase
          .from("report_activities")
          .insert(
            formData.activities.map(a => ({
              user_id: user.id,
              report_id: id,
              cliente_id: a.cliente_id,
              azienda_id: a.azienda_id,
              tipo_attivita: a.tipo_attivita,
              descrizione: a.descrizione,
              esito: a.esito,
              prossimo_step: a.prossimo_step,
            }))
          );

        if (activitiesError) throw activitiesError;
      }

      // Re-insert linked clients
      if (formData.linked_client_ids.length > 0) {
        const { error: clientsError } = await supabase
          .from("report_clients")
          .insert(
            formData.linked_client_ids.map(clienteId => ({
              user_id: user.id,
              report_id: id,
              cliente_id: clienteId,
            }))
          );

        if (clientsError) throw clientsError;
      }

      // Re-insert linked orders
      if (formData.linked_order_ids.length > 0) {
        const { error: ordersError } = await supabase
          .from("report_orders")
          .insert(
            formData.linked_order_ids.map(ordineId => ({
              user_id: user.id,
              report_id: id,
              ordine_id: ordineId,
            }))
          );

        if (ordersError) throw ordersError;
      }

      return { id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["daily-reports"] });
      queryClient.invalidateQueries({ queryKey: ["daily-report", data.id] });
      queryClient.invalidateQueries({ queryKey: ["today-report-stats"] });
    },
  });
}

export function useDeleteDailyReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("daily_reports")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-reports"] });
      queryClient.invalidateQueries({ queryKey: ["today-report-stats"] });
    },
  });
}
