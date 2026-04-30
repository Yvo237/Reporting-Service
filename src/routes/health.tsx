import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { Activity, Cpu, Database, HardDrive, Server, Wifi } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { LiveLogStream } from "@/components/shared/live-log-stream";
import { StatusBadge } from "@/components/shared/status-badge";
import { collectionApi } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/health")({
  head: () => ({
    meta: [
      { title: "System Health · Helix" },
      {
        name: "description",
        content: "Microservices and infrastructure telemetry — uptime, latency, CPU, memory.",
      },
    ],
  }),
  component: Health,
});

const ICONS = {
  "Analysis Service": Activity,
  "Collection Service": Database,
  "Notification Service": Server,
  "Nginx Gateway": Wifi,
  "PostgreSQL 16": HardDrive,
  "Redis 7": Cpu,
} as const;

function Health() {
  const [selectedLogId, setSelectedLogId] = useState<number | undefined>(undefined);

  const { data: healthData, isLoading, error } = useQuery({
    queryKey: ["service-health"],
    queryFn: collectionApi.getServiceHealth,
    refetchInterval: 15000,
  });

  const { data: analyses = [] } = useQuery({
    queryKey: ["analyses", "test_user"],
    queryFn: () => collectionApi.getHistory("test_user"),
  });

  const services = healthData?.services || [];

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Chargement de l'état de santé...</div>
        </div>
      </div>
    );
  }

  if (error || !services) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-destructive">Erreur lors du chargement de l'état de santé</div>
        </div>
      </div>
    );
  }

  const onlineCount = services.filter((s) => s.status === "online").length;
  const systemStatus = healthData?.status || "unknown";
  const systemMetrics = healthData?.system || {};

  return (
    <div className="space-y-6 p-6">
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border bg-card p-6"
      >
        <div className="bg-gradient-glow pointer-events-none absolute inset-0" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-display text-[10px] uppercase tracking-[0.2em] text-primary">
              Cluster status
            </p>
            <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight">
              {onlineCount} / {services.length} components{" "}
              <span className={systemStatus === "online" ? "text-success" : systemStatus === "degraded" ? "text-warning" : "text-destructive"}>
                {systemStatus}
              </span>
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Aggregated from Prometheus · refreshed every 15s
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Stat label="CPU" value={`${Math.round(systemMetrics.cpu || 0)}%`} />
            <Stat label="Memory" value={`${Math.round(systemMetrics.memory || 0)}%`} />
            <Stat label="Disk" value={`${Math.round(systemMetrics.disk || 0)}%`} />
          </div>
        </div>
      </motion.section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {services.map((s, i) => {
          const Icon = ICONS[s.name as keyof typeof ICONS] ?? Server;
          return (
            <motion.article
              key={s.name}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="group relative overflow-hidden rounded-xl border bg-card p-5 transition-colors hover:border-primary/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-lg border",
                      s.status === "online"
                        ? "border-success/30 bg-success/10 text-success"
                        : s.status === "degraded"
                          ? "border-warning/30 bg-warning/10 text-warning"
                          : "border-destructive/30 bg-destructive/10 text-destructive",
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-display text-sm font-semibold">{s.name}</p>
                    <p className="font-display text-[10px] uppercase tracking-wider text-muted-foreground">
                      {s.kind} · uptime {s.uptime}
                    </p>
                  </div>
                </div>
                <StatusBadge status={s.status} />
              </div>

              <p className="mt-3 text-xs text-muted-foreground">{s.description}</p>

              <div className="mt-4 grid grid-cols-3 gap-3">
                <Mini label="Latency" value={`${s.latencyMs}ms`} />
                <Mini label="CPU" value={`${s.cpu}%`} pct={s.cpu} />
                <Mini label="Memory" value={`${s.memory}%`} pct={s.memory} accent />
              </div>
            </motion.article>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <LiveLogStream height={300} recordId={selectedLogId} />
        </div>
        <div className="rounded-xl border bg-card p-5">
          <h3 className="font-display text-xs font-medium uppercase tracking-wider mb-4">
            Select Analysis Log
          </h3>
          <div className="space-y-2 max-h-[240px] overflow-y-auto pr-2">
            {analyses.length === 0 ? (
              <p className="text-xs text-muted-foreground">No analyses found</p>
            ) : (
              analyses.map((a: any) => (
                <div 
                  key={a.id}
                  onClick={() => setSelectedLogId(a.id)}
                  className={cn(
                    "p-2 rounded border cursor-pointer text-xs transition-colors hover:bg-muted",
                    selectedLogId === a.id ? "border-primary bg-primary/5" : "border-border"
                  )}
                >
                  <div className="font-medium truncate">{a.analysis_type}</div>
                  <div className="text-muted-foreground truncate">{a.name}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background/40 p-3 text-center">
      <p className="font-display text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-display text-xl font-semibold">{value}</p>
    </div>
  );
}

function Mini({
  label,
  value,
  pct,
  accent,
}: {
  label: string;
  value: string;
  pct?: number;
  accent?: boolean;
}) {
  return (
    <div className="rounded-md border bg-background/40 p-2.5">
      <p className="font-display text-[9px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 font-display text-sm font-semibold",
          accent ? "text-accent" : "text-foreground",
        )}
      >
        {value}
      </p>
      {typeof pct === "number" && <Progress value={pct} className="mt-1.5 h-1" />}
    </div>
  );
}
