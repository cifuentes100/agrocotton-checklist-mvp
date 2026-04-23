import * as React from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, homeForRole, NoPermissionError } from "@/contexts/AuthContext";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "Entrar — AgroCotton Serviços" },
      { name: "description", content: "Acesso ao painel AgroCotton para mecânico, admin e implantador." },
    ],
  }),
});

function LoginPage() {
  const navigate = useNavigate();
  const { user, role, loading, signIn } = useAuth();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  // Já logado → redireciona pra home do role
  React.useEffect(() => {
    if (!loading && user && role) {
      navigate({ to: homeForRole(role) });
    }
  }, [loading, user, role, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { role: r } = await signIn(email.trim(), password);
      navigate({ to: homeForRole(r) });
    } catch (err: unknown) {
      if (err instanceof NoPermissionError) {
        setError(err.message);
      } else if (err && typeof err === "object" && "message" in err) {
        const msg = String((err as { message: string }).message).toLowerCase();
        if (msg.includes("invalid login credentials") || msg.includes("invalid_credentials")) {
          setError("Email ou senha incorretos.");
        } else if (msg.includes("email not confirmed")) {
          setError("Email não confirmado. Contate o administrador.");
        } else {
          setError("Erro ao entrar. Tente novamente.");
        }
      } else {
        setError("Erro ao entrar. Tente novamente.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center px-4"
      style={{ backgroundColor: "#0f172a" }}
    >
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link
            to="/"
            className="inline-block text-3xl font-extrabold tracking-tight"
            style={{ color: "#25D366" }}
          >
            AgroCotton
          </Link>
          <p className="mt-2 text-sm text-slate-400">
            Acesso para mecânico, admin e implantador
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-2xl backdrop-blur"
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-200">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
                className="border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500"
                placeholder="voce@agrocotton.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-200">
                Senha
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
                className="border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300"
              >
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={submitting || !email || !password}
              className="w-full font-semibold text-slate-950 hover:opacity-90"
              style={{ backgroundColor: "#25D366" }}
            >
              {submitting ? "Entrando..." : "Entrar"}
            </Button>
          </div>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          Operadores não usam este painel — o checklist é feito pelo WhatsApp.
        </p>
      </div>
    </main>
  );
}
