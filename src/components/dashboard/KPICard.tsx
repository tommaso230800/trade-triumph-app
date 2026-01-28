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
    primary: "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25",
    success: "bg-gradient-to-br from-success to-success/80 text-success-foreground shadow-lg shadow-success/25",
    warning: "bg-gradient-to-br from-warning to-warning/80 text-warning-foreground shadow-lg shadow-warning/25",
  };

  const cardStyles = {
    default: "border-border/50",
    primary: "border-primary/20 bg-gradient-to-br from-card to-primary/5",
    success: "border-success/20 bg-gradient-to-br from-card to-success/5",
    warning: "border-warning/20 bg-gradient-to-br from-card to-warning/5",
  };

  return (
    <div className={cn(
      "group relative overflow-hidden rounded-2xl bg-card p-5 lg:p-6 border shadow-sm transition-all duration-300 ease-smooth hover:shadow-md hover:-translate-y-0.5",
      cardStyles[variant]
    )}>
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/[0.02] pointer-events-none" />
      
      <div className="relative flex items-start justify-between gap-3">
        <div className="space-y-2 min-w-0 flex-1">
          <p className="text-xs lg:text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl lg:text-3xl font-bold tracking-tight text-card-foreground">
            {value}
          </p>
          {change !== undefined && (
            <div className={cn("flex items-center gap-1.5 text-xs font-medium flex-wrap", getTrendColor())}>
              <span className="flex items-center gap-1 bg-current/10 rounded-full px-2 py-0.5">
                {getTrendIcon()}
                <span>{change > 0 ? "+" : ""}{change}%</span>
              </span>
              {changeLabel && <span className="text-muted-foreground hidden sm:inline">{changeLabel}</span>}
            </div>
          )}
        </div>
        <div
          className={cn(
            "flex h-11 w-11 lg:h-12 lg:w-12 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105 flex-shrink-0",
            iconContainerStyles[variant]
          )}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
