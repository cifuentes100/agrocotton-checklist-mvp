import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Webhook público da whapi.cloud (canal DEADPL-Y5ZLU, +55 61 99814 6922).
 *
 * Configurar no painel whapi.cloud (Settings → Webhooks):
 *   URL:    https://agrocheck-hub.lovable.app/api/public/whatsapp/webhook?token=<WEBHOOK_SECRET>
 *   Mode:   POST
 *   Events: messages
 *
 * NOTA: whapi.cloud NÃO suporta headers customizados no webhook.
 * Por isso autenticamos via query param `?token=...` em vez de
 * `Authorization: Bearer`.
 *
 * Hardenings aplicados (na ordem do handler de cada mensagem):
 *   1. Validação de origem via WEBHOOK_SECRET (query param ?token=...)
 *   2. Filtro from_me
 *   3. Idempotência via tabela wa_processed (PK message_id)
 *   4. Grupos (@g.us) — apenas persistir, não responder (RF-32 passivo)
 *   5. Mensagens não-texto — responder com aviso ao operador
 *
 * Comportamento do bot: echo simples ("🤖 Recebi: «...»") como ponto de partida
 * para o fluxo do checklist (RF-31). State machine virá em iteração futura.
 */

type WhapiMessage = {
  id: string;
  from_me: boolean;
  type: string;
  chat_id: string; // termina em @s.whatsapp.net (1:1) ou @g.us (grupo)
  from: string; // só dígitos, ex: "5564999999999"
  timestamp: number;
  text?: { body: string };
  [k: string]: unknown;
};

type WhapiInbound = {
  messages?: WhapiMessage[];
  event?: { type: string; event: string };
  channel_id?: string;
  [k: string]: unknown;
};

/**
 * Resumo seguro dos headers para log: mascara qualquer header
 * que possa conter token/credencial.
 */
function headerSummary(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  const SENSITIVE = new Set([
    "authorization",
    "token",
    "x-api-key",
    "apikey",
    "cookie",
    "x-auth-token",
  ]);
  headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (SENSITIVE.has(lower)) {
      out[key] = `<present:${value.length}chars>`;
    } else {
      out[key] = value.length > 200 ? value.slice(0, 200) + "…" : value;
    }
  });
  return out;
}

/**
 * Envia mensagem de texto via whapi.cloud.
 *   POST https://gate.whapi.cloud/messages/text
 *   Headers: Authorization: Bearer <WHAPI_TOKEN>
 *   Body: { to: "<phone>@s.whatsapp.net", body: "..." }
 */
