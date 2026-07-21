import { MainLayout } from "@/components/layout/MainLayout";
import { useIsAdmin, useAllUsersRoles, type AppRole } from "@/hooks/useUserRole";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Shield, ShieldOff, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ROLES: AppRole[] = ["admin","amministrazione","agente","collaboratore","brand_ambassador","readonly"];

const ROLE_COLORS: Record<AppRole, string> = {
  admin: "bg-brand-red/20 text-brand-red border-brand-red/40",
  amministrazione: "bg-brand-yellow/20 text-brand-yellow border-brand-yellow/40",
  agente: "bg-brand-blue/20 text-brand-blue border-brand-blue/40",
  collaboratore: "bg-brand-green/20 text-brand-green border-brand-green/40",
  brand_ambassador: "bg-purple-500/20 text-purple-400 border-purple-500/40",
  readonly: "bg-muted text-muted-foreground border-border",
};

export default function UtentiRuoli() {
  const isAdmin = useIsAdmin();
  const { data: roles = [], isLoading, refetch } = useAllUsersRoles();
  const qc = useQueryClient();
  const [users, setUsers] = useState<Record<string, { email: string; full_name: string | null }>>({});

  useEffect(() => {
    (async () => {
      const ids = Array.from(new Set(roles.map((r: any) => r.user_id)));
      if (!ids.length) return;
      const { data } = await supabase.from("profiles").select("id, email, full_name").in("id", ids);
      const map: any = {};
      (data ?? []).forEach((p: any) => { map[p.id] = { email: p.email, full_name: p.full_name }; });
      setUsers(map);
    })();
  }, [roles]);

  const grouped: Record<string, AppRole[]> = {};
  roles.forEach((r: any) => {
    grouped[r.user_id] = grouped[r.user_id] || [];
    grouped[r.user_id].push(r.role as AppRole);
  });

  const addRole = async (userId: string, role: AppRole) => {
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
    if (error) return toast.error(error.message);
    toast.success("Ruolo assegnato");
    qc.invalidateQueries({ queryKey: ["all-user-roles"] });
  };
  const removeRole = async (userId: string, role: AppRole) => {
    const { error } = await supabase.from("user_roles").delete().match({ user_id: userId, role });
    if (error) return toast.error(error.message);
    toast.success("Ruolo rimosso");
    qc.invalidateQueries({ queryKey: ["all-user-roles"] });
  };

  if (!isAdmin) {
    return (
      <MainLayout>
        <Card className="p-8 text-center surface-noir">
          <ShieldOff className="h-12 w-12 mx-auto text-brand-red mb-3" />
          <h2 className="font-bold text-xl">Accesso riservato</h2>
          <p className="text-muted-foreground">Solo gli amministratori possono gestire i ruoli.</p>
        </Card>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <header className="space-y-2">
          <h1 className="font-display text-3xl font-bold flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-brand-blue" /> Utenti & Ruoli
          </h1>
          <p className="text-muted-foreground">Assegna ruoli agli utenti dell'agenzia. Un utente può avere più ruoli.</p>
        </header>

        {isLoading ? (
          <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <Card className="surface-noir divide-y divide-border">
            {Object.entries(grouped).map(([userId, userRoles]) => {
              const u = users[userId];
              return (
                <div key={userId} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <p className="font-medium">{u?.full_name ?? u?.email ?? userId.slice(0, 8)}</p>
                      {u?.email && <p className="text-xs text-muted-foreground">{u.email}</p>}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {userRoles.map((r) => (
                        <Badge key={r} className={`${ROLE_COLORS[r]} cursor-pointer`} onClick={() => {
                          if (confirm(`Rimuovere ruolo "${r}"?`)) removeRole(userId, r);
                        }}>
                          {r} ×
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className="text-xs text-muted-foreground">Aggiungi ruolo:</span>
                    <Select onValueChange={(v) => addRole(userId, v as AppRole)}>
                      <SelectTrigger className="w-52 h-8"><SelectValue placeholder="Scegli…" /></SelectTrigger>
                      <SelectContent>
                        {ROLES.filter((r) => !userRoles.includes(r)).map((r) => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            })}
          </Card>
        )}

        <Card className="p-4 surface-glass">
          <h3 className="font-semibold mb-2 flex items-center gap-2"><Shield className="h-4 w-4" /> Ruoli disponibili</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li><b className="text-brand-red">admin</b>: accesso completo, gestisce ruoli</li>
            <li><b className="text-brand-yellow">amministrazione</b>: accesso completo dati economici</li>
            <li><b className="text-brand-blue">agente</b>: vede solo i propri dati (default)</li>
            <li><b className="text-brand-green">collaboratore</b>: read + insert sui propri</li>
            <li><b className="text-purple-400">brand_ambassador</b>: visite/report soltanto</li>
            <li><b>readonly</b>: sola lettura</li>
          </ul>
        </Card>
      </div>
    </MainLayout>
  );
}
