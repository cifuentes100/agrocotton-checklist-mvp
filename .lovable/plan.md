## Objetivo

Trocar o provedor do webhook para **whapi.cloud** com 5 hardenings antes de publicar:

1. ADR documentando mudança vs ADR-004
2. Idempotência via `wa_processed`
3. Auth `Authorization: Bearer <WEBHOOK_SECRET>`
4. Suporte passivo a grupo (`@g.us`) — RF-32
5. Resposta amigável quando msg não-texto

## Observação importante sobre o número do ADR

Você pediu **ADR-014**, mas esse número **já está usado** ("Governança de alterações de schema pelo Lovable", de 2026-04-24). O próximo livre é **ADR-018**. Vou criar como **ADR-018** e fazer ele referenciar ADR-004 explicitamente. Se preferir outro número, me avise antes de aprovar.

## O que eu (Lovable) faço quando aprovado

### Arquivos editados

#### 1. `src/routes/api.public.whatsapp.webhook.ts` — reescrita completa

Estrutura nova do handler:
```text
POST /api/public/whatsapp/webhook
├── 0. verifyWebhookAuth(request)      ← Bearer WEBHOOK_SECRET, timing-safe
│      ↳ falhou → 401 (sem ler body, sem logar payload)
├── 1. parse JSON body
├── 2. para cada msg em payload.messages[]:
│      ├── alreadyProcessed(msg.id)?   ← INSERT em wa_processed (PK = unique)
│      │      ↳ sim → skip
│      ├── insert em whatsapp_messages (inbound, status='received')
│      ├── from_me?                    → ignored
│      ├── chat_id termina em @g.us?   → insert em communications (kind='wa_group_inbound'), NÃO responde
│      ├── sem phone normalizável?     → ignored
│      ├── type === 'text'?            → reply "🤖 Recebi: «...»"
│      └── type !== 'text'?            → reply "Recebi (tipo X), por enquanto só respondo a texto..."
└── 3. POST whapi: https://gate.whapi.cloud/messages/text
       Headers: Authorization: Bearer <WHAPI_TOKEN>
       Body:    { to: phone, body: text }
```

Tipos novos: `WhapiMessage` (com `id`, `from_me`, `type`, `chat_id`, `from`, `text.body`) e `WhapiInbound` (com `messages[]`).

Funções novas: `verifyWebhookAuth`, `timingSafeEqual` (manual, sem Web Crypto), `isGroupChat`, `alreadyProcessed`, `sendWhapiText` (substitui `sendUazapiText`), `handleSingleMessage`.

GET continua existindo como health-check (sem auth — só reporta `provider: "whapi.cloud"` e quais secrets estão configuradas).

#### 2. `src/routes/api.public.diag.env.ts` — atualizar lista de envs

Trocar `UAZAPI_HOST`, `UAZAPI_TOKEN` por `WHAPI_TOKEN`, `WEBHOOK_SECRET`.

#### 3. `docs/AGROCOTTON_DECISIONS_LOG.md` — adicionar ADR-018 no final (antes do template)

```markdown
## ADR-018 — Webhook do WhatsApp roda no Lovable (whapi.cloud), cron 05:30 fica fora

**Data:** 2026-04-27
**Status:** ✅ Aceita
**Supersede parcialmente:** ADR-004

**Contexto:**
ADR-004 (22/04) estabeleceu que o bot WhatsApp inteiro ficaria FORA do Lovable
(em Edge Function Supabase ou similar). Durante a implementação, ficou claro
que o webhook reativo (echo bot, comandos passivos) é simples o bastante para
rodar diretamente como server route do TanStack Start no projeto Lovable,
aproveitando a mesma infraestrutura de auth, RLS e logs.

Provedor escolhido: **whapi.cloud** (já contratado, canal DEADPL-Y5ZLU, +55 61 99814-6922).
- Endpoint envio: POST https://gate.whapi.cloud/messages/text
- Auth: Authorization: Bearer <token>
- Webhook inbound: POST com body { messages[], event, channel_id }

**Decisão:**
1. **Webhook reativo (inbound + responses 1:1)** roda no Lovable em
   `/api/public/whatsapp/webhook` como TanStack Start server route.
2. **Cron matinal 05:30 (kickoff diário)** continua FORA do Lovable —
   provedor a definir (Supabase Edge Function + pg_cron, GitHub Actions,
   ou serviço externo). Lovable não tem agendador nativo confiável para
   horários fixos com timezone.
3. Endpoint do webhook é **autenticado** via header
   `Authorization: Bearer <WEBHOOK_SECRET>` (compartilhado com a whapi via
   header customizado configurado no painel).
4. **Idempotência obrigatória**: tabela `wa_processed (message_id PK)` impede
   reprocessamento quando whapi reenvia callback em falha.
5. **Grupos (chat_id @g.us)**: apenas registrar em `communications`, nunca
   responder automaticamente (RF-32). Lógica passiva detalhada vira ADR
   próprio depois.

**Consequências:**
- ✅ Webhook reaproveita Supabase admin client, RLS, secrets e logs do projeto
- ✅ Menos infraestrutura para manter no curto prazo
- ✅ Deploy automático junto com o resto do app
- ⚠️ Cron 05:30 ainda precisa ser construído fora — não foi resolvido aqui
- ⚠️ Lovable Worker tem limites de CPU/tempo por request — operações pesadas
  (ex: gerar PDF de relatório) vão ter que sair daqui no futuro
- ⚠️ ADR-004 fica parcialmente superseded (só na parte do webhook inbound)

**Relaciona-se com:** ADR-004 (parcialmente superseded), ADR-001 (Supabase mantido)
```

