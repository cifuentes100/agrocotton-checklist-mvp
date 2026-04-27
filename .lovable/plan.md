## Status

Tudo já está desenhado. Estou em modo Plano (read-only), por isso não consegui aplicar diretamente. Aprove este plano e executo as 6 ações em sequência.

## Ação 1 — Secrets (ATENÇÃO: não tenho acesso à tool `add_secret` neste loop)

A tool de adicionar secrets não está disponível pra mim agora. Você vai precisar adicionar manualmente:

1. Abre **Project Settings → Cloud → Secrets**
2. Adiciona dois secrets:
   - `WHAPI_TOKEN` = `AhQsKL3V1PI4RgMD6LohXCvH9U9ih8i4`
   - `WEBHOOK_SECRET` = `wh_temp_2026_a7f3e9c2b8d4516e0f9a3c7b2d8e4f6a9c1b3d5e7f8a0b2c4d6e8f0a1b3c5d7e`

Sem esses 2 secrets, o webhook vai responder `500 Server misconfigured` (no POST) ou `configured: false` (no GET). O resto do código pode ser implantado independentemente — não há ordem obrigatória entre código e secrets.

## Ação 2 — Reescrita completa de `src/routes/api.public.whatsapp.webhook.ts`

Substituição integral do arquivo. Mudanças vs versão atual:

- **Tipos**: remove `UazapiInbound`. Adiciona `WhapiMessage` (id, from_me, type, chat_id, from, timestamp, text.body) e `WhapiInbound` (messages[], event, channel_id).
- **Envio**: remove `sendUazapiText`. Adiciona `sendWhapiText(phone, text)` chamando `POST https://gate.whapi.cloud/messages/text` com header `Authorization: Bearer ${WHAPI_TOKEN}` e body `{ to: "<phone>@s.whatsapp.net", body: text }`.
- **Handler POST** aplica os 5 hardenings na ordem exata:
  1. Auth: `if (request.headers.get('Authorization') !== 'Bearer ' + WEBHOOK_SECRET) return 401` — antes de ler body. Se `WEBHOOK_SECRET` não estiver setado, retorna 500.
  2. Loop em `payload.messages[]` chamando `handleSingleMessage(msg)`:
     - Filtro `if (msg.from_me) skip`
     - Idempotência: `select` em `wa_processed` por `message_id` + `insert` antes de side-effects (trata 23505 unique_violation como race resolvida)
     - Grupo: `if (msg.chat_id.endsWith('@g.us'))` → insert em `whatsapp_messages` com `message_type='group'`, NÃO responde
     - Não-texto: `if (msg.type !== 'text')` → responde "Por enquanto só processo mensagens de texto. Em breve aceitaremos fotos."
     - Default: echo `🤖 Recebi: «...»`
  3. Cada mensagem retorna um descritor curto (`echo:sent`, `skip:from_me`, `group:logged_no_reply`, etc) para a resposta JSON
- **Handler GET**: mantém public health-check, agora reporta `provider: "whapi"`, `configured: Boolean(WHAPI_TOKEN)`, `auth_configured: Boolean(WEBHOOK_SECRET)`
- **OPTIONS**: mantido pra CORS
- **Logs**: mantém `headerSummary` mascarando Authorization/token/cookie

Conteúdo completo do arquivo já está pronto (≈300 linhas). Escrita via `code--write` por substituição integral.

## Ação 3 — Atualizar `src/routes/api.public.diag.env.ts`

Edição cirúrgica nas linhas 22–25:

```diff
           "SUPABASE_DB_URL",
-          "UAZAPI_HOST",
-          "UAZAPI_TOKEN",
+          "WHAPI_TOKEN",
+          "WEBHOOK_SECRET",
           "LOVABLE_API_KEY",
```

Resto do arquivo intocado.

## Ação 4 — ADR-018 em `docs/AGROCOTTON_DECISIONS_LOG.md`

Inserir antes da linha 574 (`## 📝 Template para próximas decisões`) o ADR-018 completo (texto idêntico ao que você passou: contexto, decisão, 5 hardenings numerados, consequências, supersedes ADR-003). Separador `---` antes do template.

## Ação 5 — Atualizar `docs/AGROCOTTON_STATUS.md`

Três edições:

1. Linha 7: `**Última atualização:** 2026-04-25` → `2026-04-27`
2. Linha 8: `**Fase atual:** Segurança e versionamento — verificação final de RLS antes do Dashboard Admin` → `Bot WhatsApp — migração para whapi.cloud em execução`
3. Na seção **Bot WhatsApp** (linhas ~76–82), substituir os 6 checkboxes atuais por:
   - [x] Provedor WhatsApp definido: whapi.cloud (ADR-018)
   - [x] Canal DEADPL-Y5ZLU conectado (+55 61 99814 6922)
   - [x] Tabela wa_processed criada (idempotência)
   - [x] Webhook reescrito para whapi com 5 hardenings
   - [ ] WEBHOOK_SECRET definitivo (atualmente usando temporário)
   - [ ] Cron 05:30 kickoff matinal (Supabase pg_cron — pendente)
   - [ ] State machine do operador (seleção de máquina → 12 itens → foto OK/NOK)
   - [ ] Supervisão passiva em grupo enriquecida (RF-32)
   - [ ] Relatórios sob demanda (RF-33)

(Mantenho os 3 itens do bot que ainda estão pendentes mas movidos pro fundo, para não perder o backlog.)

## Ação 6 — Atualizar `.lovable/plan.md`

Acrescentar uma seção `## Execução 2026-04-27` no final (preservando todo o histórico) listando o que rodou:
- ✅ Tabela `wa_processed` criada (migration `20260427150529...`)
- ✅ Webhook reescrito (provider whapi, 5 hardenings)
- ✅ `diag/env` atualizado (WHAPI_TOKEN, WEBHOOK_SECRET)
- ✅ ADR-018 criado
- ✅ STATUS.md atualizado
- ⏳ Secrets `WHAPI_TOKEN` / `WEBHOOK_SECRET` pendentes — usuária adiciona manualmente
- ⏳ Configuração no painel whapi pendente — Cowork executa depois

## Não faço (respeitando seus limites)

- Não toco no painel whapi
- Não removo `UAZAPI_HOST`/`UAZAPI_TOKEN` dos secrets
- Não crio cron de kickoff matinal
- Não numero o ADR como 014 — uso 018

## Checklist final (que vou retornar depois da execução)

1. Lista de arquivos modificados/criados — virão 5: webhook.ts, diag/env.ts, DECISIONS_LOG.md, STATUS.md, plan.md
2. Confirmação dos secrets — vou avisar que **você precisa adicionar manualmente** (Ação 1) já que a tool não está disponível neste loop
3. Resposta esperada do GET `/api/public/whatsapp/webhook`:
   ```json
   {
     "ok": true, "service": "whatsapp-webhook", "provider": "whapi",
     "method": "GET", "configured": true, "auth_configured": true,
     "hint": "POST aqui o payload da whapi.cloud com header Authorization: Bearer <WEBHOOK_SECRET>"
   }
   ```
   (`configured` e `auth_configured` só ficam `true` depois que você adicionar os 2 secrets e republicar)
4. Resposta esperada do GET `/api/public/diag/env`: lista contendo `WHAPI_TOKEN` e `WEBHOOK_SECRET` em vez de `UAZAPI_*`
5. Build sem erros — vou confirmar após escrever (sintaxe TS limpa, tipos explícitos, sem imports quebrados)
6. ADR-018 — yes
