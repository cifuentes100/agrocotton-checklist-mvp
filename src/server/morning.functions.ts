import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sendMorningMessages } from "@/lib/whatsapp-bot-logic";

/**
 * Dispara as mensagens de "bom dia" agora pra TODOS os operadores,
 * ignorando horário e anti-duplicata. Útil pra testes do admin.
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

    const result = await sendMorningMessages({ force: true });
    return result;
  });
