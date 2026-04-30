import { useCallback, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, FileSpreadsheet, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { parseCSV, collectionApi } from "@/lib/api-client";

type UploadFile = {
  name: string;
  size: number;
  rows: number;
  columns: string[];
  progress: number;
  done: boolean;
};

const SAMPLE_COLUMNS = [
  ["customer_id", "tenure", "monthly_charges", "contract", "churn"],
  ["sqm", "rooms", "year_built", "city", "price"],
  ["device_id", "ts", "temp", "humidity", "vibration"],
  ["age", "income", "debt", "score", "default"],
];
export function CsvUploader({ onComplete, onUploadSuccess }: {
  onComplete?: (f: UploadFile) => void;
  onUploadSuccess?: () => void;
}) {
  const [drag, setDrag] = useState(false);
  const [files, setFiles] = useState<UploadFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ingest = useCallback(
    async (list: FileList | File[]) => {
      for (const file of Array.from(list)) {
        try {
          const parsed = await parseCSV(file);

          const f: UploadFile = {
            name: file.name,
            size: file.size,
            rows: parsed.rows,
            columns: parsed.columns,
            progress: 0,
            done: false,
          };

          setFiles((prev) => [f, ...prev].slice(0, 5));

          let p = 0;
          const id = setInterval(() => {
            p += 8 + Math.random() * 12;
            setFiles((prev) =>
              prev.map((x) =>
                x.name === f.name ? { ...x, progress: Math.min(100, p) } : x,
              ),
            );
            if (p >= 100) {
              clearInterval(id);
              setFiles((prev) =>
                prev.map((x) =>
                  x.name === f.name ? { ...x, done: true } : x,
                ),
              );
              onComplete?.(f);
              toast.success(`${file.name} parsed successfully: ${parsed.rows} rows, ${parsed.columns.length} columns`);

              (async () => {
                try {
                  const formData = new FormData();
                  formData.append('file', file);
                  formData.append('user_id', 'test_user');
                  formData.append('dataset_name', file.name.replace('.csv', ''));

                  const result = await collectionApi.uploadDataset(formData);
                  console.log('Upload successful:', result);
                  toast.success(`${file.name} uploaded successfully!`);
                  onUploadSuccess?.();
                } catch (uploadError) {
                  console.error('Upload error:', uploadError);
                  toast.error(`Failed to upload ${file.name}: ${uploadError instanceof Error ? uploadError.message : 'Upload failed'}`);
                }
              })();
            }
          }, 300 + Math.random() * 200);

        } catch (error) {
          console.error("Error parsing CSV:", error);
          toast.error(`Failed to parse ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    },
    [onComplete],
  );

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = event.target.files;
      if (selectedFiles && selectedFiles.length > 0) {
        ingest(selectedFiles);
      }
    },
    [ingest]
  );

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          if (e.dataTransfer.files.length) ingest(e.dataTransfer.files);
        }}
        className={cn(
          "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed bg-card/40 px-6 py-14 text-center transition-all",
          drag
            ? "border-primary bg-primary/5 shadow-glow"
            : "border-border hover:border-primary/50 hover:bg-card/70",
        )}
      >
        <div className="grid-bg pointer-events-none absolute inset-0 rounded-xl opacity-30" />
        <div className="relative">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary">
            <UploadCloud className="h-7 w-7" />
          </div>
          <h3 className="mt-4 font-display text-lg font-semibold tracking-tight">
            Drop CSVs to ingest
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Files are streamed to the Collection Service · max 200 MB per file
          </p>
          <div className="mt-5 flex items-center justify-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="bg-gradient-primary text-primary-foreground hover:opacity-90"
            >
              Browse files
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                // Créer un fichier CSV de démonstration réel
                const demoContent = `timestamp,device_id,temperature,humidity,status
2024-01-01T10:00:00Z,dev001,23.5,45.2,active
2024-01-01T10:01:00Z,dev002,24.1,44.8,active
2024-01-01T10:02:00Z,dev003,22.8,46.1,idle
2024-01-01T10:03:00Z,dev001,23.7,45.0,active
2024-01-01T10:04:00Z,dev002,24.3,44.5,active`;

                const demoFile = new File([demoContent], "demo_iot_stream.csv", { type: "text/csv" });
                ingest([demoFile]);
              }}
            >
              Generate demo
            </Button>
          </div>
          <p className="mt-3 font-display text-[10px] uppercase tracking-wider text-muted-foreground">
            CSV · TSV · Parquet · JSONL
          </p>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {files.map((f) => (
          <motion.div
            key={f.name}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex items-center gap-3 rounded-lg border bg-card/70 p-3"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <FileSpreadsheet className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium">{f.name}</p>
                <p className="font-display text-[10px] uppercase tracking-wider text-muted-foreground">
                  {f.rows.toLocaleString()} rows · {f.columns.length} cols
                </p>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <Progress value={f.progress} className="h-1.5 flex-1" />
                <span className="font-display text-[10px] text-muted-foreground">
                  {Math.round(f.progress)}%
                </span>
              </div>
              {f.done && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {f.columns.slice(0, 6).map((c) => (
                    <span
                      key={c}
                      className="rounded border bg-background px-1.5 py-0.5 font-display text-[10px] text-muted-foreground"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {f.done ? (
              <CheckCircle2 className="h-5 w-5 text-success" />
            ) : (
              <button
                onClick={() => setFiles((prev) => prev.filter((x) => x.name !== f.name))}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
