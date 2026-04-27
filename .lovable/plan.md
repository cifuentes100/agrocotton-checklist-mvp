# Gatilho `tomatoma` (estrito) para iniciar o checklist

## Objetivo

Substituir o comportamento atual ("qualquer mensagem inicia run nova") por um gatilho explícito: só a palavra `tomatoma` (exata, em minúsculas, sem nada antes/depois) inicia o checklist. Útil pra teste — evita que mensagens aleatórias do operador abram run sem querer.

## Mudança única em `src/lib/whatsapp-bot-logic.ts`

No bloco "sem run ativa" (passo 4 do `handleBotMessage`), antes do cooldown de 12h, adicionar um gate:

```ts
// Gatilho estrito: só `tomatoma` (lowercase, exato) inicia.
const isTrigger = inbound.kind === "text" && inbound.text === "tomatoma";
if (!isTrigger) {
  await sendWhatsAppMessage(
    fromPhone,
    `Olá, ${user.name}! 🤠 Para iniciar o checklist, envie a palavra *tomatoma* (exatamente assim, em minúsculas).`,
  );
  return "bot:awaiting_trigger";
}
```

Resto do fluxo intacto:
- Cooldown 12h continua valendo (mesmo com `tomatoma`, se já fez hoje, recebe "valeu cavalo").
- Run ativa → comportamento atual (texto = ok/nok/observação, depois foto).
- Imagem antes de `tomatoma` → cai no gate, recebe orientação, nada gravado.

## Comportamento esperado após a mudança

| Cenário | Antes | Depois |
|---|---|---|
| Operador manda "oi" sem run ativa | Abre run | "Envie *tomatoma* para iniciar" |
| Operador manda "tomatoma" sem run ativa | (não existia) | Abre run no item 1/12 |
| Operador manda "Tomatoma" / " tomatoma " / "tomatoma!" | (n/a) | Não inicia (estrito é estrito) |
| Operador manda "tomatoma" mas já fez hoje | (n/a) | "Checklist de hoje já foi concluído" (cooldown 12h) |
| Operador já está no meio de um run | Continua | Continua igual (gate só atua se não há run) |

## Não muda

- Webhook (`api.public.whatsapp.webhook.ts`) — continua roteando text/image.
- `morning-trigger` — continua mandando "Bom dia, hora do checklist" às 05:30. O operador ainda precisa responder `tomatoma` para começar de fato.
- State machine de foto, RF-03, anti-duplicata 12h.
- Banco de dados — nenhuma migration.

## Arquivos tocados

- `src/lib/whatsapp-bot-logic.ts` — ~10 linhas adicionadas no bloco "sem run ativa".

## Pós-aprovação

Aplico a mudança, rodo `tsc --noEmit` para confirmar build limpo, e te entrego pronto pra você mandar `tomatoma` do número `+556299677410` e ver as 12 fotos chegando uma a uma.
