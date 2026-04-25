import * as React from "react";
import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { Wrench, Camera, Menu } from "lucide-react";

export const Route = createFileRoute("/implantador")({
  component: ImplantadorLayout,
  head: () => ({
    meta: [{ title: "Implantador — AgroCotton" }],
  }),
});

function ImplantadorLayout() {
  const { signOut, role } = useAuth();
  const navigate = useNavigate();
  const isAdmin = role === "admin";
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  const navContent = (onNavigate?: () => void) => (
    <nav className="flex flex-col gap-1">
      <SidebarLink
        to="/implantador/maquinas"
        icon={<Wrench className="h-4 w-4" />}
        onClick={onNavigate}
      >
        Máquinas
      </SidebarLink>
      <SidebarLink
        to="/implantador/maquinas"
        icon={<Camera className="h-4 w-4" />}
        onClick={onNavigate}
      >
        Configurar Referências
      </SidebarLink>
    </nav>
  );

  return (
    <ProtectedRoute roles={["implantador", "admin"]}>
      <div className="min-h-screen" style={{ backgroundColor: "#0f172a" }}>
        {/* Topbar */}
        <header
          className="flex h-16 items-center justify-between gap-2 border-b border-slate-800 px-3 md:px-6"
          style={{ backgroundColor: "#0b1222" }}
        >
          <div className="flex min-w-0 items-center gap-2">
            {/* Hamburger só em mobile */}
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="md:hidden text-slate-200 hover:bg-slate-800"
                  aria-label="Abrir menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-64 border-slate-800 p-4"
                style={{ backgroundColor: "#0b1222" }}
              >
                <div className="mb-4 text-sm font-semibold text-slate-100">
                  Implantador
                </div>
                {navContent(() => setMobileNavOpen(false))}
              </SheetContent>
            </Sheet>

            <span className="truncate text-base font-semibold text-slate-100 md:text-lg">
              AgroCotton
            </span>
            <span className="hidden text-sm text-slate-400 sm:inline">
              — Modo Implantador
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {isAdmin && (
              <Button
                onClick={() => navigate({ to: "/admin" })}
                variant="outline"
                size="sm"
                className="border-2 bg-transparent px-2 font-semibold hover:bg-emerald-500/10 md:px-3"
                style={{ borderColor: "#25D366", color: "#25D366" }}
              >
                <span className="hidden sm:inline">Voltar para Admin</span>
                <span className="sm:hidden">Admin</span>
              </Button>
            )}
            <Button
              onClick={handleSignOut}
              variant="outline"
              size="sm"
              className="border-2 bg-transparent px-2 font-semibold hover:bg-violet-500/10 md:px-3"
              style={{ borderColor: "#a78bfa", color: "#a78bfa" }}
            >
              Sair
            </Button>
          </div>
        </header>

        <div className="flex min-h-[calc(100vh-4rem)]">
          {/* Sidebar fixa só em ≥md */}
          <aside
            className="hidden w-60 shrink-0 border-r border-slate-800 p-4 md:block"
            style={{ backgroundColor: "#0b1222" }}
          >
            {navContent()}
          </aside>

          {/* Conteúdo */}
          <main className="min-w-0 flex-1 overflow-auto p-4 md:p-6">
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
  onClick,
}: {
  to: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-800/60"
      activeProps={{
        style: { backgroundColor: "rgba(167, 139, 250, 0.15)", color: "#a78bfa" },
      }}
    >
      {icon}
      <span>{children}</span>
    </Link>
  );
}
