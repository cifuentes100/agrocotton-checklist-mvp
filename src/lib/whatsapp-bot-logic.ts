/**
 * Lógica do bot WhatsApp para o checklist do operador.
 *
 * MÁQUINA DE ESTADOS (por item):
 *   AGUARDA_TEXTO  → operador manda "ok" / "nok" / texto livre
 *   AGUARDA_FOTO   → operador manda foto (RF-03 obrigatório)
 *   ITEM_FECHADO   → grava item_response, avança pro próximo item
 *
 * Persistência do estado parcial: usamos a flag `validation_status='pending_photo'`
 * num registro temporário em `item_responses` que só ganha photo_path real quando
 * a foto chega. Após foto: `validation_status=null` (estado normal).
 *
 * REGRAS DE NEGÓCIO:
 *  - Anti-duplicata: se o operador já completou um run nas últimas 12h, bot responde
 *    "checklist de hoje já foi feito" e não cria novo. (machines.status fica 'ready'
 *    sempre — só vira 'maintenance' quando mecânico flipa).
 *  - Resposta de texto:
 *      "ok"  → status='ok'
 *      "nok" → status='nok'
 *      qualquer outra coisa → status='observar', observation=texto
 *  - Após texto, bot pede foto. RF-03 exige foto em TODOS os status.
 *  - Quando todos os 12 itens completam (texto+foto), run vira 'completed' e bot
 *    fecha com "🤠 Vamo cavalo!" (RF-31).
 *
 * IMPORTANTE: phones em `users` são salvos COM '+', ex: "+556299677410".
 * O webhook da whapi entrega `from` SEM '+' (só dígitos), então sempre prefixamos.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const COOLDOWN_HOURS = 12;
const BUCKET = "checklist-photos";
const REFERENCE_BUCKET = "reference-photos";
const SIGNED_URL_TTL_SECONDS = 600; // 10 min

export type WhatsAppInbound =
  | { kind: "text"; text: string }
  | { kind: "image"; mediaId?: string; mediaLink?: string; caption?: string };

// -------------------- WhatsApp send helpers --------------------

/** Loga mensagem outbound em whatsapp_messages (best-effort, nunca bloqueia o fluxo). */
async function logOutbound(
  phone: string,
  messageType: "text" | "image",
  body: string | null,
  status: "sent" | "error",
  error: string | null,
) {
  try {
    const db = supabaseAdmin as any;
    await db.from("whatsapp_messages").insert({
      direction: "outbound",
      phone,
      message_type: messageType,
      body,
      status,
      error,
    });
  } catch (e) {
    console.error("[wa-bot] failed to log outbound:", e);
  }
}

export async function sendWhatsAppMessage(to: string, text: string) {
  const token = process.env.WHAPI_TOKEN;
  if (!token) {
    await logOutbound(to, "text", text, "error", "WHAPI_TOKEN not configured");
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
      await logOutbound(to, "text", text, "error", `${res.status}: ${responseText.slice(0, 500)}`);
      return { ok: false, error: `${res.status}: ${responseText}` };
    }
    await logOutbound(to, "text", text, "sent", null);
    return { ok: true, response: responseText };
  } catch (err) {
    console.error("[wa-bot] send exception:", err);
    const msg = err instanceof Error ? err.message : String(err);
    await logOutbound(to, "text", text, "error", msg);
    return { ok: false, error: msg };
  }
}

/**
 * Envia uma imagem (via URL) com caption opcional pelo whapi.cloud.
 *   POST https://gate.whapi.cloud/messages/image
 *   Body: { to, media: <url>, caption? }
 */
export async function sendWhatsAppImage(
  to: string,
  imageUrl: string,
  caption?: string,
) {
  const token = process.env.WHAPI_TOKEN;
  const logBody = caption ? `[image] ${caption}` : `[image] ${imageUrl}`;
  if (!token) {
    await logOutbound(to, "image", logBody, "error", "WHAPI_TOKEN not configured");
    return { ok: false, error: "WHAPI_TOKEN not configured" };
  }
  try {
    const res = await fetch("https://gate.whapi.cloud/messages/image", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: `${to}@s.whatsapp.net`,
        media: imageUrl,
        caption: caption ?? undefined,
      }),
    });
    const responseText = await res.text();
    if (!res.ok) {
      console.error(
        `[wa-bot] image send failed [${res.status}]: ${responseText}`,
      );
      await logOutbound(to, "image", logBody, "error", `${res.status}: ${responseText.slice(0, 500)}`);
      return { ok: false, error: `${res.status}: ${responseText}` };
    }
    await logOutbound(to, "image", logBody, "sent", null);
    return { ok: true, response: responseText };
  } catch (err) {
    console.error("[wa-bot] image send exception:", err);
    const msg = err instanceof Error ? err.message : String(err);
    await logOutbound(to, "image", logBody, "error", msg);
    return { ok: false, error: msg };
  }
}

