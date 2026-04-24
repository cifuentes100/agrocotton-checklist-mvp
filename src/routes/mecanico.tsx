import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { useAuth } from "@/contexts/AuthContext";
import { ClipboardCheck, History } from "lucide-react";

export const Route = createFileRoute("/mecanico")({
  component: MecanicoLayout,
  head: () => ({
    meta: [{ title: "Mecânico — AgroCotton" }],
  }),
});

function MecanicoLayout() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  return (
    <ProtectedRoute roles={["mecanico", "admin"]}>
      <div className="min-h-screen" style={{ backgroundColor: "#0f172a" }}>
        {/* Topbar */}
        <header
          className="flex h-16 items-center justify-between border-b border-slate-800 px-6"
          style={{ backgroundColor: "#0b1222" }}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-slate-100">AgroCotton</span>
            <span className="text-sm text-slate-400">— Modo Mecânico</span>
          </div>
          <Button
            onClick={handleSignOut}
            variant="outline"
            size="sm"
            className="border-2 bg-transparent font-semibold hover:bg-orange-500/10"
            style={{ borderColor: "#f5a623", color: "#f5a623" }}
          >
            Sair
          </Button>
        </header>

        <div className="flex min-h-[calc(100vh-4rem)]">
          {/* Sidebar */}
          <aside
            className="w-60 shrink-0 border-r border-slate-800 p-4"
            style={{ backgroundColor: "#0b1222" }}
          >
            <nav className="flex flex-col gap-1">
              <SidebarLink to="/mecanico" icon={<ClipboardCheck className="h-4 w-4" />}>
                Fila de Validações
              </SidebarLink>
              <SidebarLink to="/mecanico/historico" icon={<History className="h-4 w-4" />}>
                Histórico
              </SidebarLink>
            </nav>
          </aside>

          {/* Conteúdo */}
          <main className="flex-1 overflow-auto p-6">
            <Outlet />
          </main>
        </div>

        <Toaster theme="dark" position="top-right" />
      </div>
    </ProtectedRoute>
  );
}

function SidebarLink({
  to,
  icon,
  children,
}: {
  to: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      activeOptions={{ exact: true }}
      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-800/60"
      activeProps={{
        style: { backgroundColor: "rgba(245, 166, 35, 0.15)", color: "#f5a623" },
      }}
    >
      {icon}
      <span>{children}</span>
    </Link>
  );
}
