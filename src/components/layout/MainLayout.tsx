import { ReactNode, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
        navigate("/auth");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        setIsAuthenticated(false);
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="relative min-h-screen min-h-[100dvh] bg-background safe-top safe-bottom overflow-hidden">
      {/* Ambient aurora multi-color */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[620px] h-[620px] rounded-full bg-brand-blue/20 blur-[140px] animate-float" />
        <div className="absolute -top-20 right-0 w-[480px] h-[480px] rounded-full bg-brand-green/15 blur-[140px] animate-float" style={{ animationDelay: '1.5s' }} />
        <div className="absolute -bottom-40 -right-40 w-[560px] h-[560px] rounded-full bg-brand-red/15 blur-[140px] animate-float" style={{ animationDelay: '3s' }} />
        <div className="absolute -bottom-32 left-10 w-[420px] h-[420px] rounded-full bg-brand-yellow/12 blur-[140px] animate-float" style={{ animationDelay: '4.5s' }} />
      </div>
      <Sidebar />
      <main className="lg:pl-64 min-h-screen min-h-[100dvh] overflow-y-auto overflow-x-hidden" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div key={location.pathname} className="p-4 pt-16 pb-20 lg:pt-6 lg:p-8 lg:pb-8 animate-rise-in">{children}</div>
      </main>
    </div>
  );
}
