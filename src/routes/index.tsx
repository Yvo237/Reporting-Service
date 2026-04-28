import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import {
  Activity,
  ArrowUpRight,
  Brain,
  CheckCircle2,
  Database,
  FlaskConical,
  Server,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MetricCard } from "@/components/shared/metric-card";
import { LiveLogStream } from "@/components/shared/live-log-stream";
import { StatusBadge } from "@/components/shared/status-badge";
import { collectionApi } from "@/lib/api-client";
import { ANALYSIS_LABELS } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Overview · Helix" },
      {
        name: "description",
        content:
          "Live overview of ML pipelines, dataset throughput, model accuracy, and service health.",
      },
    ],
  }),
  component: Overview,
});

// Données réelles seront récupérées via API

function Overview() {
  const [userId] = useState("test_user");
  
  const { data: healthData = {}, isLoading: servicesLoading } = useQuery({
    queryKey: ["service-health"],
    queryFn: collectionApi.getServiceHealth,
    refetchInterval: 15000,
  });

  const services = healthData?.services || [];

  const { data: datasets = [], isLoading: datasetsLoading } = useQuery({
    queryKey: ["datasets", userId],
    queryFn: () => collectionApi.getDatasets(userId),
    refetchInterval: 30000,
  });

  const { data: analyses = [], isLoading: analysesLoading } = useQuery({
    queryKey: ["analyses", userId],
    queryFn: () => collectionApi.getHistory(userId),
    refetchInterval: 30000,
  });

  const { data: throughput = [], isLoading: throughputLoading } = useQuery({
    queryKey: ["throughput-metrics"],
    queryFn: collectionApi.getThroughputMetrics,
    refetchInterval: 60000, // Rafraîchir toutes les minutes
  });

  const { data: accuracySeries = [], isLoading: accuracyLoading } = useQuery({
    queryKey: ["accuracy-metrics"],
    queryFn: collectionApi.getAccuracyMetrics,
    refetchInterval: 300000, // Rafraîchir toutes les 5 minutes
  });

  if (servicesLoading || datasetsLoading || analysesLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Chargement du tableau de bord...</div>
        </div>
      </div>
    );
  }

  const onlineServices = services.filter((s: any) => s.status === "online").length;
  const totalRows = datasets.reduce((sum: number, d: any) => sum + (d.rows || 0), 0);
  const recentAnalyses = analyses.slice(0, 5);

  return (
    <div className="space-y-6 p-6">
      {/* Hero strip */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border bg-card/70 p-6 shadow-elevated"
      >
        <div className="grid-bg pointer-events-none absolute inset-0 opacity-50" />
        <div className="bg-gradient-glow pointer-events-none absolute inset-0" />
        <div className="relative flex flex-col items-start justify-between gap-5 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2 font-display text-[10px] uppercase tracking-[0.2em] text-primary">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-success pulse-dot text-success" />
              Operational · region eu-west-2
            </div>
            <h2 className="mt-2 max-w-xl font-display text-2xl font-semibold tracking-tight md:text-3xl">
              Your ML control plane is{" "}
              <span className="text-gradient-primary">running smooth</span>.
            </h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              {onlineServices} microservices online · {totalRows.toLocaleString()} rows ingested · {analyses.length} analyses completed.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/data"
              className="inline-flex items-center gap-2 rounded-md border bg-background px-3.5 py-2 text-sm font-medium hover:bg-accent/10"
            >
              <Database className="h-4 w-4" />
              Data Hub
            </Link>
            <Link
              to="/workbench"
              className="inline-flex items-center gap-2 rounded-md bg-gradient-primary px-3.5 py-2 text-sm font-medium text-primary-foreground shadow-glow hover:opacity-90"
            >
              <FlaskConical className="h-4 w-4" />
              Open Workbench
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </motion.section>

      {/* KPI grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Datasets ingested" value="1,284" delta={12} icon={Database} index={0} />
        <MetricCard
          label="Analyses (24h)"
          value="312"
          delta={8}
          icon={Brain}
          accent="accent"
          index={1}
        />
        <MetricCard label="Avg accuracy" value="0.89" delta={3} icon={Zap} index={2} />
        <MetricCard
          label="Active workers"
          value="14 / 16"
          delta={-2}
          icon={Server}
          accent="warning"
          index={3}
        />
      </div>

      {/* Charts + Logs */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border bg-card p-5 lg:col-span-2"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-display text-xs uppercase tracking-wider text-muted-foreground">
                Pipeline throughput · 24h
              </p>
              <h3 className="mt-1 font-display text-lg font-semibold">
                Ingest vs analyses per hour
              </h3>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-primary" />
                Ingest
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-accent" />
                Analyses
              </span>
            </div>
          </div>
          <div className="mt-4 h-64">
            <ResponsiveContainer>
              <AreaChart data={throughput}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.72 0.18 240)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="oklch(0.72 0.18 240)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.72 0.16 162)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="oklch(0.72 0.16 162)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="oklch(1 0 0 / 0.05)" vertical={false} />
                <XAxis dataKey="hour" stroke="oklch(0.68 0.015 256)" fontSize={11} tickLine={false} />
                <YAxis stroke="oklch(0.68 0.015 256)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.205 0.014 256)",
                    border: "1px solid oklch(0.28 0.016 256)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="ingest"
                  stroke="oklch(0.72 0.18 240)"
                  strokeWidth={2}
                  fill="url(#g1)"
                />
                <Area
                  type="monotone"
                  dataKey="analyses"
                  stroke="oklch(0.72 0.16 162)"
                  strokeWidth={2}
                  fill="url(#g2)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-xl border bg-card p-5"
        >
          <p className="font-display text-xs uppercase tracking-wider text-muted-foreground">
            Model accuracy · 14d
          </p>
          <h3 className="mt-1 font-display text-lg font-semibold">Above baseline trend</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer>
              <LineChart data={accuracySeries}>
                <CartesianGrid stroke="oklch(1 0 0 / 0.05)" vertical={false} />
                <XAxis dataKey="day" stroke="oklch(0.68 0.015 256)" fontSize={11} tickLine={false} />
                <YAxis
                  domain={[0.6, 1]}
                  stroke="oklch(0.68 0.015 256)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.205 0.014 256)",
                    border: "1px solid oklch(0.28 0.016 256)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="baseline"
                  stroke="oklch(0.68 0.015 256)"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="accuracy"
                  stroke="oklch(0.72 0.18 240)"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "oklch(0.72 0.18 240)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <LiveLogStream height={340} />
        </div>

        <div className="rounded-xl border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <p className="font-display text-xs font-medium uppercase tracking-wider">
              Recent runs
            </p>
            <Link to="/workbench" className="text-xs text-primary hover:underline">
              View all
            </Link>
          </div>
          <ul className="divide-y">
            {recentAnalyses.length === 0 ? (
              <li className="flex items-center justify-center px-4 py-8 text-muted-foreground">
                Aucune analyse récente
              </li>
            ) : (
              recentAnalyses.map((a: any) => (
                <li key={a.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md border bg-muted text-muted-foreground">
                    <Brain className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{a.analysis_type || 'Analyse'}</p>
                    <p className="truncate text-xs text-muted-foreground">{a.name}</p>
                  </div>
                  <StatusBadge status={a.status || 'success'} />
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      {/* Health snapshot */}
      <div className="rounded-xl border bg-card">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <p className="font-display text-xs font-medium uppercase tracking-wider">
              Service snapshot
            </p>
          </div>
          <Link to="/health" className="text-xs text-primary hover:underline">
            Open monitor
          </Link>
        </div>
        <div className="grid grid-cols-2 divide-y border-t md:grid-cols-3 md:divide-y-0 lg:grid-cols-6">
          {services.length === 0 ? (
            <div className="col-span-full flex items-center justify-center p-8 text-muted-foreground">
              Aucun service disponible
            </div>
          ) : (
            services.map((s: any, i: number) => (
              <div
                key={s.name}
                className={`flex items-center gap-3 p-4 ${i > 0 ? "md:border-l" : ""}`}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-md border bg-muted">
                  {s.status === "online" ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : (
                    <Activity className="h-4 w-4 text-warning" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium">{s.name}</p>
                  <p className="font-display text-[10px] uppercase text-muted-foreground">
                    {s.latencyMs}ms · {s.uptime}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Datasets quick row */}
      <div className="rounded-xl border bg-card">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <p className="font-display text-xs font-medium uppercase tracking-wider">
            Latest datasets
          </p>
          <Link to="/data" className="text-xs text-primary hover:underline">
            Manage data
          </Link>
        </div>
        <ul className="divide-y">
          {datasets.length === 0 ? (
            <li className="flex items-center justify-center px-5 py-8 text-muted-foreground">
              Aucun dataset disponible
            </li>
          ) : (
            datasets.slice(0, 4).map((d: any) => (
              <li key={d.id} className="flex items-center gap-4 px-5 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-md border bg-muted">
                  <Database className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{d.name}</p>
                  <p className="font-display text-[10px] uppercase tracking-wider text-muted-foreground">
                    {(d.rows || 0).toLocaleString()} rows · {(d.columns || []).length} cols · {d.owner}
                  </p>
                </div>
                <StatusBadge status={d.status || 'raw'} />
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