/**
 * Envia a pergunta do item, com a foto de referência (se existir) como mídia
 * e o texto da pergunta na caption. Fallback pra texto puro se não houver foto.
 *
 * Prioridade pra escolher a foto:
 *   1. machine_reference_photos (machine_id, item_id) — específico desta máquina
 *   2. checklist_items.reference_correct_path — fallback do catálogo
 */
async function sendItemQuestion(
  phone: string,
  machineId: string,
  itemNumber: number,
  total: number,
  item: { id: number; name: string; description: string | null },
): Promise<void> {
  const db = supabaseAdmin as any;
  const caption = formatQuestion(itemNumber, total, item.name, item.description);

  // 1. tentar machine_reference_photos
  let refPath: string | null = null;
  const { data: machineRef } = await db
    .from("machine_reference_photos")
    .select("path")
    .eq("machine_id", machineId)
    .eq("item_id", item.id)
    .maybeSingle();
  if (machineRef?.path) {
    refPath = machineRef.path as string;
  } else {
    // 2. fallback: catálogo
    const { data: catalogItem } = await db
      .from("checklist_items")
      .select("reference_correct_path")
      .eq("id", item.id)
      .maybeSingle();
    if (catalogItem?.reference_correct_path) {
      refPath = catalogItem.reference_correct_path as string;
    }
  }

  if (!refPath) {
    await sendWhatsAppMessage(phone, caption);
    return;
  }

  // Gera signed URL no bucket privado de referência
  const { data: signed, error: signErr } = await db.storage
    .from(REFERENCE_BUCKET)
    .createSignedUrl(refPath, SIGNED_URL_TTL_SECONDS);

  if (signErr || !signed?.signedUrl) {
    console.error(
      `[wa-bot] signed url failed for ${refPath}:`,
      signErr ?? "no url returned",
    );
    await sendWhatsAppMessage(phone, caption);
    return;
  }

  const r = await sendWhatsAppImage(phone, signed.signedUrl, caption);
  if (!r.ok) {
    // se imagem falhar, manda só o texto pra não perder o fluxo
    await sendWhatsAppMessage(phone, caption);
  }
}


/**
 * Baixa mídia da whapi e sobe no bucket checklist-photos.
 * Retorna o `path` salvo (ou null em erro).
 */
