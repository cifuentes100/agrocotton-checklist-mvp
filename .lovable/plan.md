# Correção do bot WhatsApp + atualização dos docs

## Diagnóstico (validado contra o banco real)

1. **Bug crítico — `item_responses.photo_path` é NOT NULL sem default.**
   Toda resposta atual quebra com `null value in column "photo_path"`. Conflita com **RF-03** (foto obrigatória em OK/NOK) — fluxo de WhatsApp texto puro não satisfaz a regra.

2. **Trigger `trg_item_order` ativo** — exige `order_idx = último + 1`. Nosso bot respeita a ordem, mas é bom saber que existe.

3. **Telefones em `users` confirmados com `+`** (ex: `+556299677410`). Lógica `'+' + fromPhone` está correta.

4. **`machines.status` não é fechado quando a run termina.** Hoje a 1ª máquina `ready` fica eternamente disponível — o próximo "oi" do mesmo operador abriria nova run na mesma máquina (ou outra, se existir). Precisa virar `in_use` ao abrir e algum status final ao concluir.

5. **Docs desatualizados.** `STATUS.md` e `DECISIONS_LOG.md` ainda descrevem o bot como "echo simples". Não mencionam `whatsapp-bot-logic.ts`, `morning-trigger`, mapeamento ok/nok/observar, nem o fato de o RF-03 ainda não estar coberto pelo canal WhatsApp.

## Decisão pendente — RF-03 no WhatsApp

Como o operador vai mandar foto via WhatsApp? Três opções para o MVP:

- **(A) Aceitar `image` do whapi** — quando `msg.type === 'image'`, baixar do whapi, subir no bucket `checklist-photos`, salvar `photo_path`. Resposta atual ("ok"/"nok"/texto) vira **legenda da foto** ou mensagem seguinte. Mais fiel ao RF-03 mas dobra a complexidade.
- **(B) MVP texto-puro** — relaxar `photo_path` para nullable + default `''`, deixar foto como "TODO próxima iteração". Ganha velocidade, perde RF-03.
- **(C) Híbrido** — bot pede explicitamente "envie a foto agora" depois de cada `ok`/`nok`, registra foto separada, junta tudo no `item_response`. Mais conversacional, mais código.

**Recomendo (A)** — é a única que cumpre RF-03 e é factível agora.
Mas vou listar a fix mínima para destravar AGORA e fazer (A) numa segunda etapa, para você escolher.

## Etapa 1 — Fix mínimo (destravar inserção)

### 1.1 Migration
```sql
ALTER TABLE public.item_responses
  ALTER COLUMN photo_path SET DEFAULT '',
  ALTER COLUMN photo_path DROP NOT NULL;
```
(Permite inserção sem foto enquanto o canal foto não existe. Revertível depois.)

### 1.2 `src/lib/whatsapp-bot-logic.ts`
- Ao **abrir** uma run: `UPDATE machines SET status='in_use' WHERE id=...` (atomicamente, antes do insert da run).
- Ao **fechar** a run: `UPDATE machines SET status='completed'` (ou outro status acordado — preciso confirmar enum válido).
- Inserir `photo_path: ''` explicitamente no `item_responses.insert` (defesa em profundidade).

### 1.3 Confirmar `machines.status` válidos
Antes da migration, vou rodar `SELECT DISTINCT status FROM machines` para usar valores que já existem no enum/uso.

## Etapa 2 — RF-03 via foto do WhatsApp (opção A) — só se você aprovar

- Em `handleSingleMessage`: aceitar `msg.type === 'image'`, pegar `msg.image.link` do whapi, fazer `fetch`, subir no bucket `checklist-photos` como `runs/{run_id}/{item_id}.jpg`, salvar `photo_path`.
- Mudar fluxo do bot: depois de `ok`/`nok` em texto, bot pede "envie a foto"; resposta de imagem fecha o item e avança.
- Reverter `photo_path` para NOT NULL depois que estiver estável.

## Etapa 3 — Atualizar docs

### `docs/AGROCOTTON_STATUS.md`
- Seção "WhatsApp Bot" passa de "echo" para "state machine ativa (12 itens, ok/nok/observar)".
- Adicionar `morning-trigger` como o cron 05:30 (até então listado como pendente).
- Listar débito técnico: RF-03 ainda parcial (sem foto), Etapa 2 pendente.

### `docs/AGROCOTTON_DECISIONS_LOG.md`
- **ADR-014 — Bot WhatsApp: state machine de checklist no webhook**
  Decisão: substituir echo por máquina de estados; armazenar progresso via `item_responses`/`checklist_runs`; mapear texto livre como `observar`.
- **ADR-015 — Morning trigger autenticado por query param**
  Decisão: endpoint `POST /api/public/morning-trigger?token=WEBHOOK_SECRET` chamado por pg_cron.
- **ADR-016 — `item_responses.photo_path` temporariamente nullable**
  Decisão: relaxar constraint enquanto canal foto via WhatsApp não está pronto. Reverter após Etapa 2.

## Arquivos tocados

- `supabase/migrations/<ts>_relax_photo_path.sql` (nova)
- `src/lib/whatsapp-bot-logic.ts` (editar: lock de máquina + photo_path explícito)
- `docs/AGROCOTTON_STATUS.md` (editar)
- `docs/AGROCOTTON_DECISIONS_LOG.md` (editar)

## O que preciso de você

1. **Aprovar Etapa 1** (fix mínimo + docs) para destravar agora?
2. **Etapa 2 (foto via WhatsApp) — fazer agora junto, ou deixar para próxima iteração?**
3. **`machines.status` ao concluir a run — qual valor?** Sugiro `completed`, mas confirme se há outro padrão no projeto.
