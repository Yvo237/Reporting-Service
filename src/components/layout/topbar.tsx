import { Bell, Command, Search, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

const TITLES: Record<string, { title: string; subtitle: string }> = {
  "/": { title: "Overview", subtitle: "Live status of pipelines, models, and infrastructure" },
  "/data": { title: "Data Hub", subtitle: "Ingest, validate, and orchestrate datasets" },
  "/workbench": { title: "ML Workbench", subtitle: "Inspect runs, metrics, and artifacts" },
  "/kaggle": { title: "Kaggle Publisher", subtitle: "Push curated datasets to the community" },
  "/notifications": { title: "Notification Center", subtitle: "Outbound email log & templates" },
  "/health": { title: "System Health", subtitle: "Microservices and infrastructure telemetry" },
};

export function Topbar({ pathname }: { pathname: string }) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const meta = TITLES[pathname] ?? TITLES["/"];
  
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      // Rediriger vers la page de recherche ou filtrer les résultats
      navigate({ to: "/data", search: { q: query } });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch(searchQuery);
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b bg-background/70 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-4 px-6">
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-lg font-semibold tracking-tight">
            {meta.title}
          </h1>
          <p className="truncate text-xs text-muted-foreground">{meta.subtitle}</p>
        </div>

        <div className="relative hidden w-72 lg:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Search datasets, runs, services…"
            className="h-9 border-border/70 bg-card/60 pl-9 pr-14 text-sm placeholder:text-muted-foreground/70"
          />
          <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-flex">
            <Command className="h-3 w-3" />K
          </kbd>
        </div>

        <Button 
          variant="ghost" 
          size="icon" 
          className="relative h-9 w-9"
          onClick={() => navigate({ to: "/notifications" })}
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary" />
        </Button>
        <Button
          size="sm"
          className="h-9 gap-2 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
          onClick={() => navigate({ to: "/workbench" })}
        >
          <Sparkles className="h-4 w-4" />
          New Analysis
        </Button>
        <div className="ml-1 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-accent font-display text-sm font-semibold text-accent-foreground">
          AM
        </div>
      </div>
    </header>
  );
}
