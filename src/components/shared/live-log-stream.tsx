import { useEffect, useRef, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { LogLine } from "@/lib/types";
import { collectionApi, logStreamClient } from "@/lib/api-client";

const COLORS: Record<LogLine["level"], string> = {
  info: "text-muted-foreground",
  warn: "text-warning",
  error: "text-destructive",
  success: "text-success",
};

function ts() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}

export function LiveLogStream({ height = 320, recordId }: { height?: number; recordId?: number }) {
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setIsLoading(true);
        if (recordId) {
          // Récupérer les logs de traitement spécifiques à un enregistrement
          const processingLogs = await collectionApi.getProcessingLogs(recordId);
          if (processingLogs && processingLogs.length > 0) {
            const formattedLogs = processingLogs.map((log: any) => ({
              ts: new Date(log.created_at).toLocaleTimeString(),
              level: log.log_level as LogLine["level"],
              source: log.step,
              message: log.message,
            }));
            setLogs(formattedLogs);
          }
        } else {
          // Pas de recordId spécifié, on affiche les logs système récents
          // Pour l'instant, on affiche un message indiquant de sélectionner une analyse
          setLogs([{
            ts: ts(),
            level: "info",
            source: "system",
            message: "Sélectionnez une analyse pour voir ses logs de traitement",
          }]);
        }
      } catch (error) {
        console.error("Erreur lors de la récupération des logs:", error);
        setLogs([{
          ts: ts(),
          level: "error",
          source: "system",
          message: "Impossible de récupérer les logs de traitement",
        }]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLogs();
  }, [recordId]);

  // Gestion du streaming WebSocket
  useEffect(() => {
    if (!recordId) return;

    // Connecter au WebSocket pour le streaming en temps réel
    logStreamClient.connect(recordId, (newLog) => {
      // Formatter le log reçu du WebSocket
      const formattedLog: LogLine = {
        ts: new Date(newLog.timestamp).toLocaleTimeString(),
        level: (newLog.level?.toLowerCase() as LogLine["level"]) || "info",
        source: newLog.details?.analysis_type || "worker",
        message: newLog.message,
      };
      
      // Ajouter le nouveau log à la liste
      setLogs(prev => [...prev, formattedLog]);
      setIsStreaming(true);
    });

    // Nettoyer la connexion WebSocket
    return () => {
      logStreamClient.disconnect();
      setIsStreaming(false);
    };
  }, [recordId]);

  useEffect(() => {
    const el = ref.current?.querySelector("[data-radix-scroll-area-viewport]") as HTMLElement | null;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logs]);

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className={cn(
            "h-2 w-2 rounded-full pulse-dot", 
            isLoading ? "bg-warning" : isStreaming ? "bg-success" : "bg-muted"
          )} />
          <p className="font-display text-xs font-medium uppercase tracking-wider">
            {recordId ? (isStreaming ? "Live Logs" : "Logs de traitement") : "Logs système"}
          </p>
          {isStreaming && (
            <span className="flex items-center gap-1 text-[10px] text-success">
              <div className="w-1 h-1 bg-success rounded-full animate-pulse" />
              LIVE
            </span>
          )}
        </div>
        <p className="font-display text-[10px] text-muted-foreground">
          {isLoading ? "Chargement..." : `${logs.length} lignes`}
        </p>
      </div>
      <ScrollArea ref={ref} style={{ height }} className="px-4 py-3 font-display text-xs">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Chargement des logs...
          </div>
        ) : (
          <div className="space-y-1">
            {logs.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Aucun log disponible
              </div>
            ) : (
              logs.map((l, i) => (
                <div key={i} className="flex gap-3 leading-relaxed">
                  <span className="shrink-0 text-muted-foreground/60">{l.ts}</span>
                  <span className="w-44 shrink-0 truncate text-primary/80">{l.source}</span>
                  <span className={cn("flex-1", COLORS[l.level])}>{l.message}</span>
                </div>
              ))
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
