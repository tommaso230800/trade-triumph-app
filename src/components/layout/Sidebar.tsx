import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  Users,
  ShoppingCart,
  Calendar,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  BarChart3,
  Wallet,
  Tag,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import agencyLogo from "@/assets/agency-logo.jpg";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "KPI", href: "/kpi", icon: BarChart3 },
  { name: "Provvigioni", href: "/provvigioni", icon: Wallet },
  { name: "Canvass/PFA", href: "/canvass", icon: Tag },
  { name: "Giro Visite", href: "/giro-visita", icon: MapPin },
  { name: "Aziende", href: "/aziende", icon: Building2 },
  { name: "Clienti", href: "/clienti", icon: Users },
  { name: "Ordini", href: "/ordini", icon: ShoppingCart },
  { name: "Agenda", href: "/agenda", icon: Calendar },
  { name: "Promemoria", href: "/promemoria", icon: Bell },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="flex h-20 items-center gap-3 px-4 border-b border-sidebar-border">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white shadow-sm overflow-hidden flex-shrink-0 transition-transform duration-300 hover:scale-105">
          <img src={agencyLogo} alt="AMG Logo" className="w-full h-full object-contain p-1" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-base font-bold text-sidebar-foreground truncate">AMG HO.RE.CA</h1>
          <p className="text-body-sm text-sidebar-foreground/60 truncate">Business & Strategy</p>
        </div>
        {/* Mobile close button */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden text-sidebar-foreground transition-transform duration-200 active:scale-90"
          onClick={() => setMobileOpen(false)}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Navigation - touch friendly */}
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {navigation.map((item, index) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-4 py-3.5 text-body-md font-medium transition-all duration-250 ease-smooth touch-target active:scale-[0.98] animate-fade-in animate-fill-both",
                `stagger-${Math.min(index + 1, 6)}`,
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:translate-x-1 active:bg-sidebar-accent"
              )}
            >
              <item.icon className={cn("h-5 w-5 flex-shrink-0 transition-transform duration-200", isActive && "scale-110")} />
              <span className="truncate">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Actions - touch friendly */}
      <div className="border-t border-sidebar-border p-3 space-y-1 safe-bottom">
        <Link
          to="/impostazioni"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-body-md font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:translate-x-1 transition-all duration-250 ease-smooth touch-target active:scale-[0.98]"
        >
          <Settings className="h-5 w-5 flex-shrink-0" />
          <span className="truncate">Impostazioni</span>
        </Link>
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-body-md font-medium text-destructive hover:bg-destructive/10 hover:translate-x-1 transition-all duration-250 ease-smooth touch-target active:scale-[0.98]"
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          <span className="truncate">Esci</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile menu button - touch friendly */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden bg-card shadow-lg h-11 w-11 touch-target safe-top transition-all duration-200 hover:shadow-xl hover:scale-105 active:scale-95"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border flex-col">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar - with safe areas */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-350 ease-smooth lg:hidden safe-top safe-bottom",
          mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        )}
      >
        <SidebarContent />
      </aside>
    </>
  );
}
