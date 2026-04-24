import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth, homeForRole, type AppRole } from "@/contexts/AuthContext";

type Props = {
  roles: AppRole[];
  children: React.ReactNode;
};

export function ProtectedRoute({ roles, children }: Props) {
  const { user, role: userRole, loading } = useAuth();
  const navigate = useNavigate();

  const allowed = !!userRole && roles.includes(userRole);

  React.useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (userRole && !roles.includes(userRole)) {
      navigate({ to: homeForRole(userRole) });
    }
  }, [loading, user, userRole, roles, navigate]);

  if (loading || !user || !allowed) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ backgroundColor: "#0f172a" }}
      >
        <div
          className="h-10 w-10 animate-spin rounded-full border-4 border-slate-700"
          style={{ borderTopColor: "#25D366" }}
        />
      </div>
    );
  }

  return <>{children}</>;
}
