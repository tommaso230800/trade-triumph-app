import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { subDays, format, startOfWeek, endOfWeek } from "date-fns";

export interface WeeklyStats {
  totalReports: number;
  totalActivities: number;
  totalOrders: number;
  activitiesByType: { tipo: string; count: number }[];
  clientiContattati: number;
}

export function useWeeklyDiaryStats() {
  const { user } = useAuth();
  const today = new Date();
  const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weekEnd = format(endOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");

  return useQuery({
    queryKey: ["weekly-diary-stats", weekStart, weekEnd],
    queryFn: async (): Promise<WeeklyStats> => {
      // Get reports this week
      const { data: reports, error: reportsError } = await supabase
        .from("daily_reports")
        .select(`
          id,
          linked_orders:report_orders(ordine_id)
        `)
        .gte("data_report", weekStart)
        .lte("data_report", weekEnd);

      if (reportsError) throw reportsError;

      // Get activities this week
      const { data: activities, error: activitiesError } = await supabase
        .from("report_activities")
        .select(`
          id,
          tipo_attivita,
          cliente_id,
          report:daily_reports!inner(data_report)
        `)
        .gte("daily_reports.data_report", weekStart)
        .lte("daily_reports.data_report", weekEnd);

      if (activitiesError) throw activitiesError;

      const totalReports = reports?.length || 0;
      const totalOrders = reports?.reduce((acc, r) => acc + (r.linked_orders?.length || 0), 0) || 0;
      const totalActivities = activities?.length || 0;

      // Count by type
      const typeCount: Record<string, number> = {};
      const clientiSet = new Set<string>();
      
      activities?.forEach((a: { tipo_attivita: string; cliente_id?: string | null }) => {
        typeCount[a.tipo_attivita] = (typeCount[a.tipo_attivita] || 0) + 1;
        if (a.cliente_id) clientiSet.add(a.cliente_id);
      });

      const activitiesByType = Object.entries(typeCount)
        .map(([tipo, count]) => ({ tipo, count }))
        .sort((a, b) => b.count - a.count);

      return {
        totalReports,
        totalActivities,
        totalOrders,
        activitiesByType,
        clientiContattati: clientiSet.size,
      };
    },
    enabled: !!user,
  });
}

export interface ClientNotVisited {
  id: string;
  nome: string;
  citta: string | null;
  telefono: string | null;
  lastVisitDate: string | null;
  daysSinceVisit: number | null;
}

export function useClientsNotVisited(days: number = 30) {
  const { user } = useAuth();
  const cutoffDate = format(subDays(new Date(), days), "yyyy-MM-dd");

  return useQuery({
    queryKey: ["clients-not-visited", days],
    queryFn: async (): Promise<ClientNotVisited[]> => {
      // Get all clients
      const { data: clienti, error: clientiError } = await supabase
        .from("clienti")
        .select("id, nome, citta, telefono")
        .order("nome");

      if (clientiError) throw clientiError;

      // Get recent activities for each client
      const { data: recentActivities, error: activitiesError } = await supabase
        .from("report_activities")
        .select(`
          cliente_id,
          created_at,
          report:daily_reports(data_report)
        `)
        .in("tipo_attivita", ["visita", "telefonata", "whatsapp"])
        .gte("created_at", cutoffDate);

      if (activitiesError) throw activitiesError;

      // Get recent linked clients
      const { data: recentLinked, error: linkedError } = await supabase
        .from("report_clients")
        .select(`
          cliente_id,
          created_at,
          report:daily_reports(data_report)
        `)
        .gte("created_at", cutoffDate);

      if (linkedError) throw linkedError;

      // Build a map of last contact date per client
      const lastContactMap = new Map<string, string>();

      recentActivities?.forEach((a: { cliente_id?: string | null; report?: { data_report: string } | null }) => {
        if (a.cliente_id && a.report?.data_report) {
          const current = lastContactMap.get(a.cliente_id);
          if (!current || a.report.data_report > current) {
            lastContactMap.set(a.cliente_id, a.report.data_report);
          }
        }
      });

      recentLinked?.forEach((l: { cliente_id: string; report?: { data_report: string } | null }) => {
        if (l.report?.data_report) {
          const current = lastContactMap.get(l.cliente_id);
          if (!current || l.report.data_report > current) {
            lastContactMap.set(l.cliente_id, l.report.data_report);
          }
        }
      });

      // Filter clients not visited in the period
      const notVisited: ClientNotVisited[] = [];
      const today = new Date();

      clienti?.forEach((c) => {
        const lastVisit = lastContactMap.get(c.id);
        if (!lastVisit) {
          // Never visited or not in last 30 days
          notVisited.push({
            ...c,
            lastVisitDate: null,
            daysSinceVisit: null,
          });
        }
      });

      // Also get clients with old visits (before cutoff) - need separate query
      const { data: oldActivities } = await supabase
        .from("report_activities")
        .select(`
          cliente_id,
          report:daily_reports(data_report)
        `)
        .in("tipo_attivita", ["visita", "telefonata", "whatsapp"])
        .lt("created_at", cutoffDate)
        .order("created_at", { ascending: false });

      const oldContactMap = new Map<string, string>();
      oldActivities?.forEach((a: { cliente_id?: string | null; report?: { data_report: string } | null }) => {
        if (a.cliente_id && a.report?.data_report && !oldContactMap.has(a.cliente_id)) {
          oldContactMap.set(a.cliente_id, a.report.data_report);
        }
      });

      // Add clients with old visits
      clienti?.forEach((c) => {
        if (!lastContactMap.has(c.id) && oldContactMap.has(c.id)) {
          const lastVisit = oldContactMap.get(c.id)!;
          const daysSince = Math.floor((today.getTime() - new Date(lastVisit).getTime()) / (1000 * 60 * 60 * 24));
          notVisited.push({
            ...c,
            lastVisitDate: lastVisit,
            daysSinceVisit: daysSince,
          });
        }
      });

      // Sort: those with old visits first (by days), then never visited
      return notVisited
        .sort((a, b) => {
          if (a.daysSinceVisit === null && b.daysSinceVisit === null) return 0;
          if (a.daysSinceVisit === null) return 1;
          if (b.daysSinceVisit === null) return -1;
          return b.daysSinceVisit - a.daysSinceVisit;
        })
        .slice(0, 15);
    },
    enabled: !!user,
  });
}
