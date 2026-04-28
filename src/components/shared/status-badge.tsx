import { cn } from "@/lib/utils";
import type { TaskStatus, DatasetStatus, ServiceStatus } from "@/lib/types";

type Status = TaskStatus | DatasetStatus | ServiceStatus;

const STYLES: Record<string, string> = {
  // Task
  pending: "bg-warning/15 text-warning border-warning/30",
  running: "bg-info/15 text-info border-info/30",
  success: "bg-success/15 text-success border-success/30",
  failed: "bg-destructive/15 text-destructive border-destructive/30",
  // Dataset
  collected: "bg-muted text-muted-foreground border-border",
  analyzing: "bg-info/15 text-info border-info/30",
  analyzed: "bg-accent/15 text-accent border-accent/30",
  published: "bg-primary/15 text-primary border-primary/30",
  // Service
  online: "bg-success/15 text-success border-success/30",
  degraded: "bg-warning/15 text-warning border-warning/30",
  offline: "bg-destructive/15 text-destructive border-destructive/30",
};

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  const isLive = status === "running" || status === "online" || status === "analyzing";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-display text-[10px] font-medium uppercase tracking-wider",
        STYLES[status] ?? "bg-muted text-muted-foreground border-border",
        className,
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full bg-current",
          isLive && "pulse-dot",
        )}
      />
      {status}
    </span>
  );
}
