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
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAziende } from "@/hooks/useAziende";
import agencyLogo from "@/assets/agency-logo.jpg";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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

const baseNavigation: NavItem[] = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Ordini", href: "/ordini", icon: ShoppingCart },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
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
  const { data: aziende } = useAziende();

  // Analytics ha una sottopagina per ogni azienda: l'elenco è generato dal
  // database, quindi ogni nuova azienda compare qui automaticamente.
  const navigation = useMemo<NavItem[]>(() => {
    const children = (aziende || [])
      .slice()
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .map((a) => ({ name: a.nome, href: `/analytics/azienda/${a.id}` }));
    return baseNavigation.map((item) =>
      item.href === "/analytics" && children.length > 0 ? { ...item, children } : item
    );
  }, [aziende]);


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
    if (item.children.some(child => location.pathname === child.href)) return true;
    if (item.href === "/clienti") return location.pathname.startsWith('/clienti/consorzio/');
    if (item.href === "/analytics") return location.pathname.startsWith('/analytics/azienda/');
    return false;
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
                "flex items-center gap-3 rounded-xl px-4 py-2 text-body-md font-[550] transition-colors duration-150 touch-target",
                isActive
                  ? "bg-sidebar-rail text-white"
                  : childActive
                    ? "text-sidebar-item bg-sidebar-accent/50"
                    : "text-sidebar-item hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon
                className={cn("h-[18px] w-[18px] flex-shrink-0", isActive ? "text-white" : "text-sidebar-item-icon")}
              />
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
                          ? "bg-sidebar-rail text-white"
                          : "text-sidebar-item/90 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
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
          "flex items-center gap-3 rounded-xl px-4 py-2 text-body-md font-[550] transition-colors duration-150 touch-target",
          isActive
            ? "bg-sidebar-rail text-white"
            : "text-sidebar-item hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
      >
        <item.icon
          className={cn("h-[18px] w-[18px] flex-shrink-0", isActive ? "text-white" : "text-sidebar-item-icon")}
        />
        <span className="truncate text-sm sm:text-base">{item.name}</span>
      </Link>
    );
  };

  /** Voce compatta del binario desktop: solo icona, nome in tooltip al passaggio del mouse. */
  const NavRailItem = ({ item }: { item: NavItem }) => {
    const isActive = location.pathname === item.href || isChildActive(item);
    return (
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <Link
            to={item.href}
            aria-label={item.name}
            className={cn(
              "flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg transition-colors duration-150",
              isActive
                ? "bg-white/[0.16] text-white"
                : "text-sidebar-rail-foreground hover:bg-white/10 hover:text-white"
            )}
          >
            <item.icon className="h-[18px] w-[18px]" />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right">{item.name}</TooltipContent>
      </Tooltip>
    );
  };

  const BottomActionsSection = () => (
    <div className="border-t border-sidebar-border p-2 sm:p-3 space-y-1 safe-bottom">
      <Link
        to="/impostazioni"
        onClick={closeMobile}
        className={cn(
          "flex items-center gap-3 rounded-xl px-4 py-2 text-body-md font-[550] transition-colors duration-150 touch-target",
          location.pathname === "/impostazioni"
            ? "bg-sidebar-rail text-white"
            : "text-sidebar-item hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
      >
        <Settings className="h-5 w-5 flex-shrink-0" />
        <span className="truncate text-sm sm:text-base">Impostazioni</span>
      </Link>
      <Link
        to="/diagnostica"
        onClick={closeMobile}
        className={cn(
          "flex items-center gap-3 rounded-xl px-4 py-2 text-body-md font-[550] transition-colors duration-150 touch-target",
          location.pathname === "/diagnostica"
            ? "bg-sidebar-rail text-white"
            : "text-sidebar-item hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
      >
        <Activity className="h-5 w-5 flex-shrink-0" />
        <span className="truncate text-sm sm:text-base">Diagnostica</span>
      </Link>
      <button
        onClick={handleSignOut}
        className="flex w-full items-center gap-3 rounded-xl px-4 py-2 text-body-md font-[550] text-destructive hover:bg-destructive/10 transition-colors duration-150 touch-target"
      >
        <LogOut className="h-5 w-5 flex-shrink-0" />
        <span className="truncate text-sm sm:text-base">Esci</span>
      </button>
    </div>
  );

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ backgroundColor: "hsl(225 18% 9% / 0.45)" }}
          onClick={closeMobile}
        />
      )}

      {/* Desktop sidebar: binario icone (sempre visibile) + pannello con le etichette */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-50">
        <div className="flex h-full w-16 flex-col items-center gap-1 overflow-y-auto bg-sidebar-rail py-3">
          <div className="mb-2 flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
            <img src={agencyLogo} alt="AMG Logo" className="w-full h-full object-contain p-1" />
          </div>
          {navigation.map((item) => (
            <NavRailItem key={item.name} item={item} />
          ))}
        </div>
        <div className="flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar">
          <nav className="flex-1 space-y-1 px-2 sm:px-3 py-3 sm:py-4 overflow-y-auto">
            {navigation.map((item) => (
              <NavItemComponent key={item.name} item={item} />
            ))}
          </nav>
          <BottomActionsSection />
        </div>
      </aside>

      {/* Mobile sidebar - with safe areas */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[280px] sm:w-72 border-r border-sidebar-border flex flex-col transition-transform duration-300 ease-out lg:hidden safe-top safe-bottom",
          mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        )}
        style={{ backgroundColor: "hsl(var(--sidebar-background))" }}
      >
        {/* Logo */}
        <div className="flex h-16 sm:h-20 items-center gap-3 px-3 sm:px-4 border-b border-sidebar-border">
          <div className="flex h-10 w-10 sm:h-14 sm:w-14 items-center justify-center rounded-xl bg-white shadow-sm overflow-hidden flex-shrink-0">
            <img src={agencyLogo} alt="AMG Logo" className="w-full h-full object-contain p-1" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-sm sm:text-base font-bold text-sidebar-foreground truncate">AMG HO.RE.CA</h1>
            <p className="text-xs sm:text-body-sm text-muted-foreground truncate">Business & Strategy</p>
          </div>
          <button
            className="text-sidebar-foreground h-9 w-9 flex items-center justify-center rounded-lg hover:bg-sidebar-accent"
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

        <BottomActionsSection />
      </aside>
    </>
  );
}
