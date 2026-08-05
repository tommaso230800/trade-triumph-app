import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  Users,
  ShoppingCart,
  Settings,
  LogOut,
  X,
  BarChart3,
  Wallet,
  Tag,
  ChevronDown,
  Bot,
  Brain,
  Repeat,
  Gauge,
  Activity,
  Mail,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import agencyLogo from "@/assets/agency-logo.jpg";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

type NavChild = {
  name: string;
  href: string;
};

type NavItem = {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavChild[];
};

const navigation: NavItem[] = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Ordini", href: "/ordini", icon: ShoppingCart },
  { name: "Email ordini", href: "/email-ordini", icon: Mail },
  { name: "KPI", href: "/kpi", icon: BarChart3 },
  { name: "Provvigioni", href: "/provvigioni", icon: Wallet },
  { name: "Canvass/PFA", href: "/canvass", icon: Tag },
  { name: "Riordino", href: "/riordino", icon: Repeat },
  { name: "Intelligenza", href: "/intelligenza-commerciale", icon: Gauge },
  { name: "Aziende", href: "/aziende", icon: Building2 },
  {
    name: "Clienti",
    href: "/clienti",
    icon: Users,
    children: [
      { name: "ADAT", href: "/clienti/consorzio/adat" },
      { name: "CBF", href: "/clienti/consorzio/cbf" },
      { name: "BEVERAGE NETWORK", href: "/clienti/consorzio/beverage-network" },
      { name: "BOTT. FIORENTINE", href: "/clienti/consorzio/bottiglierie-fiorentine" },
      { name: "RASNA", href: "/clienti/consorzio/rasna" },
      { name: "CDA", href: "/clienti/consorzio/cda" },
      { name: "SAN GEMINIANO", href: "/clienti/consorzio/san-geminiano" },
      { name: "INDIPENDENTE", href: "/clienti/consorzio/indipendente" },
    ]
  },
  { name: "Prepara Visita", href: "/prepara-visita", icon: Brain },
  { name: "AI Commerciale", href: "/ai-commerciale", icon: Bot },
];

interface SidebarProps {
  /** Stato del drawer mobile, controllato dal genitore (MainLayout + BottomNav). */
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
}

