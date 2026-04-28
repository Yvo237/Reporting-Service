import { motion } from "framer-motion";
import { TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  delta,
  unit,
  icon: Icon,
  accent = "primary",
  index = 0,
}: {
  label: string;
  value: string | number;
  delta?: number;
  unit?: string;
  icon?: LucideIcon;
  accent?: "primary" | "accent" | "warning";
  index?: number;
}) {
  const positive = (delta ?? 0) >= 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="group relative overflow-hidden rounded-xl border bg-card p-5 shadow-elevated"
    >
      <div
        className={cn(
          "pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full blur-3xl opacity-40 transition-opacity group-hover:opacity-70",
          accent === "primary" && "bg-primary/30",
          accent === "accent" && "bg-accent/30",
          accent === "warning" && "bg-warning/30",
        )}
      />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="mt-3 font-display text-3xl font-semibold tracking-tight">
            {value}
            {unit && <span className="ml-1 text-base text-muted-foreground">{unit}</span>}
          </p>
        </div>
        {Icon && (
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg border",
              accent === "primary" && "border-primary/30 bg-primary/10 text-primary",
              accent === "accent" && "border-accent/30 bg-accent/10 text-accent",
              accent === "warning" && "border-warning/30 bg-warning/10 text-warning",
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      {typeof delta === "number" && (
        <div className="relative mt-4 flex items-center gap-1.5 text-xs">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-medium",
              positive ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive",
            )}
          >
            {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {positive ? "+" : ""}
            {delta}%
          </span>
          <span className="text-muted-foreground">vs last 7d</span>
        </div>
      )}
    </motion.div>
  );
}
