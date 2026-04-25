import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Webhook público da uazapi.
 *
 * Configurar na uazapi (POST /webhook):
 *   {
 *     "url": "https://<seu-dominio>/api/public/whatsapp/webhook",
 *     "events": ["messages"],
 *     "excludeMessages": ["wasSentByApi"]
 *   }
 *
 * Por enquanto, este endpoint é um "echo bot": loga toda mensagem
 * recebida e responde "🤖 Recebi: <texto>" via uazapi /send/text.
 */

type UazapiInbound = {
  event?: string;
  EventType?: string;
  instance?: { id?: string; name?: string } | string;
  message?: {
    id?: string;
    messageid?: string;
    fromMe?: boolean;
    sender?: string; // ex: "5564999999999@s.whatsapp.net"
    chatid?: string;
    text?: string;
    content?: string;
    type?: string; // text, image, audio, etc
    mediaType?: string;
    [k: string]: unknown;
  };
  // Algumas versões mandam "data" em vez de "message"
  data?: any;
  [k: string]: unknown;
};

function normalizePhone(raw?: string): string | null {
  if (!raw) return null;
  // Remove tudo que não é dígito (tira "@s.whatsapp.net", "+", "-", " ")
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 10 ? digits : null;
}

function extractMessage(payload: UazapiInbound) {
  // Tenta nos formatos conhecidos da uazapi
  const m = payload.message ?? payload.data?.message ?? payload.data;
  if (!m || typeof m !== "object") return null;

  const fromMe = Boolean(m.fromMe ?? m.key?.fromMe);
  const sender: string | undefined =
    m.sender ?? m.chatid ?? m.key?.remoteJid ?? m.from;
  const phone = normalizePhone(sender);
  const text: string | undefined =
    m.text ??
    m.content ??
    m.body ??
    m.messageBody ??
    m.message?.conversation ??
    m.message?.extendedTextMessage?.text;
  const externalId: string | undefined =
    m.id ?? m.messageid ?? m.key?.id;
  const messageType: string =
    (m.type as string) ?? (m.mediaType as string) ?? "text";

  return { fromMe, phone, text, externalId, messageType };
}

async function sendUazapiText(phone: string, text: string) {
  const host = process.env.UAZAPI_HOST;
  const token = process.env.UAZAPI_TOKEN;
  if (!host || !token) {
    console.warn("[whatsapp/webhook] UAZAPI_HOST/UAZAPI_TOKEN not configured");
    return { ok: false, error: "uazapi not configured" };
  }
  const url = `${host.replace(/\/$/, "")}/send/text`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        token,
      },
      body: JSON.stringify({ number: phone, text }),
    });
    const responseText = await res.text();
    if (!res.ok) {
      console.error(
        `[whatsapp/webhook] uazapi send failed [${res.status}]: ${responseText}`,
      );
      return { ok: false, error: `${res.status}: ${responseText}` };
    }
    return { ok: true, response: responseText };
  } catch (err) {
    console.error("[whatsapp/webhook] uazapi send exception:", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export const Route = createFileRoute("/api/public/whatsapp/webhook")({
  server: {
    handlers: {
      GET: async () => {
        // Health-check simples
        return Response.json({
          ok: true,
          service: "whatsapp-webhook",
          configured: Boolean(process.env.UAZAPI_HOST && process.env.UAZAPI_TOKEN),
        });
      },
      POST: async ({ request }) => {
        let payload: UazapiInbound;
        try {
          payload = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const parsed = extractMessage(payload);

        // Loga o evento (mesmo que não tenhamos extraído nada útil)
        await supabaseAdmin.from("whatsapp_messages").insert({
          direction: "inbound",
          phone: parsed?.phone ?? "unknown",
          message_type: parsed?.messageType ?? "unknown",
          body: parsed?.text ?? null,
          external_id: parsed?.externalId ?? null,
          raw_payload: payload as any,
          status: parsed ? "received" : "unparsed",
        });

        // Ignora mensagens enviadas pela própria API
        if (!parsed || parsed.fromMe || !parsed.phone) {
          return Response.json({ ok: true, ignored: true });
        }

        // Echo bot
        const replyText = parsed.text
          ? `🤖 Recebi: «${parsed.text}»`
          : `🤖 Recebi uma mensagem do tipo "${parsed.messageType}". Por enquanto só respondo texto.`;

        const send = await sendUazapiText(parsed.phone, replyText);

        await supabaseAdmin.from("whatsapp_messages").insert({
          direction: "outbound",
          phone: parsed.phone,
          message_type: "text",
          body: replyText,
          status: send.ok ? "sent" : "failed",
          error: send.ok ? null : send.error,
          raw_payload: send.ok ? null : { error: send.error },
        });

        return Response.json({ ok: true, replied: send.ok });
      },
    },
  },
});
