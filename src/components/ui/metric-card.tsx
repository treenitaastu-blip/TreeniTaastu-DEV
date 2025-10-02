// src/components/ui/metric-card.tsx
import React from "react";
import { cn } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

export type MetricTrend = "up" | "down" | "neutral";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  /** Visual hint. Does not change value; purely presentational. */
  trend?: MetricTrend;
  /** Optional icon element rendered on the right (e.g. <BarChart3 className="h-5 w-5" />) */
  icon?: React.ReactNode;
  /** When true, shows a subtle skeleton/shimmer instead of the value. */
  isLoading?: boolean;
  className?: string;
  /** Optional aria-label for the value, if the string/number alone isn't descriptive enough. */
  valueLabel?: string;
}

const trendStyles: Record<MetricTrend, string> = {
  up: "text-emerald-700 bg-emerald-50 dark:text-emerald-300/90 dark:bg-emerald-900/30",
  down: "text-rose-700 bg-rose-50 dark:text-rose-300/90 dark:bg-rose-900/30",
  neutral: "text-slate-600 bg-slate-50 dark:text-slate-300/90 dark:bg-slate-900/30",
};

const TrendGlyph: React.FC<{ trend: MetricTrend; className?: string }> = ({
  trend,
  className,
}) => {
  if (trend === "up") return <ArrowUpRight className={cn("h-3.5 w-3.5", className)} />;
  if (trend === "down") return <ArrowDownRight className={cn("h-3.5 w-3.5", className)} />;
  return <Minus className={cn("h-3.5 w-3.5", className)} />;
};

export function MetricCard({
  title,
  value,
  subtitle,
  trend = "neutral",
  icon,
  isLoading = false,
  className,
  valueLabel,
}: MetricCardProps) {
  return (
    <section
      className={cn(
        "rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md",
        "border-black/10 dark:border-white/10",
        className
      )}
      aria-busy={isLoading ? true : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>

          <div className="mt-1.5 flex items-center gap-2">
            {/* Value / skeleton */}
            <div
              className={cn(
                "tabular-nums text-2xl font-bold",
                isLoading && "inline-block h-7 w-24 animate-pulse rounded bg-muted"
              )}
              aria-live="polite"
              aria-label={valueLabel}
            >
              {!isLoading ? value : <span className="sr-only">Laen väärtust…</span>}
            </div>

            {/* Trend pill (hidden while loading) */}
            {!isLoading && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                  trendStyles[trend]
                )}
                title={
                  trend === "up"
                    ? "Positiivne trend"
                    : trend === "down"
                    ? "Negatiivne trend"
                    : "Neutraalne trend"
                }
              >
                <TrendGlyph trend={trend} />
                <span className="capitalize">
                  {trend === "up" ? "tõus" : trend === "down" ? "langus" : "neutraalne"}
                </span>
              </span>
            )}
          </div>

          {subtitle && (
            <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>

        {icon && <div className="shrink-0 text-muted-foreground">{icon}</div>}
      </div>
    </section>
  );
}
