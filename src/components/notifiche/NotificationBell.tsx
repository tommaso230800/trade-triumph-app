import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { useNotificheRealtime, useUnreadCount } from "@/hooks/useNotifiche";
import { refreshDeviceRegistration } from "@/lib/webPush";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

// Ultimo account per cui questo dispositivo è stato collegato alle notifiche.
let deviceLinkedTo: string | null = null;

export function NotificationBell({ className }: { className?: string }) {
  const { data: unread = 0 } = useUnreadCount();
  const navigate = useNavigate();
  const { user } = useAuth();
  useNotificheRealtime();

  // A ogni cambio di account il dispositivo viene ricollegato a chi è entrato,
  // così le notifiche personali (promemoria) arrivano solo al proprietario.
  useEffect(() => {
    if (!user?.id || deviceLinkedTo === user.id) return;
    deviceLinkedTo = user.id;
    void refreshDeviceRegistration();
  }, [user?.id]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    // Fallback when the system cannot navigate the open app window directly.
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type !== "amg-open" || typeof e.data.url !== "string") return;
      const url = new URL(e.data.url);
      if (url.origin === window.location.origin) navigate(url.pathname + url.search);
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [navigate]);

  const label = unread > 0 ? `Centro notifiche, ${unread} non lette` : "Centro notifiche";
  return (
    <Link
      to="/notifiche"
      aria-label={label}
      title={label}
      className={cn("relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-input bg-background text-foreground transition-colors duration-150 hover:bg-accent", className)}
    >
      <Bell className="h-5 w-5" />
      {unread > 0 && (
        <span className="absolute -right-1.5 -top-1.5 min-w-5 rounded-full bg-destructive px-1.5 py-0.5 text-center text-xs font-semibold leading-none text-destructive-foreground tabular-nums">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}
