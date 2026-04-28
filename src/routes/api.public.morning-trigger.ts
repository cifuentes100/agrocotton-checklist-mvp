import { createFileRoute } from "@tanstack/react-router";
import { sendMorningMessages } from "@/lib/whatsapp-bot-logic";

/**
 * Trigger das mensagens matinais (chamado por pg_cron a cada minuto).
 * Auth via query param ?token=<WEBHOOK_SECRET>.
 *
 * Comportamento:
 *  - default (force=false): envia apenas para operadores cujo morning_time
 *    bate com o minuto atual em America/Sao_Paulo, com anti-duplicata diária.
 *  - force=true: envia para TODOS operadores ativos, ignorando horário e dedup.
 *    Usado pelo botão "Disparar bom-dia agora" do admin.
 */
export const Route = createFileRoute("/api/public/morning-trigger")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expectedSecret = process.env.WEBHOOK_SECRET;
        if (!expectedSecret) {
          return new Response("Server misconfigured", { status: 500 });
        }
        const url = new URL(request.url);
        const token = url.searchParams.get("token");
        if (token !== expectedSecret) {
          return new Response("Unauthorized", { status: 401 });
        }
        const force = url.searchParams.get("force") === "1";

        const result = await sendMorningMessages({ force });
        return Response.json({ ok: true, force, ...result });
      },
    },
  },
});
