import { createFileRoute } from "@tanstack/react-router";
import { sendMorningMessages } from "@/lib/whatsapp-bot-logic";

/**
 * Trigger das mensagens matinais (chamado por pg_cron ou manualmente).
 * Auth via query param ?token=<WEBHOOK_SECRET>.
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

        const result = await sendMorningMessages();
        return Response.json({ ok: true, ...result });
      },
    },
  },
});
