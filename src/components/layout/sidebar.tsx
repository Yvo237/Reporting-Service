import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  Database,
  FlaskConical,
  LayoutDashboard,
  Boxes,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  to: "/" | "/data" | "/workbench" | "/health";
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
};

const NAV: NavItem[] = [
  { to: "/", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/data", label: "Data Hub", icon: Database },
  { to: "/workbench", label: "ML Workbench", icon: FlaskConical },
  { to: "/health", label: "System Health", icon: Activity },
];

export function Sidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex h-16 items-center gap-2.5 border-b px-5">
        <div className="relative flex h-9 w-9 items-center justify-center rounded-md bg-gradient-primary shadow-glow">
          <Boxes className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="leading-tight">
          <p className="font-display text-base font-semibold tracking-tight">Helix</p>
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            ML Control Plane
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        <p className="px-3 pb-2 pt-3 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Workspace
        </p>
        {NAV.map(({ to, label, icon: Icon, exact }) => {
          const active = exact ? path === to : path.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 transition-colors",
                  active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                )}
              />
              {label}
              {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary pulse-dot" />}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-4">
        <div className="rounded-lg border bg-card/60 p-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-success pulse-dot text-success" />
            <p className="text-xs font-medium">All systems operational</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
