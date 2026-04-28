import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Database, Filter, Play, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CsvUploader } from "@/components/data/csv-uploader";
import { RunAnalysisDialog } from "@/components/data/run-analysis-dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { collectionApi } from "@/lib/api-client";
import type { DatasetMetadata } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/data")({
  head: () => ({
    meta: [
      { title: "Data Hub · Helix" },
      {
        name: "description",
        content: "Drag-and-drop CSV ingestion, schema validation, and dataset orchestration.",
      },
    ],
  }),
  component: DataHub,
  validateSearch: (search: Record<string, string>) => ({
    q: search.q as string || "",
  }),
});

function bytes(kb: number) {
  if (kb < 1) return `${(kb * 1024).toFixed(0)} B`;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function DataHub() {
  const { q: urlQuery } = Route.useSearch();
  const [q, setQ] = useState(urlQuery || "");
  const [active, setActive] = useState<DatasetMetadata | null>(null);
  const [open, setOpen] = useState(false);
  const [userId] = useState("test_user"); // Pour l'instant, on utilise un utilisateur fixe

  const { data: datasets = [], isLoading, error, refetch } = useQuery({
    queryKey: ["datasets", userId],
    queryFn: () => collectionApi.getDatasets(userId),
    refetchInterval: 30000, // Rafraîchir toutes les 30 secondes
  });

  const filtered = useMemo(
    () =>
      datasets.filter(
        (d: DatasetMetadata) =>
          d.name.toLowerCase().includes(q.toLowerCase()) ||
          d.owner.toLowerCase().includes(q.toLowerCase()),
      ),
    [datasets, q],
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 p-6 xl:grid-cols-3">
        <section className="xl:col-span-1">
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center justify-center h-32">
              <div className="text-muted-foreground">Chargement des datasets...</div>
            </div>
          </div>
        </section>
        <section className="xl:col-span-2">
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center justify-center h-64">
              <div className="text-muted-foreground">Chargement...</div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid grid-cols-1 gap-6 p-6 xl:grid-cols-3">
        <section className="xl:col-span-1">
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center justify-center h-32">
              <div className="text-destructive">Erreur de chargement</div>
            </div>
          </div>
        </section>
        <section className="xl:col-span-2">
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center justify-center h-64">
              <div className="text-destructive">Impossible de charger les datasets</div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  const open_ = (d: DatasetMetadata) => {
    setActive(d);
    setOpen(true);
  };

  return (
    <div className="grid grid-cols-1 gap-6 p-6 xl:grid-cols-3">
      {/* Uploader */}
      <section className="xl:col-span-1">
        <div className="rounded-xl border bg-card p-5">
          <p className="font-display text-xs uppercase tracking-wider text-muted-foreground">
            Ingest
          </p>
          <h2 className="mt-1 font-display text-lg font-semibold">Upload datasets</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Streamed to <code className="text-primary">collection-svc</code> · validated against
            registered schemas
          </p>
          <div className="mt-5">
            <CsvUploader onUploadSuccess={() => {
              // Rafraîchir les données du catalogue
              refetch();
            }} />
          </div>
        </div>
      </section>

      {/* Library */}
      <section className="xl:col-span-2">
        <div className="rounded-xl border bg-card">
          <div className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-display text-xs uppercase tracking-wider text-muted-foreground">
                Library
              </p>
              <h2 className="mt-1 font-display text-lg font-semibold">
                Dataset catalog · {filtered.length}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search datasets…"
                  className="h-9 w-56 pl-8"
                />
              </div>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => alert("Filter functionality coming soon!")}>
                <Filter className="h-3.5 w-3.5" />
                Filter
              </Button>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Dataset</TableHead>
                <TableHead className="hidden md:table-cell">Rows</TableHead>
                <TableHead className="hidden lg:table-cell">Size</TableHead>
                <TableHead className="hidden lg:table-cell">Owner</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((d: DatasetMetadata) => (
                <TableRow key={d.id} className="group">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-md border bg-muted text-muted-foreground">
                        <Database className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{d.name}</p>
                        <p className="font-display text-[10px] uppercase tracking-wider text-muted-foreground">
                          {d.columns.length} cols · {d.source}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden font-display text-sm md:table-cell">
                    {d.rows.toLocaleString()}
                  </TableCell>
                  <TableCell className="hidden font-display text-sm text-muted-foreground lg:table-cell">
                    {bytes(d.sizeKb)}
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                    @{d.owner}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={d.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => open_(d)}
                      className="gap-1.5 opacity-70 transition-opacity group-hover:opacity-100"
                    >
                      <Play className="h-3.5 w-3.5" />
                      Run
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <RunAnalysisDialog open={open} onOpenChange={setOpen} dataset={active} />
    </div>
  );
}
