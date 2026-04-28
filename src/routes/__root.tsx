import { Link, Outlet, createRootRoute, useRouterState } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <p className="font-display text-sm tracking-widest text-primary">ERR · 404</p>
        <h1 className="mt-2 text-7xl font-bold tracking-tight">Lost in the pipeline</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          That route doesn't exist in the orchestrator. Head back to the control plane.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootComponent() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar pathname={path} />
        <main className="flex-1 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
      <Toaster richColors theme="dark" position="bottom-right" />
    </div>
  );
}
