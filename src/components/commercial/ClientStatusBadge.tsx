import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangle, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { ClientStatusSemaforo } from "@/hooks/useClientStatus";
import { cn } from "@/lib/utils";

interface ClientStatusBadgeProps {
  semaforo: ClientStatusSemaforo;
  label?: string;
  descrizione?: string;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
}

const semaforoConfig = {
  verde: {
    icon: TrendingUp,
    color: "bg-success",
    bgClass: "bg-success/10 text-success border-success/30",
    emoji: "🟢",
  },
  giallo: {
    icon: Minus,
    color: "bg-warning",
    bgClass: "bg-warning/10 text-warning border-warning/30",
    emoji: "🟡",
  },
  rosso: {
    icon: TrendingDown,
    color: "bg-destructive",
    bgClass: "bg-destructive/10 text-destructive border-destructive/30",
    emoji: "🔴",
  },
};

export function ClientStatusBadge({
  semaforo,
  label,
  descrizione,
  size = "md",
  showIcon = true,
}: ClientStatusBadgeProps) {
  const config = semaforoConfig[semaforo];
  const Icon = config.icon;

  const badge = (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5",
        config.bgClass,
        size === "sm" && "text-xs py-0.5 px-2",
        size === "lg" && "text-sm py-1.5 px-3"
      )}
    >
      {showIcon && (
        <span className="text-base leading-none">{config.emoji}</span>
      )}
      <span>{label || semaforo.toUpperCase()}</span>
    </Badge>
  );

  if (!descrizione) return badge;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{badge}</TooltipTrigger>
      <TooltipContent>
        <p>{descrizione}</p>
      </TooltipContent>
    </Tooltip>
  );
}

interface RiskAlertProps {
  allarmeRischio: boolean;
  motiviRischio: string[];
}

export function RiskAlert({ allarmeRischio, motiviRischio }: RiskAlertProps) {
  if (!allarmeRischio) return null;

  return (
    <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive">
      <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
      <div>
        <p className="font-semibold text-sm">⚠️ Cliente a rischio perdita</p>
        <ul className="text-xs mt-1 space-y-0.5">
          {motiviRischio.map((motivo, i) => (
            <li key={i}>• {motivo}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
