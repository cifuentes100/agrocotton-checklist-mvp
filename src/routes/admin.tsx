import {
  createFileRoute,
  useNavigate,
  useChildMatches,
  Outlet,
} from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({
    meta: [{ title: "Dashboard Admin — AgroCotton" }],
  }),
});

function AdminPage() {
  const childMatches = useChildMatches();
  const hasChild = childMatches.length > 0;

  return (
    <ProtectedRoute roles={["admin"]}>
      {hasChild ? <Outlet /> : <DashboardShell title="Dashboard Admin" />}
    </ProtectedRoute>
  );
}

function DashboardShell({ title }: { title: string }) {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center px-6 text-center"
      style={{ backgroundColor: "#0f172a" }}
    >
      <h1 className="text-3xl font-bold text-slate-100 sm:text-4xl">{title}</h1>
      <p className="mt-3 text-sm text-slate-400">Em construção.</p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button
          onClick={() => navigate({ to: "/admin/usuarios" as never })}
          className="font-semibold"
          style={{ backgroundColor: "#a78bfa", color: "#0f172a" }}
        >
          Gerenciar usuários
        </Button>
        <Button
          onClick={() => navigate({ to: "/implantador/maquinas" })}
          variant="outline"
          className="border-2 bg-transparent font-semibold hover:bg-violet-500/10"
          style={{ borderColor: "#a78bfa", color: "#a78bfa" }}
        >
          Modo Implantador
        </Button>
        <Button
          onClick={handleSignOut}
          variant="outline"
          className="border-2 bg-transparent font-semibold hover:bg-emerald-500/10"
          style={{ borderColor: "#25D366", color: "#25D366" }}
        >
          Sair
        </Button>
      </div>
    </main>
  );
}
