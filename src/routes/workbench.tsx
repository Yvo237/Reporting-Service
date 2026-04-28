import { useState, useMemo, useEffect, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Brain, Download, Target, Zap, Loader2, Trash2, Database, Clock, Wifi, WifiOff } from "lucide-react";
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

const CLUSTER_COLORS = [
  "oklch(0.72 0.18 240)",
  "oklch(0.72 0.16 162)",
  "oklch(0.79 0.16 75)",
  "oklch(0.68 0.2 305)",
  "oklch(0.7 0.2 20)",
];

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
  const userId = "user_123"; // Stable user_id pour l'instant
  const { data: analyses = [], isLoading, refetch } = useQuery({
    queryKey: ["analysis-history", userId],
    queryFn: () => collectionApi.getHistory(userId),
  });

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

  // Adapter les données backend au format attendu par les graphiques (si nécessaire)
  const clusters = useMemo(() => makeClusters(selected?.parameters?.n_clusters ?? 5), [selected]);
  const reg = useMemo(() => makeRegressionPoints(), [selected]);
  const hist = useMemo(() => makeHistogram(), [selected]);
  const fi = useMemo(() => makeFeatureImportance(), [selected]);

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

  const currentSelectedId = selected?.id;

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
              <StatusBadge status="success" />
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
            {selected.results?.r2 != null && (
              <>
                <MetricChip label="R²" value={selected.results.r2.toFixed(3)} good hint="goodness of fit" />
                <MetricChip label="MSE" value={selected.results.mse!.toFixed(1)} hint="mean squared error" />
                <MetricChip label="Features" value={String(selected.parameters?.feature_columns?.length || selected.parameters?.x_columns?.length || 0)} />
                <MetricChip label="Duration" value="—" />
              </>
            )}
            {selected.results?.accuracy != null && (
              <>
                <MetricChip label="Accuracy" value={`${(selected.results.accuracy * 100).toFixed(1)}%`} good />
                <MetricChip label="F1 Score" value={selected.results.f1_score?.toFixed(3) || "—"} />
                <MetricChip label="Precision" value={selected.results.precision?.toFixed(3) || "—"} />
                <MetricChip label="Recall" value={selected.results.recall?.toFixed(3) || "—"} />
              </>
            )}
            {selected.parameters?.n_clusters != null && (
              <>
                <MetricChip label="Clusters (k)" value={String(selected.parameters.n_clusters)} good />
                <MetricChip
                  label="Silhouette"
                  value={(selected.results?.silhouette_score ?? 0.612).toFixed(3)}
                  hint="higher is better"
                />
                <MetricChip
                  label="Inertia"
                  value={(selected.results?.inertia ?? 4231.5).toFixed(1)}
                  hint="WCSS"
                />
                <MetricChip label="Features" value="—" />
              </>
            )}
            {selected.analysis_type === "dimensionality/pca" && (
              <>
                <MetricChip label="Components" value={String(selected.parameters?.n_components || 2)} />
                <MetricChip label="Var. explained" value="91%" good />
                <MetricChip label="PC1" value="0.42" />
                <MetricChip label="PC2" value="0.31" />
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
                  : "Decision surface"}
            </p>
            <div className="mt-3 h-80">
              <ResponsiveContainer>
                {selected.analysis_type === "regression/linear" ? (
                  <LineChart data={reg}>
                    <CartesianGrid stroke="oklch(1 0 0 / 0.05)" vertical={false} />
                    <XAxis dataKey="x" stroke="oklch(0.68 0.015 256)" fontSize={11} tickLine={false} />
                    <YAxis stroke="oklch(0.68 0.015 256)" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: "oklch(0.205 0.014 256)",
                        border: "1px solid oklch(0.28 0.016 256)",
                        borderRadius: 8,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="actual" stroke="oklch(0.72 0.18 240)" strokeWidth={2} dot={{ r: 2 }} />
                    <Line
                      type="monotone"
                      dataKey="predicted"
                      stroke="oklch(0.72 0.16 162)"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={false}
                    />
                  </LineChart>
                ) : (
                  <ScatterChart>
                    <CartesianGrid stroke="oklch(1 0 0 / 0.05)" />
                    <XAxis
                      type="number"
                      dataKey="x"
                      name="PC1"
                      stroke="oklch(0.68 0.015 256)"
                      fontSize={11}
                    />
                    <YAxis
                      type="number"
                      dataKey="y"
                      name="PC2"
                      stroke="oklch(0.68 0.015 256)"
                      fontSize={11}
                    />
                    <ZAxis range={[40, 80]} />
                    <Tooltip
                      cursor={{ strokeDasharray: "3 3" }}
                      contentStyle={{
                        background: "oklch(0.205 0.014 256)",
                        border: "1px solid oklch(0.28 0.016 256)",
                        borderRadius: 8,
                      }}
                    />
                    {Array.from({ length: selected.k ?? 5 }).map((_, idx) => (
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
              <ResponsiveContainer>
                <BarChart data={fi} layout="vertical" margin={{ left: 30 }}>
                  <CartesianGrid stroke="oklch(1 0 0 / 0.05)" horizontal={false} />
                  <XAxis type="number" stroke="oklch(0.68 0.015 256)" fontSize={11} />
                  <YAxis
                    type="category"
                    dataKey="feature"
                    stroke="oklch(0.68 0.015 256)"
                    fontSize={12}
                    width={120}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "oklch(0.205 0.014 256)",
                      border: "1px solid oklch(0.28 0.016 256)",
                      borderRadius: 8,
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {fi.map((_, i) => (
                      <Cell
                        key={i}
                        fill={CLUSTER_COLORS[i % CLUSTER_COLORS.length]}
                        opacity={0.85}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="distribution" className="rounded-xl border bg-card p-5">
            <p className="font-display text-xs uppercase tracking-wider text-muted-foreground">
              Target distribution
            </p>
            <div className="mt-3 h-80">
              <ResponsiveContainer>
                <BarChart data={hist}>
                  <CartesianGrid stroke="oklch(1 0 0 / 0.05)" vertical={false} />
                  <XAxis dataKey="bin" stroke="oklch(0.68 0.015 256)" fontSize={11} />
                  <YAxis stroke="oklch(0.68 0.015 256)" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "oklch(0.205 0.014 256)",
                      border: "1px solid oklch(0.28 0.016 256)",
                      borderRadius: 8,
                    }}
                  />
                  <Bar dataKey="count" fill="oklch(0.72 0.18 240)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
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
