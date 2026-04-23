import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
  return (
    <ProtectedRoute role="admin">
      <DashboardShell title="Dashboard Admin" />
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
      <Button
        onClick={handleSignOut}
        variant="outline"
        className="mt-8 border-2 bg-transparent font-semibold hover:bg-emerald-500/10"
        style={{ borderColor: "#25D366", color: "#25D366" }}
      >
        Sair
      </Button>
    </main>
  );
}
