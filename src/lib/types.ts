export type DatasetStatus = "collected" | "analyzing" | "analyzed" | "published" | "failed";
export type AnalysisType =
  | "linear_regression"
  | "logistic_regression"
  | "kmeans"
  | "pca"
  | "random_forest";
export type TaskStatus = "pending" | "running" | "success" | "failed";
export type ServiceStatus = "online" | "degraded" | "offline";

export interface DatasetMetadata {
  id: string;
  name: string;
  rows: number;
  columns: string[];
  sizeKb: number;
  uploadedAt: string;
  status: DatasetStatus;
  source: "upload" | "kaggle" | "api";
  owner: string;
}

export interface AnalysisResult {
  id: string;
  datasetId: string;
  datasetName: string;
  type: AnalysisType;
  status: TaskStatus;
  startedAt: string;
  durationMs: number;
  // Regression
  mse?: number;
  r2?: number;
  // Classification
  accuracy?: number;
  f1?: number;
  precision?: number;
  recall?: number;
  // Clustering
  k?: number;
  silhouette?: number;
  inertia?: number;
  // Generic
  features?: string[];
  target?: string;
}

export interface KagglePublication {
  id: string;
  datasetId: string;
  datasetName: string;
  kaggleSlug: string;
  status: TaskStatus;
  publishedAt: string;
  downloads: number;
  votes: number;
}

export interface NotificationLog {
  id: string;
  recipient: string;
  subject: string;
  template: "analysis_complete" | "publish_success" | "publish_failed" | "weekly_digest";
  status: TaskStatus;
  sentAt: string;
  bodyPreview: string;
}

export interface ServiceHealth {
  name: string;
  kind: "service" | "infra";
  status: ServiceStatus;
  uptime: string;
  latencyMs: number;
  cpu: number;
  memory: number;
  description: string;
}

export interface LogLine {
  ts: string;
  level: "info" | "warn" | "error" | "success";
  source: string;
  message: string;
}

export const ANALYSIS_LABELS: Record<AnalysisType, string> = {
  linear_regression: "Linear Regression",
  logistic_regression: "Logistic Regression",
  kmeans: "K-Means Clustering",
  pca: "Principal Component Analysis",
  random_forest: "Random Forest",
};
