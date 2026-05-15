import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/**
 * Discreet banner that appears only when the device goes offline.
 * Cached data keeps working — banner just informs the user.
 */
export function OfflineBanner() {
  const [online, setOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-[100] bg-warning/95 text-warning-foreground text-xs sm:text-sm py-1.5 px-3 text-center font-medium shadow-md backdrop-blur flex items-center justify-center gap-2">
      <WifiOff className="h-3.5 w-3.5" />
      Modalità offline — stai vedendo i dati salvati
    </div>
  );
}
