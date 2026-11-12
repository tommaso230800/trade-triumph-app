import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound, Loader2, LogOut, Shield, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentMember, type AgencyMember } from "@/hooks/useAgency";
import { changeOwnPassword, passwordProblem, resetMemberPassword } from "@/lib/agencyAuth";
import { supabase } from "@/integrations/supabase/client";

/** Account, password change, logout and (for the owner) colleague passwords. */
export function AccountSecurityCard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { me, members } = useCurrentMember();
  const [changeOpen, setChangeOpen] = useState(false);
  const [target, setTarget] = useState<AgencyMember | null>(null);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reset = () => { setCurrent(""); setNext(""); setConfirm(""); setError(null); setSaving(false); };

  const submitOwn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email) return;
    if (!current) return setError("Inserisci la password attuale.");
    const problem = passwordProblem(next, confirm);
    if (problem) return setError(problem);
    setSaving(true);
    const { error: err } = await changeOwnPassword(user.email, current, next);
    setSaving(false);
    if (err) return setError(err);
    toast.success("Password aggiornata");
    setChangeOpen(false);
    reset();
  };

  const submitMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target) return;
    const problem = passwordProblem(next, confirm);
    if (problem) return setError(problem);
    setSaving(true);
    const { error: err } = await resetMemberPassword(target.user_id, next);
    setSaving(false);
    if (err) return setError(err);
    toast.success(`Nuova password impostata per ${target.full_name}`);
    setTarget(null);
    reset();
  };

  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <Card className="shadow-card">
      <CardHeader className="p-4 pb-4 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">Account e sicurezza</CardTitle>
            <CardDescription>Accesso con username e password</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
        <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/50 p-3">
          <div className="min-w-0">
            <p className="truncate font-semibold">{me?.full_name ?? user?.email}</p>
            <p className="text-xs text-muted-foreground">Username: {me?.username ?? "—"}</p>
          </div>
          {me?.is_owner && <Badge variant="secondary">Titolare</Badge>}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button variant="outline" className="h-11 justify-start gap-2" onClick={() => { reset(); setChangeOpen(true); }}>
            <KeyRound className="h-4 w-4" /> Cambia password
          </Button>
          <Button variant="outline" className="h-11 justify-start gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={logout}>
            <LogOut className="h-4 w-4" /> Esci
          </Button>
        </div>

        {me?.is_owner && members.length > 0 && (
          <div className="space-y-2">
            <p className="flex items-center gap-2 text-sm font-semibold"><Users className="h-4 w-4" /> Utenti dell’agenzia</p>
            <ul className="divide-y divide-border rounded-lg border border-border">
              {members.map((m) => (
                <li key={m.user_id} className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{m.full_name}</p>
                    <p className="text-xs text-muted-foreground">Username: {m.username}</p>
                  </div>
                  {m.user_id !== user?.id && (
                    <Button size="sm" variant="ghost" className="h-11 shrink-0" onClick={() => { reset(); setTarget(m); }}>
                      Nuova password
                    </Button>
                  )}
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">Gli account senza email di recupero reimpostano la password da qui.</p>
          </div>
        )}
      </CardContent>

      <Dialog open={changeOpen} onOpenChange={(o) => { setChangeOpen(o); if (!o) reset(); }}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cambia password</DialogTitle>
            <DialogDescription>Almeno 8 caratteri; maiuscole e minuscole contano.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitOwn} className="space-y-3">
            <input type="text" name="username" autoComplete="username" value={me?.username ?? ""} readOnly hidden />
            <div className="space-y-1.5"><Label htmlFor="pw-current">Password attuale</Label><Input id="pw-current" type="password" autoComplete="current-password" className="h-12 text-base" value={current} onChange={(e) => setCurrent(e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="pw-new">Nuova password</Label><Input id="pw-new" type="password" autoComplete="new-password" className="h-12 text-base" value={next} onChange={(e) => setNext(e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="pw-confirm">Ripeti la nuova password</Label><Input id="pw-confirm" type="password" autoComplete="new-password" className="h-12 text-base" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <DialogFooter><Button type="submit" className="h-12 w-full" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salva nuova password</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!target} onOpenChange={(o) => { if (!o) { setTarget(null); reset(); } }}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuova password per {target?.full_name}</DialogTitle>
            <DialogDescription>Comunica la nuova password direttamente al collega.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitMember} className="space-y-3">
            <div className="space-y-1.5"><Label htmlFor="mpw-new">Nuova password</Label><Input id="mpw-new" type="password" autoComplete="new-password" className="h-12 text-base" value={next} onChange={(e) => setNext(e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="mpw-confirm">Ripeti la password</Label><Input id="mpw-confirm" type="password" autoComplete="new-password" className="h-12 text-base" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <DialogFooter><Button type="submit" className="h-12 w-full" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Imposta password</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
