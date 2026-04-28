## Diagnóstico

Analisei o run completo (`421015cb...`) e as mensagens recebidas. O que aconteceu:

1. Às **23:43:49** um run foi iniciado (provavelmente o "tomatoma" anterior).
2. A primeira pergunta (Cool Gard) provavelmente falhou em entregar a foto de referência — talvez o deploy novo do `sendItemQuestion` ainda não estava ativo, ou a primeira mensagem caiu. O operador respondeu "ok", "Está ok" e mandou uma foto, mas **nada foi gravado** no item 1 nesse momento (suspeito que houve falha silenciosa, ou o webhook não casou os textos com nenhum estado válido).
3. Às **23:59:18** o operador, sem ver a foto de referência, mandou **"tomatoma"** de novo achando que ia reiniciar.
4. Como já existia run ativa (`status='in_progress'`), o bot tratou "tomatoma" como **resposta de texto livre** do item 1 → gravou `status='observar', observation='tomatoma'` e pediu foto. Daí em diante o fluxo seguiu correto e as 11 fotos de referência seguintes vieram normalmente.

**Evidência:** `item_responses` do item 1 tem `observation: 'tomatoma'`, `answered_at: 23:59:19` — exatamente o segundo da mensagem "tomatoma".

## Causa raiz

O gatilho `tomatoma` **não tem prioridade** sobre uma run ativa. Hoje o código só checa `tomatoma` quando `!run`. Se já tem run em andamento (perdida, esquecida, no estado errado), o operador não consegue reiniciar — a palavra vira observação.

## Plano de correção

### 1. `tomatoma` sempre reseta o fluxo (com proteção)

No `handleBotMessage` (`src/lib/whatsapp-bot-logic.ts`):

- Antes do passo 4 (sem run), adicionar: **se a mensagem for exatamente `tomatoma` E já existe run ativa**, o bot:
  - Marca a run ativa como `status='cancelled'` (vamos aceitar 'cancelled' no constraint, ver passo 3) com `finished_at=now()`.
  - Responde: "Reiniciando seu checklist… 🤠"
  - Continua o fluxo como se não houvesse run ativa (cria novo run, manda "Olá operador", envia primeira pergunta com foto de referência).

Isso resolve o caso em que o operador fica preso e quer recomeçar.

### 2. Logar mensagens **outbound** do bot

Hoje só temos inbound em `whatsapp_messages`. Adicionar `INSERT` em `whatsapp_messages` (`direction='outbound'`) dentro de `sendWhatsAppMessage` e `sendWhatsAppImage` para conseguirmos depurar quando algo não chega no celular do operador. Salvar `body`, `phone`, `message_type` ('text' ou 'image') e qualquer erro.

### 3. Migração: aceitar `cancelled` no `checklist_runs.status`

```sql
ALTER TABLE public.checklist_runs DROP CONSTRAINT IF EXISTS checklist_runs_status_check;
ALTER TABLE public.checklist_runs ADD CONSTRAINT checklist_runs_status_check
  CHECK (status = ANY (ARRAY['in_progress','completed','cancelled']));
```

(Verificar se já existe esse check; se não existir, adicionar.)

### 4. Limpar o run de teste (opcional, recomendado)

Para o operador conseguir testar de novo agora sem esperar 12h de cooldown, marcar o run completed atual como `cancelled` via migração, **OU** simplesmente esperar o cooldown passar. Recomendo limpar via SQL pra destravar o teste.

## Detalhes técnicos

- Arquivo principal: `src/lib/whatsapp-bot-logic.ts`
- A lógica de gatilho `tomatoma` move para **antes** da checagem de run ativa.
- O log outbound não pode quebrar o fluxo: usar try/catch silencioso.
- Após aprovado, **republicar** pra ativar o webhook novo.

## Resultado esperado

- Operador pode mandar `tomatoma` a qualquer momento e sempre reinicia.
- Conseguimos auditar exatamente o que o bot enviou (texto + imagem) por número.
- Próximo teste vai ter "Olá operador… iniciando checklist" + foto de referência do Cool Gard como primeira mensagem.
