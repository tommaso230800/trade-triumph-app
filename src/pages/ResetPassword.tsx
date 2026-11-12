import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { passwordProblem } from "@/lib/agencyAuth";

/** Public page opened from the recovery email link. */
export default function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const isRecovery = window.location.hash.includes("type=recovery");
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session && isRecovery) setReady(true);
      else if (!isRecovery) setError("Link non valido o scaduto. Richiedi un nuovo link dalla pagina di accesso.");
    });
    return () => subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = passwordProblem(password, confirm);
    if (problem) return setError(problem);
    setSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (updateError) return setError("Impossibile salvare la nuova password. Richiedi un nuovo link e riprova.");
    setDone(true);
    setTimeout(() => navigate("/"), 1500);
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
        <h1 className="font-display text-2xl font-bold tracking-tight">Nuova password</h1>
        {done ? (
          <p className="mt-4 flex items-center gap-2 text-sm text-success"><CheckCircle2 className="h-4 w-4" /> Password aggiornata. Accesso in corso…</p>
        ) : (
          <form onSubmit={submit} className="mt-4 space-y-4">
            {error && (
              <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> <span>{error}</span>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="new-password">Nuova password</Label>
              <Input id="new-password" type="password" autoComplete="new-password" className="h-12 text-base" value={password} onChange={(e) => setPassword(e.target.value)} disabled={!ready || saving} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Ripeti la password</Label>
              <Input id="confirm-password" type="password" autoComplete="new-password" className="h-12 text-base" value={confirm} onChange={(e) => setConfirm(e.target.value)} disabled={!ready || saving} />
            </div>
            <Button type="submit" className="h-12 w-full" disabled={!ready || saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salva password
            </Button>
            <Button type="button" variant="ghost" className="h-12 w-full" onClick={() => navigate("/auth")}>Torna all’accesso</Button>
          </form>
        )}
      </div>
    </div>
  );
}
