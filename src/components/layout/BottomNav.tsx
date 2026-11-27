import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, ShoppingCart, Wallet, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { QuickActions } from "./QuickActions";
import { Button } from "@/components/ui/button";
import { SlidingThumb, useSlidingThumb } from "@/components/ui/moments";

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
  // "Tab Bar": la pillola della sezione attiva scorre fino alla nuova.
  const { listRef, thumbRef } = useSlidingThumb<HTMLElement>('[aria-current="page"] [data-tab-pill]', "bottom-nav");

  return (
    <nav
      ref={listRef}
      className="fixed bottom-0 left-0 right-0 z-40 flex items-stretch justify-around border-t border-border bg-card/95 backdrop-blur-md safe-bottom lg:hidden print:hidden"
    >
      <SlidingThumb ref={thumbRef} />
      {items.map((item) => {
        const isActive = item.href === "/" ? location.pathname === "/" : location.pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.name}
            to={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium touch-target",
              isActive ? "text-primary" : "text-muted-foreground"
            )}
          >
            <span data-tab-pill className={cn("flex h-7 w-12 items-center justify-center rounded-full", isActive && "bg-primary/10")}>
              <Icon className="h-5 w-5" />
            </span>
            <span>{item.name}</span>
          </Link>
        );
      })}
      <QuickActions compact />
      <Button variant="ghost"
        onClick={onOpenMore}
        className={cn(
          "relative flex h-auto flex-1 flex-col items-center justify-center gap-0.5 rounded-none py-2 text-xs font-medium touch-target hover:bg-transparent",
          moreActive ? "text-primary" : "text-muted-foreground"
        )}
        aria-label="Altre sezioni"
        aria-current={moreActive ? "page" : undefined}
      >
        <span data-tab-pill className={cn("flex h-7 w-12 items-center justify-center rounded-full", moreActive && "bg-primary/10")}>
          <Menu className="h-5 w-5" />
        </span>
        <span>Altro</span>
      </Button>
    </nav>
  );
}
