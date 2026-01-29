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
    color: "bg-green-500",
    bgClass: "bg-green-500/10 text-green-600 border-green-500/30",
    emoji: "🟢",
  },
  giallo: {
    icon: Minus,
    color: "bg-amber-500",
    bgClass: "bg-amber-500/10 text-amber-600 border-amber-500/30",
    emoji: "🟡",
  },
  rosso: {
    icon: TrendingDown,
    color: "bg-red-500",
    bgClass: "bg-red-500/10 text-red-600 border-red-500/30",
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
    <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600">
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
