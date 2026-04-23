import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useAuth, homeForRole } from "@/contexts/AuthContext";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "AgroCotton Serviços" },
      {
        name: "description",
        content:
          "Sistema de checklist para colheitadeiras de algodão — MVP em construção.",
      },
    ],
  }),
});

function Index() {
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();
  const authed = !!user && !!role;

  const handleClick = () => {
    if (authed && role) {
      navigate({ to: homeForRole(role) });
    } else {
      navigate({ to: "/login" });
    }
  };

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center px-6 text-center"
      style={{ backgroundColor: "#0f172a" }}
    >
      <h1
        className="text-5xl font-extrabold tracking-tight sm:text-7xl"
        style={{ color: "#25D366" }}
      >
        AgroCotton
      </h1>
      <p className="mt-6 max-w-xl text-base text-slate-300 sm:text-lg">
        Sistema de checklist para colheitadeiras de algodão — MVP em construção.
      </p>

      <Button
        onClick={handleClick}
        disabled={loading}
        className="mt-10 px-8 py-6 text-base font-semibold text-slate-950 hover:opacity-90 disabled:opacity-50"
        style={{ backgroundColor: "#25D366" }}
      >
        {loading ? "Carregando..." : authed ? "Acessar painel" : "Entrar"}
      </Button>
    </main>
  );
}
