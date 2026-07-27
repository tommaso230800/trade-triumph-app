import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, ShoppingCart, Wallet, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

type BottomNavItem = {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

const items: BottomNavItem[] = [
  { name: "Home", href: "/", icon: LayoutDashboard },
  { name: "Clienti", href: "/clienti", icon: Users },
  { name: "Ordini", href: "/ordini", icon: ShoppingCart },
  { name: "Provv.", href: "/provvigioni", icon: Wallet },
];

interface BottomNavProps {
  onOpenMore: () => void;
  moreActive: boolean;
}

/**
 * Navigazione inferiore per smartphone: le 4 sezioni più usate raggiungibili
 * con un solo tocco, più un pulsante "Altro" che apre il drawer completo
 * (Sidebar) per tutto il resto. Sostituisce l'hamburger-only su mobile.
 */
export function BottomNav({ onOpenMore, moreActive }: BottomNavProps) {
  const location = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex items-stretch justify-around border-t border-border bg-card/95 backdrop-blur-md safe-bottom lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {items.map((item) => {
        const isActive = location.pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.name}
            to={item.href}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium touch-target",
              isActive ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Icon className="h-5 w-5" />
            <span>{item.name}</span>
          </Link>
        );
      })}
      <button
        onClick={onOpenMore}
        className={cn(
          "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium touch-target",
          moreActive ? "text-primary" : "text-muted-foreground"
        )}
      >
        <Menu className="h-5 w-5" />
        <span>Altro</span>
      </button>
    </nav>
  );
}
