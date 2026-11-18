import { ReactNode, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { QuickActions } from "./QuickActions";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { InternalSearch } from "./InternalSearch";
import { NotificationBell } from "@/components/notifiche/NotificationBell";

interface MainLayoutProps {
  children: ReactNode;
}

// Protected pages reopen after sign-in (e.g. a notification tapped while signed out).
const authRedirect = () => {
  const target = window.location.pathname + window.location.search;
  return target && target !== "/" && !target.startsWith("/auth") ? `/auth?redirect=${encodeURIComponent(target)}` : "/auth";
};

export function MainLayout({ children }: MainLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
        navigate(authRedirect());
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        setIsAuthenticated(false);
        navigate(authRedirect());
      } else {
        // Sessione ripristinata (es. rinnovo dopo una rete instabile): si torna alla pagina.
        setIsAuthenticated(true);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Chiudi il drawer mobile a ogni cambio di pagina.
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    // Mai uno schermo vuoto: se la sessione non c'è (scaduta o persa per un
    // attimo) si spiega cosa succede e si offre l'accesso.
    return (
      <div role="alert" className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 bg-background p-6 text-center">
        <p className="text-base font-semibold">Sessione da rinnovare</p>
        <p className="max-w-sm text-sm text-muted-foreground">Per sicurezza serve accedere di nuovo. I tuoi dati sono salvati.</p>
        <button
          type="button"
          onClick={() => navigate(authRedirect())}
          className="min-h-11 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground"
        >
          Accedi
        </button>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen min-h-[100dvh] bg-background safe-top overflow-hidden">
      <Sidebar mobileOpen={mobileMenuOpen} onMobileOpenChange={setMobileMenuOpen} />
      <main
        className="lg:pl-80 min-h-screen min-h-[100dvh] overflow-y-auto overflow-x-hidden text-foreground"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="crm-page min-w-0 p-4 pt-6 pb-24 lg:pt-6 lg:p-8 lg:pb-8"><div className="mb-6 flex items-center gap-2"><div className="min-w-0 flex-1 lg:flex-none"><InternalSearch /></div><NotificationBell className="lg:ml-auto" /></div>{children}</div>
      </main>
      <div className="hidden lg:block"><QuickActions /></div>
      <BottomNav
        onOpenMore={() => setMobileMenuOpen(true)}
        moreActive={mobileMenuOpen}
      />
    </div>
  );
}
