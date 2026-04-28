import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Dispara as mensagens de "bom dia" agora pra TODOS os operadores,
 * ignorando horário e anti-duplicata. Útil pra testes do admin.
 *
 * IMPORTANTE: a importação de `whatsapp-bot-logic` (que arrasta
 * `client.server.ts` e segredos de servidor) é DINÂMICA dentro do handler
 * para impedir que esse módulo entre no bundle do cliente. Caso contrário,
 * qualquer rota que importe este arquivo (ex: /admin/usuarios) falha ao
 * carregar com "Failed to fetch dynamically imported module".
 */
export const triggerMorningNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: caller } = await supabase
      .from("users")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    if (!caller || caller.role !== "admin") {
      throw new Error("Apenas admin pode disparar bom-dia manualmente");
    }

    const { sendMorningMessages } = await import("@/lib/whatsapp-bot-logic");
    const result = await sendMorningMessages({ force: true });
    return result;
  });
