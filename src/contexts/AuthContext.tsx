import * as React from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "implantador" | "mecanico" | "admin";

const VALID_ROLES: AppRole[] = ["implantador", "mecanico", "admin"];

export class NoPermissionError extends Error {
  constructor() {
    super("Usuário sem permissão. Contate o administrador.");
    this.name = "NoPermissionError";
  }
}

type AuthContextValue = {
  user: User | null;
  role: AppRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ role: AppRole }>;
  signOut: () => Promise<void>;
};

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

async function fetchRole(userId: string): Promise<AppRole | null> {
  const { data, error } = await supabase
    .from("users")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return null;
  const role = data.role as string;
  return (VALID_ROLES as string[]).includes(role) ? (role as AppRole) : null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [role, setRole] = React.useState<AppRole | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;
    console.log("[Auth] mount");

    // Listener PRIMEIRO, depois getSession (guideline Supabase)
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      console.log("[Auth] onAuthStateChange", event, !!session);
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      // Garante que loading nunca trava: ao receber qualquer evento, libera UI
      setLoading(false);

      if (nextUser) {
        // Defer fetch para evitar deadlock dentro do callback
        setTimeout(async () => {
          const r = await fetchRole(nextUser.id);
          if (!mounted) return;
          if (!r) {
            await supabase.auth.signOut();
            setUser(null);
            setRole(null);
          } else {
            setRole(r);
          }
        }, 0);
      } else {
        setRole(null);
      }
    });

    (async () => {
      try {
        console.log("[Auth] getSession start");
        const { data } = await supabase.auth.getSession();
        console.log("[Auth] getSession done", !!data.session);
        const session: Session | null = data.session;
        if (!mounted) return;
        const nextUser = session?.user ?? null;
        setUser(nextUser);

        if (nextUser) {
          const r = await fetchRole(nextUser.id);
          if (!mounted) return;
          if (!r) {
            await supabase.auth.signOut();
            setUser(null);
            setRole(null);
          } else {
            setRole(r);
          }
        }
      } catch (error) {
        console.error("[Auth] erro ao carregar sessão", error);
        if (!mounted) return;
        setUser(null);
        setRole(null);
      } finally {
        if (mounted) {
          console.log("[Auth] setLoading(false)");
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn = React.useCallback(
    async (email: string, password: string): Promise<{ role: AppRole }> => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error || !data.user) {
        throw error ?? new Error("Falha no login");
      }
      const r = await fetchRole(data.user.id);
      if (!r) {
        await supabase.auth.signOut();
        setUser(null);
        setRole(null);
        throw new NoPermissionError();
      }
      setUser(data.user);
      setRole(r);
      return { role: r };
    },
    [],
  );

  const signOut = React.useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
  }, []);

  const value = React.useMemo<AuthContextValue>(
    () => ({ user, role, loading, signIn, signOut }),
    [user, role, loading, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}

export function homeForRole(role: AppRole): "/admin" | "/mecanico" | "/implantador" {
  if (role === "admin") return "/admin";
  if (role === "mecanico") return "/mecanico";
  return "/implantador";
}
