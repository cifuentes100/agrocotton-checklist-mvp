/**
 * Lógica do bot WhatsApp para o checklist do operador.
 *
 * Fluxo:
 *  - Operador manda qualquer mensagem → se não tem run ativa, abrimos uma na 1ª máquina READY e enviamos o 1º item.
 *  - Cada resposta subsequente é gravada em item_responses na ordem dos checklist_items (order_idx).
 *  - Resposta:
 *      "ok"  → status='ok'
 *      "nok" → status='nok'
 *      qualquer outra coisa → status='observar', observation=texto
 *  - Quando todos os itens forem respondidos, marcamos a run como completed.
 *
 * IMPORTANTE: phones em `users` são salvos COM '+', ex: "+556299677410".
 * O webhook da whapi entrega `from` SEM '+' (só dígitos), então sempre prefixamos.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function sendWhatsAppMessage(to: string, text: string) {
  const token = process.env.WHAPI_TOKEN;
  if (!token) {
    return { ok: false, error: "WHAPI_TOKEN not configured" };
  }
  try {
    const res = await fetch("https://gate.whapi.cloud/messages/text", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: `${to}@s.whatsapp.net`,
        body: text,
      }),
    });
    const responseText = await res.text();
    if (!res.ok) {
      console.error(
        `[wa-bot] send failed [${res.status}]: ${responseText}`,
      );
      return { ok: false, error: `${res.status}: ${responseText}` };
    }
    return { ok: true, response: responseText };
  } catch (err) {
    console.error("[wa-bot] send exception:", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function formatQuestion(
  itemNumber: number,
  total: number,
  name: string,
  description: string | null,
): string {
  const desc = description?.trim() ? description : "";
  return `*[${itemNumber}/${total}] ${name}*\n_${desc}_\n\nResponda: *ok*, *nok* ou texto livre.`;
}

export async function handleBotMessage(
  fromPhone: string,
  text: string,
): Promise<string> {
  const db = supabaseAdmin as any;
  const phoneWithPlus = `+${fromPhone}`;

  // 1. Busca operador
  const { data: user } = await db
    .from("users")
    .select("id, name, phone, role")
    .eq("phone", phoneWithPlus)
    .eq("role", "operador")
    .maybeSingle();

  if (!user) {
    await sendWhatsAppMessage(
      fromPhone,
      "👋 Olá! Seu número não está cadastrado como operador. Procure o responsável.",
    );
    return "bot:not_registered";
  }

  // 2. Run ativa
  const { data: run } = await db
    .from("checklist_runs")
    .select("id, machine_id, started_at, status")
    .eq("operator_id", user.id)
    .eq("status", "in_progress")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // 3. Todos os itens em ordem
  const { data: items, error: itemsErr } = await db
    .from("checklist_items")
    .select("id, order_idx, name, description")
    .order("order_idx", { ascending: true });

  if (itemsErr || !items || items.length === 0) {
    await sendWhatsAppMessage(
      fromPhone,
      "⚠️ Nenhum item de checklist configurado. Avise o implantador.",
    );
    return "bot:no_items";
  }
  const total = items.length;

  // 4. Sem run ativa → abre nova
  if (!run) {
    const { data: machine } = await db
      .from("machines")
      .select("id, serial, model")
      .eq("status", "ready")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!machine) {
      await sendWhatsAppMessage(
        fromPhone,
        "⚠️ Nenhuma máquina disponível (status 'ready'). Avise o implantador.",
      );
      return "bot:no_machine";
    }

    const { data: newRun, error: runErr } = await db
      .from("checklist_runs")
      .insert({
        operator_id: user.id,
        machine_id: machine.id,
        status: "in_progress",
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (runErr || !newRun) {
      console.error("[wa-bot] failed to create run:", runErr);
      await sendWhatsAppMessage(
        fromPhone,
        "❌ Erro ao iniciar checklist. Tente novamente em instantes.",
      );
      return "bot:run_create_failed";
    }

    const first = items[0];
    const intro =
      `Olá, ${user.name}! 👋\n` +
      `Iniciando checklist da máquina *${machine.serial}* (${machine.model}).\n\n` +
      formatQuestion(1, total, first.name, first.description);
    await sendWhatsAppMessage(fromPhone, intro);
    return "bot:run_started";
  }

  // 5. Run ativa → grava resposta do item corrente
  const { data: responses } = await db
    .from("item_responses")
    .select("item_id")
    .eq("run_id", run.id);

  const answeredCount = (responses ?? []).length;

  if (answeredCount >= total) {
    // Edge case: já respondeu tudo mas a run não foi fechada. Fecha agora.
    await db
      .from("checklist_runs")
      .update({
        status: "completed",
        finished_at: new Date().toISOString(),
      })
      .eq("id", run.id);
    await sendWhatsAppMessage(
      fromPhone,
      `✅ Checklist já estava concluído! ${answeredCount}/${total} itens.`,
    );
    return "bot:already_complete";
  }

  const currentItem = items[answeredCount];
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();
  let status: "ok" | "nok" | "observar";
  let observation: string | null = null;
  if (lower === "ok") {
    status = "ok";
  } else if (lower === "nok") {
    status = "nok";
  } else {
    status = "observar";
    observation = trimmed;
  }

  const { error: respErr } = await db.from("item_responses").insert({
    run_id: run.id,
    item_id: currentItem.id,
    status,
    observation,
    answered_at: new Date().toISOString(),
  });

  if (respErr) {
    console.error("[wa-bot] failed to insert response:", respErr);
    await sendWhatsAppMessage(
      fromPhone,
      "❌ Erro ao registrar resposta. Tente novamente.",
    );
    return "bot:response_insert_failed";
  }

  const newCount = answeredCount + 1;

  if (newCount >= total) {
    await db
      .from("checklist_runs")
      .update({
        status: "completed",
        finished_at: new Date().toISOString(),
      })
      .eq("id", run.id);
    await sendWhatsAppMessage(
      fromPhone,
      `✅ Checklist concluído! ${newCount}/${total} itens.`,
    );
    return "bot:completed";
  }

  const next = items[newCount];
  await sendWhatsAppMessage(
    fromPhone,
    formatQuestion(newCount + 1, total, next.name, next.description),
  );
  return "bot:next_question";
}

export async function sendMorningMessages(): Promise<{
  sent: number;
  errors: string[];
}> {
  const db = supabaseAdmin as any;
  const { data: operators, error } = await db
    .from("users")
    .select("id, name, phone")
    .eq("role", "operador");

  if (error) {
    return { sent: 0, errors: [`query failed: ${error.message}`] };
  }

  let sent = 0;
  const errors: string[] = [];
  for (const op of operators ?? []) {
    if (!op.phone) {
      errors.push(`${op.name ?? op.id}: no phone`);
      continue;
    }
    const phoneWithoutPlus = String(op.phone).replace("+", "");
    const r = await sendWhatsAppMessage(
      phoneWithoutPlus,
      `Bom dia, ${op.name}! 🌅 Hora do checklist. Responda qualquer coisa para iniciar.`,
    );
    if (r.ok) sent++;
    else errors.push(`${op.name ?? op.id}: ${r.error}`);
  }
  return { sent, errors };
}