async function sendWhapiText(phone: string, text: string) {
  const token = process.env.WHAPI_TOKEN;
  if (!token) {
    console.warn("[whatsapp/webhook] WHAPI_TOKEN not configured");
    return { ok: false, error: "whapi not configured" };
  }
  try {
    const res = await fetch("https://gate.whapi.cloud/messages/text", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: `${phone}@s.whatsapp.net`,
        body: text,
      }),
    });
    const responseText = await res.text();
    if (!res.ok) {
      console.error(
        `[whatsapp/webhook] whapi send failed [${res.status}]: ${responseText}`,
      );
      return { ok: false, error: `${res.status}: ${responseText}` };
    }
    return { ok: true, response: responseText };
  } catch (err) {
    console.error("[whatsapp/webhook] whapi send exception:", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Processa uma única mensagem da whapi aplicando os hardenings.
 * Retorna um descritor curto pro log/resposta.
 */
async function handleSingleMessage(msg: WhapiMessage): Promise<string> {
  const db = supabaseAdmin as any;

  // [2] Filtro from_me — não reagir às próprias mensagens do bot
  if (msg.from_me) return "skip:from_me";

  // [3] Idempotência: whapi reenvia callback em falha, garantir unicidade
  const { data: exists } = await db
    .from("wa_processed")
    .select("message_id")
    .eq("message_id", msg.id)
    .maybeSingle();
  if (exists) return "skip:already_processed";

  // Marca como processado ANTES dos side-effects.
  // Se duas instâncias correrem em paralelo, a PK garante unicidade.
  const { error: insertProcessedErr } = await db
    .from("wa_processed")
    .insert({ message_id: msg.id });
  if (insertProcessedErr) {
    // 23505 = unique_violation = outra instância já pegou. Pula sem erro.
    if ((insertProcessedErr as any).code === "23505") {
      return "skip:race_already_processed";
    }
    console.error(
      "[whatsapp/webhook] wa_processed insert failed:",
      insertProcessedErr,
    );
    // Segue mesmo assim — preferimos duplicar resposta a perder mensagem
  }

  const phone = msg.from;
  const textBody = msg.text?.body ?? null;

  // [4] Grupos — RF-32 passivo: persiste, NÃO responde
  if (msg.chat_id.endsWith("@g.us")) {
    await db.from("whatsapp_messages").insert({
      direction: "inbound",
      phone,
      message_type: "group",
      body: textBody,
      external_id: msg.id,
      raw_payload: msg as any,
      status: "received",
    });
    return "group:logged_no_reply";
  }

  // Loga inbound 1:1
  await db.from("whatsapp_messages").insert({
    direction: "inbound",
    phone,
    message_type: msg.type ?? "unknown",
    body: textBody,
    external_id: msg.id,
    raw_payload: msg as any,
    status: "received",
  });

  // [5] Mensagens não-texto — responder com aviso, não ignorar silenciosamente
  if (msg.type !== "text") {
    const warnText =
      "Por enquanto só processo mensagens de texto. Em breve aceitaremos fotos.";
    const send = await sendWhapiText(phone, warnText);
    await db.from("whatsapp_messages").insert({
      direction: "outbound",
      phone,
      message_type: "text",
      body: warnText,
      status: send.ok ? "sent" : "failed",
      error: send.ok ? null : send.error,
      raw_payload: send.ok ? null : ({ error: send.error } as any),
    });
    return send.ok ? "non_text:warned" : "non_text:warn_failed";
  }

  // Echo bot
  const replyText = `🤖 Recebi: «${textBody ?? ""}»`;
  const send = await sendWhapiText(phone, replyText);
  await db.from("whatsapp_messages").insert({
    direction: "outbound",
    phone,
    message_type: "text",
    body: replyText,
    status: send.ok ? "sent" : "failed",
    error: send.ok ? null : send.error,
    raw_payload: send.ok ? null : ({ error: send.error } as any),
  });
  return send.ok ? "echo:sent" : "echo:failed";
}

export const Route = createFileRoute("/api/public/whatsapp/webhook")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // Health-check público (sem auth) — útil pra diagnosticar conectividade
        const url = new URL(request.url);
        console.log(
          `[whatsapp/webhook] GET ${url.pathname}${url.search} ` +
            `headers=${JSON.stringify(headerSummary(request.headers))}`,
        );
        return Response.json({
          ok: true,
          service: "whatsapp-webhook",
          provider: "whapi",
          method: "GET",
          configured: Boolean(process.env.WHAPI_TOKEN),
          auth_configured: Boolean(process.env.WEBHOOK_SECRET),
          hint: "POST aqui o payload da whapi.cloud usando ?token=<WEBHOOK_SECRET> na URL (whapi não suporta headers customizados)",
        });
      },
      OPTIONS: async () => {
        return new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
          },
        });
      },
      POST: async ({ request }) => {
        // [1] Validação de origem — PRIMEIRO de tudo, antes de ler o body
        // whapi.cloud NÃO suporta headers customizados no webhook; por isso
        // autenticamos via query param `?token=<WEBHOOK_SECRET>`.
        const expectedSecret = process.env.WEBHOOK_SECRET;
        if (!expectedSecret) {
          console.error("[whatsapp/webhook] WEBHOOK_SECRET not configured");
          return new Response("Server misconfigured", { status: 500 });
        }
        const reqUrl = new URL(request.url);
        const tokenParam = reqUrl.searchParams.get("token");
        if (tokenParam !== expectedSecret) {
          console.warn(
            "[whatsapp/webhook] Unauthorized POST — token query param mismatch " +
              `(present=${Boolean(tokenParam)}, len=${tokenParam?.length ?? 0})`,
          );
          return new Response("Unauthorized", { status: 401 });
        }

        // Agora sim, lê body e processa
        const rawBody = await request.text();
        console.log(
          `[whatsapp/webhook] POST ${reqUrl.pathname} ` +
            `headers=${JSON.stringify(headerSummary(request.headers))} ` +
            `bodyLen=${rawBody.length} bodyPreview=${rawBody.slice(0, 500)}`,
        );

        try {
          let payload: WhapiInbound;
          try {
            payload = rawBody ? JSON.parse(rawBody) : ({} as WhapiInbound);
          } catch {
            console.error("[whatsapp/webhook] Invalid JSON body");
            return new Response("Invalid JSON", { status: 400 });
          }

          const messages = Array.isArray(payload.messages)
            ? payload.messages
            : [];
          if (messages.length === 0) {
            return Response.json({
              ok: true,
              processed: 0,
              note: "no messages in payload",
            });
          }

          const results: string[] = [];
          for (const msg of messages) {
            try {
              if (!msg || typeof msg.id !== "string") {
                results.push("skip:invalid_message");
                continue;
              }
              const r = await handleSingleMessage(msg);
              results.push(r);
            } catch (err) {
              console.error(
                "[whatsapp/webhook] message handler exception:",
                err,
              );
              results.push("error:exception");
            }
          }

          return Response.json({ ok: true, processed: results.length, results });
        } catch (err) {
          console.error("[whatsapp/webhook] handler exception:", err);
          return Response.json(
            {
              ok: false,
              error: err instanceof Error ? err.message : String(err),
            },
            { status: 500 },
          );
        }
      },
    },
  },
});
