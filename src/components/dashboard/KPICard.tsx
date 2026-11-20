import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: ReactNode;
  variant?: "default" | "primary" | "success" | "warning";
}

export function KPICard({
  title,
  value,
  change,
  changeLabel,
  icon,
  variant = "default",
}: KPICardProps) {
  const getTrendIcon = () => {
    if (change === undefined || change === null) return null;
    if (change === 0) return <Minus className="h-3 w-3" />;
    if (change > 0) return <TrendingUp className="h-3 w-3" />;
    return <TrendingDown className="h-3 w-3" />;
  };

  const getTrendColor = () => {
    if (change === undefined || change === null || change === 0) return "text-muted-foreground";
    if (change > 0) return "text-success";
    return "text-destructive";
  };

  const iconContainerStyles = {
    default: "bg-muted text-muted-foreground",
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
  };

  const cardStyles = {
    default: "border-border/50",
    primary: "border-border",
    success: "border-border",
    warning: "border-border",
  };

  return (
    <div className={cn(
      "relative min-w-0 overflow-hidden rounded-xl border bg-card p-4 shadow-card lg:p-6",
      cardStyles[variant]
    )}>
      
      <div className="relative flex items-start justify-between gap-3">
        <div className="space-y-2 min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold tracking-tight tabular-nums text-card-foreground">
            {value}
          </p>
          {change !== undefined && (
            <div className={cn("flex items-center gap-2 text-xs font-medium flex-wrap", getTrendColor())}>
              <span className="flex items-center gap-1">
                {getTrendIcon()}
                <span className="tabular-nums">{change > 0 ? "+" : ""}{change.toLocaleString("it-IT")}%</span>
              </span>
              {changeLabel && <span className="text-muted-foreground hidden sm:inline">{changeLabel}</span>}
            </div>
          )}
        </div>
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0",
            iconContainerStyles[variant]
          )}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
