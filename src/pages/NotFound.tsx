import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background p-6">
      <div className="max-w-sm space-y-3 text-center">
        <Compass className="mx-auto h-6 w-6 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Pagina non trovata</h1>
        <p className="text-sm text-muted-foreground">
          Il collegamento potrebbe essere vecchio o la pagina è stata spostata.
        </p>
        <Button asChild>
          <Link to="/">Torna alla Home</Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
