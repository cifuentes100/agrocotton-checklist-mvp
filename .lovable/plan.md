# Diagnóstico

Dois problemas confirmados nos logs:

**1. "Erro ao registrar resposta"** — o insert em `item_responses` é bloqueado por dois CHECK constraints da tabela:
- `item_responses_status_check`: só aceita `'ok'` ou `'nok'` (bot tenta gravar `'observar'` quando o operador escreve "Está ok")
- `item_responses_validation_status_check`: só aceita `'approved'` ou `'rejected'` (bot usa `'pending_photo'` como flag de estado parcial)

**2. Foto de referência não chega** — o bot nunca envia a foto de referência. A pergunta vem só com texto, sem a imagem do item correto pra comparação.

# O que vamos fazer

## Etapa 1 — Migration: relaxar constraints

Substituir os dois CHECKs:
- `status` passa a aceitar: `ok`, `nok`, `observar`
- `validation_status` passa a aceitar: `approved`, `rejected`, `pending_photo` (e `null`)

## Etapa 2 — Enviar foto de referência junto da pergunta

Quando o bot manda `[N/total] Item X` (na intro do checklist e a cada próximo item), buscar a foto de referência e enviar como **imagem** com o texto da pergunta na **caption**.

Ordem de prioridade pra encontrar a foto:
1. `machine_reference_photos` (path específico daquela máquina + item) — preferencial
2. `checklist_items.reference_correct_path` (fallback genérico do catálogo)
3. Se não tiver nenhuma, manda só texto (comportamento atual)

A foto é puxada do bucket privado `reference-photos` via signed URL (válida por 10min) e enviada pelo endpoint `https://gate.whapi.cloud/messages/image` da whapi.

## Etapa 3 — Resposta "Está ok" deve virar `ok`

Hoje "Está ok" cai em `observar` (status só aceita match exato `ok`/`nok`). Vou tornar a detecção mais tolerante:
- Se a mensagem **contém** `ok` (e não tem `nok`/negação) → `status='ok'`
- Se contém `nok` ou negação → `status='nok'`
- Caso contrário → `status='observar'` com o texto na `observation`

Exemplos:
- `ok`, `Ok`, `Está ok`, `tá ok` → `ok`
- `nok`, `não ok`, `não tá ok` → `nok`
- `tem vazamento` → `observar`

# Detalhes técnicos

**Migration (etapa 1):**
```sql
alter table public.item_responses drop constraint item_responses_status_check;
alter table public.item_responses add constraint item_responses_status_check
  check (status = any (array['ok','nok','observar']));

alter table public.item_responses drop constraint item_responses_validation_status_check;
alter table public.item_responses add constraint item_responses_validation_status_check
  check (validation_status is null or validation_status = any (array['approved','rejected','pending_photo']));
```

**Código (etapas 2 e 3) — `src/lib/whatsapp-bot-logic.ts`:**

- Nova função `sendWhatsAppImage(to, imageUrl, caption)` chamando `gate.whapi.cloud/messages/image`.
- Nova função `sendItemQuestion(phone, runMachineId, itemNumber, total, item)` que:
  1. Busca `machine_reference_photos` por `(machine_id, item_id)`; se não houver, usa `item.reference_correct_path`.
  2. Se tem path: gera signed URL no bucket `reference-photos` (10min) e manda como imagem com a pergunta na caption.
  3. Se não tem: envia só `formatQuestion(...)` como texto (comportamento atual).
- Substituir as três chamadas atuais que mandam pergunta:
  - intro do checklist (`bot:run_started`)
  - próximo item após foto (`bot:next_question`)
  - reforço quando recebeu foto fora de hora (manter texto puro)
- Refatorar a parsing de status:
  ```ts
  const lower = trimmed.toLowerCase();
  const hasNok = /\bnok\b|n[ãa]o\s*(t[áa]\s*)?ok|n[ãa]o\s*est[áa]\s*ok/.test(lower);
  const hasOk = /\bok\b/.test(lower);
  if (hasNok) status = "nok";
  else if (hasOk) status = "ok";
  else { status = "observar"; observation = trimmed; }
  ```

**Não muda:** state machine, anti-duplicata 12h, gatilho `tomatoma`, fluxo de foto do operador, RLS, bucket `checklist-photos`.

# Como verificar depois

1. Operador manda `tomatoma` → recebe **imagem** do item 1 (foto de referência) com a pergunta na caption.
2. Operador responde `ok` ou `Está ok` → bot pede a foto do operador (sem erro).
3. Operador manda foto → bot manda imagem do item 2 com a pergunta. E assim até o item 12.
4. No banco: `item_responses` ganha registros com `status` em {ok, nok, observar} e `validation_status='pending_photo'` durante a espera, virando `null` após a foto chegar.