export function Sidebar({ mobileOpen, onMobileOpenChange }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [openMenus, setOpenMenus] = useState<string[]>([]);

  const closeMobile = () => onMobileOpenChange(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const toggleMenu = (name: string) => {
    setOpenMenus(prev =>
      prev.includes(name)
        ? prev.filter(n => n !== name)
        : [...prev, name]
    );
  };

  const isChildActive = (item: NavItem) => {
    if (!item.children) return false;
    return item.children.some(child => location.pathname === child.href) ||
           location.pathname.startsWith('/clienti/consorzio/');
  };

  const NavItemComponent = ({ item }: { item: NavItem }) => {
    const isActive = location.pathname === item.href;
    const hasChildren = item.children && item.children.length > 0;
    const isOpen = openMenus.includes(item.name) || isChildActive(item);
    const childActive = isChildActive(item);

    if (hasChildren) {
      return (
        <Collapsible open={isOpen} onOpenChange={() => toggleMenu(item.name)}>
          <div className="space-y-1">
            <Link
              to={item.href}
              onClick={closeMobile}
              className={cn(
                "flex items-center gap-3 rounded-xl px-4 py-3 sm:py-3.5 text-body-md font-medium transition-colors duration-150 touch-target",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : childActive
                    ? "text-sidebar-foreground bg-sidebar-accent/50"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              <span className="truncate flex-1 text-sm sm:text-base">{item.name}</span>
              <CollapsibleTrigger asChild>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleMenu(item.name);
                  }}
                  className="p-1 rounded-lg hover:bg-sidebar-accent/50 transition-colors"
                >
                  <ChevronDown className={cn(
                    "h-4 w-4 transition-transform duration-200",
                    isOpen && "rotate-180"
                  )} />
                </button>
              </CollapsibleTrigger>
            </Link>
            <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
              <div className="ml-4 space-y-0.5 border-l-2 border-sidebar-border pl-3 max-h-[300px] overflow-y-auto">
                {item.children!.map((child) => {
                  const isChildItemActive = location.pathname === child.href;
                  return (
                    <Link
                      key={child.name}
                      to={child.href}
                      onClick={closeMobile}
                      className={cn(
                        "flex items-center gap-2 rounded-lg px-3 py-2 text-xs sm:text-sm font-medium transition-colors duration-150",
                        isChildItemActive
                          ? "bg-sidebar-primary/80 text-sidebar-primary-foreground"
                          : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <span className="truncate">{child.name}</span>
                    </Link>
                  );
                })}
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      );
    }

    return (
      <Link
        to={item.href}
        onClick={closeMobile}
        className={cn(
          "flex items-center gap-3 rounded-xl px-4 py-3 sm:py-3.5 text-body-md font-medium transition-colors duration-150 touch-target",
          isActive
            ? "bg-sidebar-primary text-sidebar-primary-foreground"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
      >
        <item.icon className="h-5 w-5 flex-shrink-0" />
        <span className="truncate text-sm sm:text-base">{item.name}</span>
      </Link>
    );
  };

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="flex h-16 sm:h-20 items-center gap-3 px-3 sm:px-4 border-b border-sidebar-border">
        <div className="flex h-10 w-10 sm:h-14 sm:w-14 items-center justify-center rounded-xl bg-white shadow-sm overflow-hidden flex-shrink-0">
          <img src={agencyLogo} alt="AMG Logo" className="w-full h-full object-contain p-1" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-sm sm:text-base font-bold text-sidebar-foreground truncate">AMG HO.RE.CA</h1>
          <p className="text-xs sm:text-body-sm text-sidebar-foreground/60 truncate">Business & Strategy</p>
        </div>
        {/* Mobile close button */}
        <button
          className="lg:hidden text-sidebar-foreground h-9 w-9 flex items-center justify-center rounded-lg hover:bg-sidebar-accent"
          onClick={closeMobile}
          aria-label="Chiudi menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation - touch friendly */}
      <nav className="flex-1 space-y-1 px-2 sm:px-3 py-3 sm:py-4 overflow-y-auto">
        {navigation.map((item) => (
          <NavItemComponent key={item.name} item={item} />
        ))}
      </nav>

      {/* Bottom Actions - touch friendly */}
      <div className="border-t border-sidebar-border p-2 sm:p-3 space-y-1 safe-bottom">
        <Link
          to="/impostazioni"
          onClick={closeMobile}
          className={cn(
            "flex items-center gap-3 rounded-xl px-4 py-3 sm:py-3.5 text-body-md font-medium transition-colors duration-150 touch-target",
            location.pathname === "/impostazioni"
              ? "bg-sidebar-primary text-sidebar-primary-foreground"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          )}
        >
          <Settings className="h-5 w-5 flex-shrink-0" />
          <span className="truncate text-sm sm:text-base">Impostazioni</span>
        </Link>
        <Link
          to="/diagnostica"
          onClick={closeMobile}
          className={cn(
            "flex items-center gap-3 rounded-xl px-4 py-3 sm:py-3.5 text-body-md font-medium transition-colors duration-150 touch-target",
            location.pathname === "/diagnostica"
              ? "bg-sidebar-primary text-sidebar-primary-foreground"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          )}
        >
          <Activity className="h-5 w-5 flex-shrink-0" />
          <span className="truncate text-sm sm:text-base">Diagnostica</span>
        </Link>
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 sm:py-3.5 text-body-md font-medium text-destructive hover:bg-destructive/10 transition-colors duration-150 touch-target"
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          <span className="truncate text-sm sm:text-base">Esci</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={closeMobile}
        />
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border flex-col">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar - with safe areas */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[280px] sm:w-72 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-300 ease-out lg:hidden safe-top safe-bottom",
          mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        )}
      >
        <SidebarContent />
      </aside>
    </>
  );
}
