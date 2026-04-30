import { useState, useMemo, useEffect, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Brain, CheckCircle2, Database, Download, FlaskConical, History, Layout, Loader2, Play, Search, Target, Trash2 } from "lucide-react";
import { logStreamClient } from "../lib/api-client";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { LiveLogStream } from "@/components/shared/live-log-stream";
import { StatusBadge } from "@/components/shared/status-badge";
import { collectionApi } from "@/lib/api-client";
import {
  makeClusters,
  makeClassDistribution,
  makeFeatureImportance,
  makeHistogram,
  makeRegressionPoints,
} from "@/lib/chart-utils";
import { ANALYSIS_LABELS, type AnalysisResult } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/workbench")({
  head: () => ({
    meta: [
      { title: "ML Workbench · Helix" },
      {
        name: "description",
        content: "Inspect ML runs, metrics, feature importance, and visualize results.",
      },
    ],
  }),
  component: Workbench,
});

const CHART_COLORS = [
  "#60a5fa",
  "#34d399",
  "#fbbf24",
  "#f472b6",
  "#a78bfa",
  "#22d3ee",
  "#fb923c",
  "#4ade80",
  "#e879f9",
  "#facc15",
];
const CLUSTER_COLORS = CHART_COLORS;

function MetricChip({
  label,
  value,
  hint,
  good,
}: {
  label: string;
  value: string;
  hint?: string;
  good?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-card/60 p-4">
      <p className="font-display text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-1.5 font-display text-2xl font-semibold tracking-tight",
          good && "text-success",
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Workbench() {
  const userId = "test_user";
  const { data: rawAnalyses = [], isLoading, refetch } = useQuery({
    queryKey: ["analysis-history", userId],
    queryFn: () => collectionApi.getHistory(userId),
    refetchInterval: (query) => {
      const data = query.state?.data as any[];
      return data?.some(a => a.status === 'processing') ? 3000 : 30000;
    },
  });

  const analyses = useMemo(() => {
    return rawAnalyses.filter((a: any) => a.analysis_type !== null && a.analysis_type !== undefined);
  }, [rawAnalyses]);

  const handleDeleteAnalysis = async (analysisId: number) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette analyse ?")) {
      try {
        await collectionApi.deleteAnalysis(analysisId);
        refetch();
        if (selectedId === analysisId) {
          setSelectedId(null);
        }
      } catch (error) {
        console.error("Erreur lors de la suppression:", error);
      }
    }
  };

  const [selectedId, setSelectedId] = useState<string | number | null>(null);

  const selected = useMemo(() => {
    if (selectedId === null && analyses.length > 0) return analyses[0];
    return analyses.find((a: any) => a.id === selectedId) || analyses[0];
  }, [selectedId, analyses]);

  const currentSelectedId = selected?.id;

  const { data: fullResult } = useQuery({
    queryKey: ["analysis-full-result", currentSelectedId],
    queryFn: () => currentSelectedId ? collectionApi.getFullResult(currentSelectedId) : null,
    enabled: !!currentSelectedId && (selected?.status === 'analyzed' || selected?.status === 'published' || selected?.status === 'premium'),
  });

  const chartData = fullResult || selected?.analysis_results;

  const nClusters = selected?.analysis_parameters?.n_clusters ?? 5;

  const clusters = useMemo(() => makeClusters(chartData, nClusters), [chartData, nClusters]);
  const reg = useMemo(() => makeRegressionPoints(chartData), [chartData]);
  const hist = useMemo(() => makeHistogram(chartData), [chartData]);
  const fi = useMemo(() => makeFeatureImportance(chartData), [chartData]);
  const classDistrib = useMemo(() => makeClassDistribution(chartData), [chartData]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (analyses.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center">
        <div>
          <Brain className="mx-auto h-12 w-12 text-muted-foreground opacity-20" />
          <h3 className="mt-4 text-lg font-medium">No analyses yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">Run your first analysis from the Data Hub.</p>
        </div>
      </div>
    );
  }


  return (
    <div className="grid grid-cols-1 gap-6 p-6 xl:grid-cols-[280px_1fr]">
      {/* Run list */}
      <aside className="rounded-xl border bg-card">
        <div className="border-b px-4 py-3">
          <p className="font-display text-xs font-medium uppercase tracking-wider">All runs</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {analyses.length} analyses · last 7 days
          </p>
        </div>
        <ul className="max-h-[640px] overflow-y-auto divide-y">
          {analyses.map((a: any) => {
            const active = a.id === currentSelectedId;
            return (
              <li key={a.id}>
                <div
                  onClick={() => setSelectedId(a.id)}
                  className={cn(
                    "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors cursor-pointer",
                    active ? "bg-primary/10" : "hover:bg-muted/40",
                  )}
                >
                  <div
                    className={cn(
                      "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border",
                      active ? "border-primary/40 bg-primary/15 text-primary" : "bg-muted",
                    )}
                  >
                    <Brain className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Database className="h-3.5 w-3.5 text-primary" />
                      <p className="truncate text-sm font-semibold text-foreground">{a.name || a.dataset_name}</p>
                    </div>
                    <p className="truncate text-[11px] text-muted-foreground mb-2">
                      {ANALYSIS_LABELS[a.analysis_type as keyof typeof ANALYSIS_LABELS] || a.analysis_type}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
                      <span>{a.row_count || 0} rows</span>
                      <span>{a.headers?.length || 0} cols</span>
                      <span>{a.file_size ? (a.file_size < 1024 ? `${a.file_size}B` : `${Math.round(a.file_size / 1024)}KB`) : '0B'}</span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between">
                      <StatusBadge status={a.status || 'success'} />
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(a.created_at || Date.now()).toLocaleDateString()}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteAnalysis(a.id);
                          }}
                          className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                          title="Supprimer l'analyse"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </aside>

      {/* Detail */}
      <section className="space-y-5">
        <motion.div
          key={selected.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border bg-card p-5"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2 font-display text-[10px] uppercase tracking-[0.18em] text-primary">
                <Database className="h-3 w-3" />
                Dataset: {selected.name || selected.dataset_name}
              </div>
              <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight">
                {ANALYSIS_LABELS[selected.analysis_type as keyof typeof ANALYSIS_LABELS] || selected.analysis_type}
              </h2>
              <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium">ID: {selected.id}</span>
                <span>·</span>
                <span>Created: {new Date(selected.created_at || Date.now()).toLocaleDateString()}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Features:{" "}
                {selected.parameters?.feature_columns?.join(", ") || selected.parameters?.x_columns?.join(", ") || "—"}
                {(selected.parameters?.target_column || selected.parameters?.y_column) && (
                  <>
                    {" · "}
                    <span className="text-accent font-medium">Target: {selected.parameters?.target_column || selected.parameters?.y_column}</span>
                  </>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={selected.status || 'success'} />
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => alert("Artifact download coming soon!")}
              >
                <Download className="h-3.5 w-3.5" />
                Artifact
              </Button>
              <Button
                size="sm"
                className="gap-1.5 bg-gradient-primary text-primary-foreground hover:opacity-90"
                onClick={() => alert("Model promotion coming soon!")}
              >
                <Target className="h-3.5 w-3.5" />
                Promote model
              </Button>
            </div>
          </div>

          {/* Dataset Information */}
          <div className="mt-5 rounded-lg border bg-muted/30 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Database className="h-4 w-4 text-primary" />
              <h3 className="font-display text-sm font-semibold text-foreground">
                {selected.name || selected.dataset_name}
              </h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Rows</p>
                <p className="font-medium">{selected.row_count || 0}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Columns</p>
                <p className="font-medium">{selected.headers?.length || 0}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Size</p>
                <p className="font-medium">{selected.file_size ? (selected.file_size < 1024 ? `${selected.file_size}B` : `${Math.round(selected.file_size / 1024)}KB`) : '0B'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Created</p>
                <p className="font-medium">{new Date(selected.created_at || Date.now()).toLocaleDateString()}</p>
              </div>
            </div>
            {selected.headers && selected.headers.length > 0 && (
              <div className="mt-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Columns</p>
                <div className="flex flex-wrap gap-1">
                  {selected.headers.slice(0, 8).map((col: string, idx: number) => (
                    <span key={idx} className="px-2 py-1 bg-background border text-[10px] rounded">
                      {col}
                    </span>
                  ))}
                  {selected.headers.length > 8 && (
                    <span className="px-2 py-1 bg-muted text-[10px] rounded">
                      +{selected.headers.length - 8} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {selected.analysis_results?.r_squared != null && (
              <>
                <MetricChip label="R²" value={selected.analysis_results.r_squared.toFixed(3)} good hint="goodness of fit" />
                <MetricChip label="MSE" value={selected.analysis_results.mse?.toFixed(1) || "—"} hint="mean squared error" />
                <MetricChip label="Features" value={String(selected.parameters?.feature_columns?.length || selected.parameters?.x_columns?.length || 0)} />
                <MetricChip label="Duration" value="—" />
              </>
            )}
            {selected.analysis_results?.accuracy != null && (
              <>
                <MetricChip label="Accuracy" value={`${(selected.analysis_results.accuracy * 100).toFixed(1)}%`} good />
                <MetricChip label="F1 Score" value={selected.analysis_results.f1_score?.toFixed(3) || "—"} />
                <MetricChip label="Precision" value={selected.analysis_results.precision?.toFixed(3) || "—"} />
                <MetricChip label="Recall" value={selected.analysis_results.recall?.toFixed(3) || "—"} />
              </>
            )}
            {(selected.analysis_type === "dimensionality/pca" || selected.analysis_type === "classification/unsupervised") && (
              <>
                <MetricChip label={selected.analysis_type === "dimensionality/pca" ? "Components" : "Clusters (k)"} value={String(selected.parameters?.n_clusters || selected.parameters?.n_components || 5)} good />
                <MetricChip
                  label="Silhouette"
                  value={selected.analysis_results?.silhouette_score?.toFixed(3) || "—"}
                  hint="higher is better"
                />
                <MetricChip
                  label="Inertia"
                  value={selected.analysis_results?.inertia?.toFixed(1) || "—"}
                  hint="WCSS"
                />
                <MetricChip label="Features" value={String(selected.parameters?.feature_columns?.length || selected.parameters?.x_columns?.length || "—")} />
              </>
            )}
          </div>
        </motion.div>

        <Tabs defaultValue="visual" className="space-y-4">
          <TabsList className="bg-card">
            <TabsTrigger value="visual">Visualization</TabsTrigger>
            <TabsTrigger value="features">Feature importance</TabsTrigger>
            <TabsTrigger value="distribution">Distribution</TabsTrigger>
            <TabsTrigger value="logs">Worker logs</TabsTrigger>
          </TabsList>

          <TabsContent value="visual" className="rounded-xl border bg-card p-5">
            <p className="font-display text-xs uppercase tracking-wider text-muted-foreground">
              {selected.analysis_type === "regression/linear"
                ? "Predicted vs actual"
                : selected.analysis_type === "dimensionality/pca" || selected.analysis_type === "classification/unsupervised"
                  ? "Cluster projection (PC1 × PC2)"
                  : selected.analysis_type === "classification/supervised"
                    ? "Predicted class distribution"
                    : "Decision surface"}
            </p>
            <div className="mt-3 h-80 relative">
              {selected.status !== 'analyzed' && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-card/60 backdrop-blur-[2px] rounded-lg border border-dashed">
                  <div className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-full mb-3",
                    selected.status === 'failed' ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
                  )}>
                    {selected.status === 'failed' ? <Trash2 className="h-6 w-6" /> : <Loader2 className="h-6 w-6 animate-spin" />}
                  </div>
                  <p className="font-display text-sm font-medium">
                    {selected.status === 'failed' ? "Analysis Failed" : "Analysis in Progress"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground max-w-[280px] text-center">
                    {selected.status === 'failed'
                      ? "Check the error details above or the worker logs for more information."
                      : "The background worker is currently processing your dataset. Visuals will appear shortly."}
                  </p>
                </div>
              )}
              <ResponsiveContainer>
                {selected.analysis_type === "regression/linear" ? (
                  <LineChart data={reg}>
                    <CartesianGrid stroke="rgba(255,255,255,0.12)" vertical={false} />
                    <XAxis dataKey="x" stroke="#94a3b8" tick={{ fill: "#cbd5e1", fontSize: 11 }} tickLine={false} />
                    <YAxis stroke="#94a3b8" tick={{ fill: "#cbd5e1", fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: "#0f172a",
                        border: "1px solid #60a5fa",
                        borderRadius: 8,
                        color: "#f1f5f9"
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, color: "#e2e8f0" }} />
                    <Line type="monotone" dataKey="actual" stroke="#60a5fa" strokeWidth={2.5} dot={{ r: 2, fill: "#60a5fa" }} />
                    <Line
                      type="monotone"
                      dataKey="predicted"
                      stroke="#fbbf24"
                      strokeWidth={2.5}
                      strokeDasharray="5 4"
                      dot={false}
                    />
                  </LineChart>
                ) : selected.analysis_type === "classification/supervised" ? (
                  <BarChart data={classDistrib} margin={{ top: 8, right: 16, left: 0, bottom: 40 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.12)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      stroke="#94a3b8"
                      tick={{ fill: "#cbd5e1", fontSize: 11 }}
                      tickLine={false}
                      angle={-35}
                      textAnchor="end"
                    />
                    <YAxis stroke="#94a3b8" tick={{ fill: "#cbd5e1", fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: "#0f172a",
                        border: "1px solid #60a5fa",
                        borderRadius: 8,
                        color: "#f1f5f9"
                      }}
                      formatter={(v: any) => [v.toLocaleString(), "Samples"]}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {classDistrib.map((_: any, i: number) => (
                        <Cell key={i} fill={CLUSTER_COLORS[i % CLUSTER_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                ) : (
                  <ScatterChart>
                    <CartesianGrid stroke="rgba(255,255,255,0.12)" />
                    <XAxis
                      type="number"
                      dataKey="x"
                      name="PC1"
                      stroke="#94a3b8"
                      tick={{ fill: "#cbd5e1", fontSize: 11 }}
                    />
                    <YAxis
                      type="number"
                      dataKey="y"
                      name="PC2"
                      stroke="#94a3b8"
                      tick={{ fill: "#cbd5e1", fontSize: 11 }}
                    />
                    <ZAxis range={[40, 80]} />
                    <Tooltip
                      cursor={{ stroke: "#60a5fa", strokeDasharray: "3 3" }}
                      contentStyle={{
                        background: "#0f172a",
                        border: "1px solid #60a5fa",
                        borderRadius: 8,
                        color: "#f1f5f9"
                      }}
                    />
                    {Array.from({ length: selected.parameters?.n_clusters ?? 5 }).map((_, idx) => (
                      <Scatter
                        key={idx}
                        name={`Cluster ${idx + 1}`}
                        data={clusters.filter((c) => c.cluster === idx)}
                        fill={CLUSTER_COLORS[idx % CLUSTER_COLORS.length]}
                      />
                    ))}
                  </ScatterChart>
                )}
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="features" className="rounded-xl border bg-card p-5">
            <p className="font-display text-xs uppercase tracking-wider text-muted-foreground">
              Top features
            </p>
            <div className="mt-3 h-80">
              {fi.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                  <div className="rounded-full bg-muted/50 p-4">
                    <FlaskConical className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">No feature importance data</p>
                  <p className="text-xs text-muted-foreground/70 max-w-xs">
                    Feature importance is available for regression and supervised classification analyses.
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={fi} layout="vertical" margin={{ left: 30, right: 16, top: 4, bottom: 4 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.12)" horizontal={false} />
                    <XAxis type="number" stroke="#94a3b8" tick={{ fill: "#cbd5e1", fontSize: 11 }} />
                    <YAxis
                      type="category"
                      dataKey="feature"
                      stroke="#94a3b8"
                      tick={{ fill: "#e2e8f0", fontSize: 12 }}
                      width={130}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#0f172a",
                        border: "1px solid #60a5fa",
                        borderRadius: 8,
                        color: "#f1f5f9"
                      }}
                    />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                      {fi.map((_: any, i: number) => (
                        <Cell
                          key={i}
                          fill={CHART_COLORS[i % CHART_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </TabsContent>

          <TabsContent value="distribution" className="rounded-xl border bg-card p-5">
            <p className="font-display text-xs uppercase tracking-wider text-muted-foreground">
              Target distribution
            </p>
            <div className="mt-3 h-80">
              {hist.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                  <div className="rounded-full bg-muted/50 p-4">
                    <Layout className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">No distribution data</p>
                  <p className="text-xs text-muted-foreground/70 max-w-xs">
                    Distribution requires numeric actual values, available for regression analyses.
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hist} margin={{ right: 16, top: 4 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.12)" vertical={false} />
                    <XAxis
                      dataKey="bin"
                      stroke="#94a3b8"
                      tick={{ fill: "#cbd5e1", fontSize: 10 }}
                      angle={-30}
                      textAnchor="end"
                      height={50}
                    />
                    <YAxis stroke="#94a3b8" tick={{ fill: "#cbd5e1", fontSize: 11 }} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: "#0f172a",
                        border: "1px solid #60a5fa",
                        borderRadius: 8,
                        color: "#f1f5f9"
                      }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {hist.map((_: any, i: number) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </TabsContent>

          <TabsContent value="logs">
            <LiveLogStream height={360} recordId={selected.id} />
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
}
