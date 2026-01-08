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
    if (!change) return <Minus className="h-3 w-3" />;
    if (change > 0) return <TrendingUp className="h-3 w-3" />;
    return <TrendingDown className="h-3 w-3" />;
  };

  const getTrendColor = () => {
    if (!change) return "text-muted-foreground";
    if (change > 0) return "text-success";
    return "text-destructive";
  };

  const iconBgVariants = {
    default: "bg-muted",
    primary: "gradient-primary",
    success: "gradient-success",
    warning: "bg-warning",
  };

  const iconColorVariants = {
    default: "text-muted-foreground",
    primary: "text-primary-foreground",
    success: "text-success-foreground",
    warning: "text-warning-foreground",
  };

  return (
    <div className="group relative overflow-hidden rounded-xl bg-card p-6 shadow-card transition-all duration-300 hover:shadow-card-hover animate-fade-in">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold tracking-tight text-card-foreground">
            {value}
          </p>
          {change !== undefined && (
            <div className={cn("flex items-center gap-1 text-xs font-medium", getTrendColor())}>
              {getTrendIcon()}
              <span>{change > 0 ? "+" : ""}{change}%</span>
              {changeLabel && <span className="text-muted-foreground">{changeLabel}</span>}
            </div>
          )}
        </div>
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110",
            iconBgVariants[variant],
            iconColorVariants[variant]
          )}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