#### 4. `docs/AGROCOTTON_STATUS.md` — atualizar 4 menções

- Linha 58: "uazapi ou Cloud API" → "whapi.cloud"
- Linha 85: "Decisão: uazapi vs Cloud API" → marcar resolvida (ver ADR-018)
- Linha 86: "Webhook Edge Function" → "Webhook server route TanStack (`/api/public/whatsapp/webhook`)"
- Linhas 122-123: remover "ADR-003 pendente" (resolvida via ADR-018)
- Linha 129: idem

#### 5. `.lovable/plan.md` — substituir pelo plano executado

### Tabela nova (você executa, eu não tenho permissão)

Vou entregar a SQL e você cola no **SQL Editor do Supabase** (link no fim):

```sql
CREATE TABLE public.wa_processed (
  message_id text PRIMARY KEY,
  processed_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_wa_processed_processed_at
  ON public.wa_processed(processed_at DESC);

ALTER TABLE public.wa_processed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin le wa_processed"
ON public.wa_processed
FOR SELECT TO authenticated
USING (public.current_role() = 'admin');
```

### Secrets novos (você adiciona pelo Lovable Settings → Cloud → Secrets)

| Nome | Valor |
|---|---|
| `WHAPI_TOKEN` | `AhQsKL3V1PI4RgMD6LohXCvH9U9ih8i4` (do painel whapi) |
| `WEBHOOK_SECRET` | string aleatória forte (ex: gerar com `openssl rand -hex 32`); essa mesma string vai como header `Authorization: Bearer <secret>` no painel whapi |

Secrets existentes que **podem ser removidos depois** (não urgente, fazemos juntos numa próxima):
- `UAZAPI_HOST`
- `UAZAPI_TOKEN`

## Por que essa abordagem (decisões técnicas)

### Idempotência: tabela própria, não constraint em whatsapp_messages
- `whatsapp_messages` tem semântica de log (várias linhas com mesmo `external_id` se houver erro de gravação parcial)
- `wa_processed` é puramente sentinela: PK em `message_id`, INSERT antes de qualquer side-effect; race condition resolvida pelo próprio unique constraint do Postgres
- Erro 23505 (unique_violation) na tentativa de INSERT = "já processado, pula"

### Auth: Bearer header em vez de HMAC signature
- Whapi não documenta signing nativo; só permite headers customizados
- Bearer token compartilhado com comparação timing-safe é o padrão prático para esse provider
- `WEBHOOK_SECRET` separado do `WHAPI_TOKEN` (defesa em profundidade: vazar um não compromete o outro)

### timingSafeEqual manual em vez de Web Crypto
- Web Crypto SubtleCrypto não tem comparação timing-safe direta
- Implementação manual com XOR bit-a-bit é segura para strings curtas (<1KB) e roda no Worker

### Grupo: insere em `communications` em vez de `whatsapp_messages`
- `whatsapp_messages` continua sendo o "log do bot 1:1"
- `communications` já existe pra eventos cross-canal — kind=`wa_group_inbound` separa visualmente
- Se a lógica de grupo for crescer, fica fácil mover pra tabela própria depois

## O que NÃO está no escopo (fica pra depois)

- Cron 05:30 matinal — fora do Lovable, escopo separado
- Gravar fotos vindas pelo WhatsApp em Storage — só responde texto por enquanto
- Linkar `phone` em `whatsapp_messages` com `users.phone` (lookup do operador)
- Lógica passiva detalhada para mensagens em grupo (vira ADR próprio quando especificarmos)
- Comandos do bot ("status", "iniciar checklist") — echo bot puro por enquanto
- Remoção dos secrets `UAZAPI_HOST` / `UAZAPI_TOKEN` (deixo pra você fazer manual depois)

## Ordem de execução depois da sua aprovação

1. Eu reescrevo o webhook + diag/env + docs (5 arquivos)
2. **Você** cola a SQL no SQL Editor do Supabase
3. **Você** adiciona `WHAPI_TOKEN` e `WEBHOOK_SECRET` em Lovable Settings → Cloud → Secrets
4. **Você** publica o projeto
5. **Você** (Cowork) reconfigura URL do webhook na whapi para `https://agrocheck-hub.lovable.app/api/public/whatsapp/webhook` + header `Authorization: Bearer <WEBHOOK_SECRET>`
6. **Você** manda mensagem teste do seu WhatsApp pessoal pro número do canal — deve receber o eco

## Confirmações pedidas antes de executar

- ☐ OK usar **ADR-018** (porque ADR-014 já existe)? Se quiser outro número, me diga
- ☐ OK manter `UAZAPI_HOST`/`UAZAPI_TOKEN` nos secrets até remoção manual posterior?
- ☐ OK eu não tocar no painel whapi (você + Cowork fazem)?