async function downloadAndStorePhoto(
  inbound: Extract<WhatsAppInbound, { kind: "image" }>,
  runId: string,
  itemId: number,
): Promise<{ path: string | null; error?: string }> {
  const token = process.env.WHAPI_TOKEN;
  if (!token) return { path: null, error: "WHAPI_TOKEN not configured" };

  let url: string | null = inbound.mediaLink ?? null;
  if (!url && inbound.mediaId) {
    url = `https://gate.whapi.cloud/media/${inbound.mediaId}`;
  }
  if (!url) return { path: null, error: "no media url" };

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const txt = await res.text();
      return { path: null, error: `download ${res.status}: ${txt.slice(0, 200)}` };
    }
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const ext = contentType.includes("png")
      ? "png"
      : contentType.includes("webp")
        ? "webp"
        : "jpg";
    const buf = new Uint8Array(await res.arrayBuffer());
    const path = `runs/${runId}/${itemId}-${Date.now()}.${ext}`;

    const db = supabaseAdmin as any;
    const { error: upErr } = await db.storage
      .from(BUCKET)
      .upload(path, buf, { contentType, upsert: false });
    if (upErr) {
      return { path: null, error: `upload: ${upErr.message ?? String(upErr)}` };
    }
    return { path };
  } catch (err) {
    return {
      path: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// -------------------- Helpers de formatação --------------------

function formatQuestion(
  itemNumber: number,
  total: number,
  name: string,
  description: string | null,
): string {
  const desc = description?.trim() ? description : "";
  return `*[${itemNumber}/${total}] ${name}*\n${desc ? `_${desc}_\n\n` : "\n"}Responda *ok* (sem foto), *nok* (com foto) ou um texto livre (com foto).`;
}

function askForPhoto(itemNumber: number, total: number, name: string): string {
  return `📷 Agora envie a *foto* do item *[${itemNumber}/${total}] ${name}* (RF-03).`;
}

// -------------------- Core: handleBotMessage --------------------

export async function handleBotMessage(
  fromPhone: string,
  inbound: WhatsAppInbound,
): Promise<string> {
  const db = supabaseAdmin as any;
  const phoneWithPlus = `+${fromPhone}`;

  // 1. Operador?
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

  // 1.5. KILL: encerra qualquer run ativa sem iniciar nova (útil para testes).
  if (inbound.kind === "text" && inbound.text.trim().toLowerCase() === "kill") {
    const { data: activeRun } = await db
      .from("checklist_runs")
      .select("id")
      .eq("operator_id", user.id)
      .eq("status", "in_progress")
      .maybeSingle();

    if (activeRun) {
      await db
        .from("checklist_runs")
        .update({ status: "cancelled", finished_at: new Date().toISOString() })
        .eq("id", activeRun.id);
      await sendWhatsAppMessage(
        fromPhone,
        `🛑 Checklist cancelado, ${user.name}. Manda *tomatoma* pra começar de novo.`,
      );
      return "bot:killed";
    }
    await sendWhatsAppMessage(
      fromPhone,
      `ℹ️ Você não tem checklist em andamento, ${user.name}.`,
    );
    return "bot:kill_noop";
  }

  // 2. Run ativa?
  const { data: runData } = await db
    .from("checklist_runs")
    .select("id, machine_id, started_at, status")
    .eq("operator_id", user.id)
    .eq("status", "in_progress")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  let run: { id: string; machine_id: string; started_at: string; status: string } | null = runData ?? null;

  // 3. Catálogo
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

  // 3.5. RESET: se operador mandar "tomatoma" exato e já tiver run ativa,
  // cancela a run atual e segue como se não houvesse run (vai criar nova).
  // Isso destrava casos em que o operador ficou perdido no meio do fluxo.
  const isResetTrigger =
    inbound.kind === "text" && inbound.text.trim().toLowerCase() === "tomatoma";
  if (run && isResetTrigger) {
    await db
      .from("checklist_runs")
      .update({
        status: "cancelled",
        finished_at: new Date().toISOString(),
      })
      .eq("id", run.id);
    await sendWhatsAppMessage(
      fromPhone,
      `🔄 Reiniciando seu checklist, ${user.name}… 🤠`,
    );
    // Deixa fluxo seguir como "sem run", o bloco abaixo vai criar uma nova.
    run = null;
  }

  // 4. Sem run ativa → exige gatilho explícito "tomatoma" + cooldown 12h + abre nova
  if (!run) {
    // Gatilho estrito: só `tomatoma` (lowercase, exato, sem nada antes/depois) inicia.
    // Imagem ou qualquer outro texto recebe orientação e NADA é gravado no banco.
    const isTrigger = inbound.kind === "text" && inbound.text === "tomatoma";
    const isFernando = phoneWithPlus === "+5562999549759";
    const isEsposa = phoneWithPlus === "+555591299413";
    if (!isTrigger) {
      const greeting = isFernando
        ? `Você por aqui patrãozinho? É o Fernando, vai querer testar o bot agora! 🤠 Manda *tomatoma* (em minúsculas) pra começar.`
        : isEsposa
        ? `Você por aqui Mulé? 💛 Manda *tomatoma* (em minúsculas) pra começar o checklist.`
        : `Olá, ${user.name}! 🤠 Para iniciar o checklist, envie a palavra *tomatoma* (exatamente assim, em minúsculas).`;
      await sendWhatsAppMessage(fromPhone, greeting);
      return "bot:awaiting_trigger";
    }

    // NOTE: cooldown de 12h removido do caminho do `tomatoma` — gatilho manual
    // sempre força reinício (útil para demo/validação). O cooldown natural
    // continua existindo via mensagem automática "bom dia" (1x/dia).

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
        "⚠️ Nenhuma máquina disponível (status 'ready'). Avise o implantador ou o mecânico.",
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
    const startGreeting = isFernando
      ? `Você por aqui patrãozinho? É o Fernando, vai querer testar o bot agora! 👋\nIniciando checklist da máquina *${machine.serial}* (${machine.model}).`
      : isEsposa
      ? `Você por aqui Mulé? 💛\nIniciando checklist da máquina *${machine.serial}* (${machine.model}).`
      : `Olá, ${user.name}! 👋\nIniciando checklist da máquina *${machine.serial}* (${machine.model}).`;
    await sendWhatsAppMessage(fromPhone, startGreeting);
    await sendItemQuestion(fromPhone, machine.id, 1, total, first);
    return "bot:run_started";
  }

  // 5. Run ativa — descobrir estado: AGUARDA_TEXTO ou AGUARDA_FOTO
  // Buscar TODAS as respostas do run pra reconstruir o estado.
  const { data: responses } = await db
    .from("item_responses")
    .select("id, item_id, status, photo_path, observation, validation_status")
    .eq("run_id", run.id);

  const allResponses = responses ?? [];
  const completed = allResponses.filter(
    (r: any) => r.validation_status !== "pending_photo",
  );
  const pendingPhoto = allResponses.find(
    (r: any) => r.validation_status === "pending_photo",
  );

  const completedCount = completed.length;

  // Se já tem 12 itens fechados, fecha a run (edge-case)
  if (completedCount >= total && !pendingPhoto) {
    await db
      .from("checklist_runs")
      .update({
        status: "completed",
        finished_at: new Date().toISOString(),
      })
      .eq("id", run.id);
    await sendWhatsAppMessage(
      fromPhone,
      `🤠 Vamo cavalo! Checklist concluído (${total}/${total}).`,
    );
    return "bot:already_complete";
  }

  // ---------- ESTADO: AGUARDA_FOTO ----------
  if (pendingPhoto) {
    const currentItem = items.find((i: any) => i.id === pendingPhoto.item_id);
    const itemNumber = (currentItem?.order_idx ?? completedCount + 1) as number;

    if (inbound.kind !== "image") {
      await sendWhatsAppMessage(
        fromPhone,
        `📷 Estou aguardando a *foto* do item *[${itemNumber}/${total}] ${currentItem?.name ?? ""}*.\nEnvie a foto agora (RF-03).`,
      );
      return "bot:awaiting_photo";
    }

    // Baixa + armazena
    const { path, error: photoErr } = await downloadAndStorePhoto(
      inbound,
      run.id,
      pendingPhoto.item_id,
    );
    if (!path) {
      console.error("[wa-bot] photo store failed:", photoErr);
      await sendWhatsAppMessage(
        fromPhone,
        `❌ Erro ao salvar foto: ${photoErr ?? "desconhecido"}. Tente enviar novamente.`,
      );
      return "bot:photo_store_failed";
    }

    // Update do registro pendente: vira definitivo
    const { error: updErr } = await db
      .from("item_responses")
      .update({
        photo_path: path,
        validation_status: null,
      })
      .eq("id", pendingPhoto.id);

    if (updErr) {
      console.error("[wa-bot] failed to finalize response:", updErr);
      await sendWhatsAppMessage(
        fromPhone,
        "❌ Erro ao registrar foto. Tente novamente.",
      );
      return "bot:photo_finalize_failed";
    }

    const newCompletedCount = completedCount + 1;
    if (newCompletedCount >= total) {
      await db
        .from("checklist_runs")
        .update({
          status: "completed",
          finished_at: new Date().toISOString(),
        })
        .eq("id", run.id);
      await sendWhatsAppMessage(
        fromPhone,
        `🤠 Vamo cavalo! Checklist concluído (${total}/${total}).`,
      );
      return "bot:completed";
    }

    const next = items[newCompletedCount];
    await sendWhatsAppMessage(fromPhone, `✅ Foto recebida.`);
    await sendItemQuestion(
      fromPhone,
      run.machine_id,
      newCompletedCount + 1,
      total,
      next,
    );
    return "bot:next_question";
  }

  // ---------- ESTADO: AGUARDA_TEXTO ----------
  const currentItem = items[completedCount];

  if (inbound.kind !== "text") {
    // Recebeu foto sem ter sido pedida ainda — orienta
    await sendWhatsAppMessage(
      fromPhone,
      `Antes da foto, responda em texto: *ok*, *nok* ou observação para o item *[${completedCount + 1}/${total}] ${currentItem.name}*.`,
    );
    return "bot:expected_text_got_image";
  }

  const trimmed = inbound.text.trim();
  const lower = trimmed.toLowerCase();
  let status: "ok" | "nok" | "observar";
  let observation: string | null = null;
  // Detecção tolerante:
  //   "nok", "não ok", "não tá ok", "não está ok" → nok
  //   "ok", "Ok", "Está ok", "tá ok"              → ok
  //   qualquer outra coisa                        → observar (texto livre)
  const hasNok = /\bnok\b|n[ãa]o\s*(t[áa]\s*|est[áa]\s*)?ok/.test(lower);
  const hasOk = /\bok\b/.test(lower);
  if (hasNok) {
    status = "nok";
    if (lower !== "nok") observation = trimmed;
  } else if (hasOk) {
    status = "ok";
  } else {
    status = "observar";
    observation = trimmed;
  }

  // Decisão (28/04/2026): RF-03 flexibilizado. OK fecha o item sem foto;
  // NOK e texto livre seguem exigindo foto.
  const isOk = status === "ok";

  const { error: respErr } = await db.from("item_responses").insert({
    run_id: run.id,
    item_id: currentItem.id,
    status,
    observation,
    photo_path: "",
    validation_status: isOk ? null : "pending_photo",
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

  if (!isOk) {
    await sendWhatsAppMessage(
      fromPhone,
      askForPhoto(completedCount + 1, total, currentItem.name),
    );
    return "bot:awaiting_photo_after_text";
  }

  // OK direto: fecha o item e avança (mesma lógica do AGUARDA_FOTO ao receber foto).
  const newCompletedCount = completedCount + 1;
  if (newCompletedCount >= total) {
    await db
      .from("checklist_runs")
      .update({
        status: "completed",
        finished_at: new Date().toISOString(),
      })
      .eq("id", run.id);
    await sendWhatsAppMessage(
      fromPhone,
      `🤠 Vamo cavalo! Checklist concluído (${total}/${total}).`,
    );
    return "bot:completed";
  }

  const next = items[newCompletedCount];
  await sendWhatsAppMessage(fromPhone, `✅ OK`);
  await sendItemQuestion(
    fromPhone,
    run.machine_id,
    newCompletedCount + 1,
    total,
    next,
  );
  return "bot:next_question_after_ok";
}

// -------------------- Morning trigger --------------------

function nowSaoPauloHHMM(): string {
  const fmt = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date());
  const hh = parts.find((p) => p.type === "hour")?.value ?? "00";
  const mm = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${hh}:${mm}:00`;
}

function todaySaoPauloDate(): string {
  // en-CA → "YYYY-MM-DD"
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Envia "bom dia" para operadores.
 *  - force=false (cron a cada minuto): filtra por morning_enabled=true e
 *    morning_time = HH:MM atual em São Paulo. Anti-duplicata diária via
 *    morning_dispatches (unique user_id+dispatched_on).
 *  - force=true (botão admin): envia pra todos operadores, ignorando filtro
 *    e dedup. Usado pra teste manual.
 */
export async function sendMorningMessages(
  opts: { force?: boolean } = {},
): Promise<{
  sent: number;
  skipped: number;
  errors: string[];
}> {
  const db = supabaseAdmin as any;
  const force = opts.force === true;

  let query = db
    .from("users")
    .select("id, name, phone, morning_time, morning_enabled")
    .eq("role", "operador");

  if (!force) {
    const hhmm = nowSaoPauloHHMM();
    query = query.eq("morning_enabled", true).eq("morning_time", hhmm);
  }

  const { data: operators, error } = await query;
  if (error) {
    return { sent: 0, skipped: 0, errors: [`query failed: ${error.message}`] };
  }

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];
  const today = todaySaoPauloDate();

  for (const op of operators ?? []) {
    if (!op.phone) {
      errors.push(`${op.name ?? op.id}: no phone`);
      continue;
    }

    if (!force) {
      const { error: dedupErr } = await db
        .from("morning_dispatches")
        .insert({ user_id: op.id, dispatched_on: today });
      if (dedupErr) {
        if ((dedupErr as any).code === "23505") {
          skipped++;
          continue;
        }
        errors.push(`${op.name ?? op.id}: dedup ${dedupErr.message}`);
        continue;
      }
    }

    const phoneWithoutPlus = String(op.phone).replace("+", "");
    const r = await sendWhatsAppMessage(
      phoneWithoutPlus,
      `Bom dia, ${op.name}! 🌅 Hora do checklist. Manda *tomatoma* (em minúsculas) pra começar.`,
    );
    if (r.ok) {
      sent++;
    } else {
      errors.push(`${op.name ?? op.id}: ${r.error}`);
      if (!force) {
        await db
          .from("morning_dispatches")
          .delete()
          .eq("user_id", op.id)
          .eq("dispatched_on", today);
      }
    }
  }
  return { sent, skipped, errors };
}
