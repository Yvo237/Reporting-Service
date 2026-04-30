import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ANALYSIS_LABELS, type AnalysisType, type DatasetMetadata } from "@/lib/types";
import { cn } from "@/lib/utils";
import { collectionApi } from "@/lib/api-client";
import { toast } from "sonner";

const TYPES: { value: AnalysisType; tag: string; description: string }[] = [
  { value: "linear_regression", tag: "Regression", description: "Predict continuous values" },
  { value: "logistic_regression", tag: "Classification", description: "Binary / multi-class labels" },
  { value: "random_forest", tag: "Classification", description: "Ensemble tree classifier" },
  { value: "kmeans", tag: "Clustering", description: "Unsupervised grouping" },
  { value: "pca", tag: "Dim. Reduction", description: "Project to lower dimensions" },
];

export function RunAnalysisDialog({
  open,
  onOpenChange,
  dataset,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  dataset: DatasetMetadata | null;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [type, setType] = useState<AnalysisType>("kmeans");
  const [target, setTarget] = useState<string>("");
  const [features, setFeatures] = useState<string[]>([]);
  const [k, setK] = useState(5);
  const [running, setRunning] = useState(false);

  const reset = () => {
    setStep(0);
    setType("kmeans");
    setTarget("");
    setFeatures([]);
    setK(5);
    setRunning(false);
  };

  const close = (v: boolean) => {
    if (!v) setTimeout(reset, 200);
    onOpenChange(v);
  };

  const mutation = useMutation({
    mutationFn: ({ id, formData }: { id: string; formData: FormData }) => 
      collectionApi.runAnalysis(id, formData),
    onSuccess: () => {
      toast.success("Analysis queued", {
        id: "run",
        description: `${ANALYSIS_LABELS[type]} on ${dataset?.name}`,
      });
      queryClient.invalidateQueries({ queryKey: ["analysis-history"] });
      onOpenChange(false);
      setTimeout(() => {
        reset();
        navigate({ to: "/workbench" });
      }, 300);
    },
    onError: (error: any) => {
      toast.error("Analysis failed", {
        id: "run",
        description: error.response?.data?.detail || error.message,
      });
      setRunning(false);
    },
  });

  const submit = async () => {
    if (!dataset?.id) return;

    // Validation finale avant soumission
    if (features.length === 0 && type !== "kmeans" && type !== "pca") {
      toast.error("Please select at least one feature column", { id: "run" });
      return;
    }
    
    if (needsTarget && !target) {
      toast.error("Please select a target column", { id: "run" });
      return;
    }
    
    setRunning(true);
    toast.loading("Dispatching to backend...", { id: "run" });

    const formData = new FormData();
    formData.append("user_id", "test_user");
    formData.append("dataset_name", dataset?.name || "unknown");
    
    // Le backend attend "analysis_endpoint"
    let endpoint = "";
    if (type === "linear_regression") endpoint = "regression/linear";
    else if (type === "logistic_regression" || type === "random_forest") endpoint = "classification/supervised";
    else if (type === "kmeans") endpoint = "classification/unsupervised";
    else if (type === "pca") endpoint = "dimensionality/pca";
    
    formData.append("analysis_endpoint", endpoint);

    const apiParams = {
      ...(type === "linear_regression" ? { x_columns: features, y_column: target } : {}),
      ...(type === "logistic_regression" || type === "random_forest" ? { target_column: target, feature_columns: features } : {}),
      ...(type === "kmeans" ? { n_clusters: k } : {}),
      ...(type === "pca" ? { n_components: k } : {}),
    };

    formData.append("params", JSON.stringify(apiParams));
    
    mutation.mutate({ id: dataset.id, formData });
  };

  const cols = dataset?.columns ?? [];
  const needsTarget = type !== "kmeans" && type !== "pca";
  const isCluster = type === "kmeans";

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-xl overflow-hidden p-0">
        <div className="border-b bg-gradient-glow px-6 py-5">
          <DialogHeader>
            <div className="flex items-center gap-2 font-display text-[10px] uppercase tracking-[0.18em] text-primary">
              <Sparkles className="h-3 w-3" />
              Orchestration
            </div>
            <DialogTitle className="mt-1 font-display text-xl">Run Analysis</DialogTitle>
            <DialogDescription>
              {dataset
                ? `Target: ${dataset.name} · ${dataset.rows.toLocaleString()} rows`
                : "Select a dataset to continue"}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex items-center gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex flex-1 items-center gap-2">
                <div
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full border font-display text-[11px] font-medium",
                    step >= i
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground",
                  )}
                >
                  {step > i ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                </div>
                {i < 2 && (
                  <div
                    className={cn(
                      "h-px flex-1 transition-colors",
                      step > i ? "bg-primary" : "bg-border",
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 py-5">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div
                key="s0"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                className="space-y-2"
              >
                <p className="text-sm font-medium">Select algorithm</p>
                <div className="grid grid-cols-1 gap-2">
                  {TYPES.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setType(t.value)}
                      className={cn(
                        "group flex items-center justify-between rounded-lg border bg-card/60 px-3.5 py-3 text-left transition-all hover:border-primary/50",
                        type === t.value && "border-primary bg-primary/5 shadow-glow",
                      )}
                    >
                      <div>
                        <p className="text-sm font-medium">{ANALYSIS_LABELS[t.value]}</p>
                        <p className="text-xs text-muted-foreground">{t.description}</p>
                      </div>
                      <span className="rounded-full border bg-background px-2 py-0.5 font-display text-[10px] uppercase tracking-wider text-muted-foreground">
                        {t.tag}
                      </span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div
                key="s1"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                className="space-y-4"
              >
                <div>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                    Feature columns
                  </Label>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {cols.map((c) => {
                      const on = features.includes(c);
                      const disabled = c === target;
                      return (
                        <button
                          key={c}
                          disabled={disabled}
                          onClick={() =>
                            setFeatures((prev) =>
                              on ? prev.filter((x) => x !== c) : [...prev, c],
                            )
                          }
                          className={cn(
                            "rounded-md border px-2.5 py-1 font-display text-xs transition-colors",
                            on
                              ? "border-primary bg-primary/15 text-primary"
                              : "border-border bg-card hover:border-primary/40",
                            disabled && "opacity-30",
                          )}
                        >
                          {c}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {needsTarget && (
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                      Target column
                    </Label>
                    <Select value={target} onValueChange={setTarget}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select target…" />
                      </SelectTrigger>
                      <SelectContent>
                        {cols.map((c) => (
                          <SelectItem key={c} value={c} disabled={features.includes(c)}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="s2"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                className="space-y-5"
              >
                {isCluster && (
                  <div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                        Number of clusters (k)
                      </Label>
                      <span className="font-display text-xl font-semibold text-primary">{k}</span>
                    </div>
                    <Slider
                      value={[k]}
                      onValueChange={(v) => setK(v[0])}
                      min={2}
                      max={10}
                      step={1}
                      className="mt-3"
                    />
                  </div>
                )}
                <div className="rounded-lg border bg-muted/40 p-3 font-display text-xs">
                  <p className="text-muted-foreground">POST /collect-and-analyze</p>
                  <pre className="mt-2 overflow-x-auto text-[11px] leading-relaxed text-foreground/90">
                    {JSON.stringify(
                      {
                        dataset_id: dataset?.id,
                        algorithm: type,
                        features,
                        ...(needsTarget ? { target } : {}),
                        ...(isCluster ? { params: { k } } : {}),
                      },
                      null,
                      2,
                    )}
                  </pre>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <DialogFooter className="border-t bg-card/60 px-6 py-3">
          {step > 0 ? (
            <Button variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={running}>
              Back
            </Button>
          ) : (
            <Button variant="ghost" onClick={() => close(false)}>
              Cancel
            </Button>
          )}
          {step < 2 ? (
            <Button
              onClick={() => setStep((s) => s + 1)}
              disabled={step === 1 && (features.length === 0 || (needsTarget && !target))}
              className="gap-2 bg-gradient-primary text-primary-foreground hover:opacity-90"
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={submit}
              disabled={running || features.length === 0 || (needsTarget && !target)}
              className="gap-2 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
            >
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {running ? "Dispatching…" : "Run analysis"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
