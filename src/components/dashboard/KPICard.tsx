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
    <div className="group relative overflow-hidden rounded-xl bg-card p-4 lg:p-6 shadow-card transition-all duration-300 ease-smooth hover:shadow-card-hover hover:-translate-y-0.5 animate-fade-in animate-fill-both">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 lg:space-y-2 min-w-0">
          <p className="text-body-sm lg:text-body-md font-medium text-muted-foreground truncate">{title}</p>
          <p className="font-display text-display-sm lg:text-display-md tracking-tight text-card-foreground truncate">
            {value}
          </p>
          {change !== undefined && (
            <div className={cn("flex items-center gap-1 text-body-sm font-medium flex-wrap transition-colors", getTrendColor())}>
              <span className="transition-transform duration-200 group-hover:scale-110">{getTrendIcon()}</span>
              <span>{change > 0 ? "+" : ""}{change}%</span>
              {changeLabel && <span className="text-muted-foreground hidden sm:inline">{changeLabel}</span>}
            </div>
          )}
        </div>
        <div
          className={cn(
            "flex h-10 w-10 lg:h-12 lg:w-12 items-center justify-center rounded-xl transition-all duration-300 ease-spring group-hover:scale-110 group-hover:shadow-md flex-shrink-0",
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