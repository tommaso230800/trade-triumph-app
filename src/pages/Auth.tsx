import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrendingUp, Loader2 } from "lucide-react";
import { toast } from "sonner";

const CORRECT_PASSWORD = "Nictom23";

export default function Auth() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const auth = sessionStorage.getItem("app_authenticated");
    if (auth === "true") {
      setIsAuthenticated(true);
      navigate("/");
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Small delay for UX
    await new Promise((r) => setTimeout(r, 300));

    if (password === CORRECT_PASSWORD) {
      sessionStorage.setItem("app_authenticated", "true");
      toast.success("Benvenuto!");
      navigate("/");
    } else {
      toast.error("Password non corretta");
    }

    setLoading(false);
  };

  if (isAuthenticated) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary mb-4">
            <TrendingUp className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">SalesAgent Pro</h1>
          <p className="text-muted-foreground mt-1">Inserisci la password per accedere</p>
        </div>

        <div className="bg-card rounded-xl shadow-card p-6 animate-fade-in">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                autoFocus
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading || !password}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Accedi
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
