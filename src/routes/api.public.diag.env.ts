import { createFileRoute } from "@tanstack/react-router";

/**
 * Diagnóstico TEMPORÁRIO — lista quais env vars do Supabase/Uazapi
 * estão presentes no runtime do Worker (sem expor valores).
 *
 * REMOVER após o teste do webhook do WhatsApp.
 */
export const Route = createFileRoute("/api/public/diag/env")({
  server: {
    handlers: {
      GET: async () => {
        const keys = [
          "SUPABASE_URL",
          "SUPABASE_PUBLISHABLE_KEY",
          "SUPABASE_ANON_KEY",
          "SUPABASE_SERVICE_ROLE_KEY",
          "SUPABASE_JWKS",
          "SUPABASE_DB_URL",
          "UAZAPI_HOST",
          "UAZAPI_TOKEN",
          "LOVABLE_API_KEY",
        ] as const;

        const status: Record<string, { present: boolean; length: number }> = {};
        for (const k of keys) {
          const v = process.env[k];
          status[k] = { present: typeof v === "string" && v.length > 0, length: v?.length ?? 0 };
        }
        return Response.json({ ok: true, env: status });
      },
    },
  },
});
