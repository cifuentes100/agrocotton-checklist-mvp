## Mudança no fluxo do checklist do operador

Hoje o bot exige foto em **todos** os itens (RF-03). Vamos relaxar essa regra: quando o operador responde **ok**, o item fecha imediatamente e o bot já manda a próxima pergunta. Foto continua obrigatória quando a resposta indica problema.

Foto de referência da máquina/item continua sendo enviada **sempre** junto com a pergunta (como hoje).

Botões interativos do WhatsApp ficam fora desta entrega.

## Regra nova

| Resposta do operador | O que acontece |
|---|---|
| `ok` (ou variantes "tá ok", "está ok") | Item fecha na hora com `status='ok'`, sem foto. Bot já dispara a próxima pergunta. |
| `nok` (ou "não ok", "não tá ok") | Bot pede foto. Item só fecha quando foto chega. `status='nok'`. |
| Texto livre (qualquer outra coisa) | Bot pede foto. Item só fecha quando foto chega. `status='observar'`, observação salva. |

Texto da pergunta vai mudar levemente pra deixar claro: "Responda *ok* (sem foto), *nok* (com foto) ou texto livre (com foto)."

Quando o item fecha com OK direto, bot manda confirmação curta tipo `✅ OK` antes da próxima pergunta, pra dar feedback.

## Impacto técnico

Arquivo único afetado: `src/lib/whatsapp-bot-logic.ts`, função `handleBotMessage`, no bloco **AGUARDA_TEXTO**.

Mudança: quando a resposta for classificada como `ok`, em vez de inserir `item_responses` com `validation_status='pending_photo'` e `photo_path=''`, inserimos direto como item finalizado (`photo_path=''`, `validation_status=null`) e seguimos a mesma lógica de "próxima pergunta / fim do checklist" que hoje só roda no bloco AGUARDA_FOTO.

Para `nok` e `observar` o comportamento atual continua igual (insere pendente, pede foto).

Pseudocódigo do trecho:

```text
classifica resposta → status
insere item_responses
if status == 'ok':
   validation_status = null, photo_path = ''
   newCompleted = completedCount + 1
   if newCompleted >= total: fecha run + "Vamo cavalo"
   else: envia "✅ OK" + próxima pergunta
else:
   validation_status = 'pending_photo'
   pede foto (fluxo atual)
```

## Pontos a confirmar / efeitos colaterais

- **Schema do `item_responses`**: `photo_path` é `NOT NULL DEFAULT ''`, então salvar string vazia em itens OK já funciona sem migração.
- **Tela do mecânico** (`ValidationDrawer`, `ValidationQueueCard`): hoje mostra a foto enviada. Itens OK passarão a não ter foto — vamos exibir um badge "OK sem foto" no lugar da imagem, sem quebrar layout. Validação continua liberada (mecânico ainda pode marcar como ok/refazer).
- **RF-03**: a regra "foto obrigatória em todos os status" deixa de valer pra OK. Vou registrar essa decisão no `docs/AGROCOTTON_DECISIONS_LOG.md` com a data e o motivo (velocidade do operador, evidência só onde há divergência).
- **Histórico** (`mecanico.historico.tsx`): provavelmente já tolera `photo_path` vazio porque o registro pendente sempre teve. Vou verificar e ajustar se necessário.
- **Reset/kill**: nada muda, gatilhos `tomatoma` e `kill` continuam iguais.

## Entregáveis

1. Editar `whatsapp-bot-logic.ts` com a nova lógica do bloco AGUARDA_TEXTO.
2. Atualizar texto da pergunta (`formatQuestion`) pra explicitar "ok = sem foto".
3. Ajustar `ValidationDrawer` / `ValidationQueueCard` pra renderizar bonito quando `photo_path` é vazio.
4. Adicionar entrada no `docs/AGROCOTTON_DECISIONS_LOG.md` registrando a flexibilização do RF-03.
