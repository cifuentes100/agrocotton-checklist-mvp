## Problema

Quando alguém que **não está cadastrado** na tabela `users` (ou está cadastrado mas sem `role='operador'`) manda mensagem no WhatsApp, o bot responde:

> "👋 Olá! Seu número não está cadastrado como operador. Procure o responsável."

Isso é uma ação/tarefa que você não quer. Não cadastrado = silêncio total.

## Onde está

`src/lib/whatsapp-bot-logic.ts`, função `handleBotMessage`, linhas 297-303.

```ts
if (!user) {
  await sendWhatsAppMessage(
    fromPhone,
    "👋 Olá! Seu número não está cadastrado como operador. Procure o responsável.",
  );
  return "bot:not_registered";
}
```

## Mudança

Trocar por:

```ts
if (!user) {
  // Silêncio: número não cadastrado não recebe nenhuma resposta/ação.
  return "bot:not_registered_silent";
}
```

Sem `sendWhatsAppMessage`. O webhook ainda registra a mensagem recebida em `whatsapp_messages` (auditoria continua), mas o bot não responde nada.

## Verificações de efeito colateral

- **Bom-dia (`sendMorningMessages`)**: já filtra por `role='operador'` na query (linha 692), então só cadastrados como operador recebem. **Nada a mudar.**
- **`kill` / `tomatoma` / fluxo de checklist**: tudo dentro do mesmo `handleBotMessage` depois do early return — bloqueado naturalmente pra não cadastrado.
- **Logs / auditoria**: o handler continua retornando `"bot:not_registered_silent"`, então fica rastreável no log do webhook que chegou mensagem de número estranho — só não responde.

## Entregável

1. Editar `src/lib/whatsapp-bot-logic.ts` removendo o `sendWhatsAppMessage` do bloco `if (!user)` e ajustando o return.
2. Atualizar `docs/AGROCOTTON_DECISIONS_LOG.md` registrando a decisão: "número não cadastrado não recebe resposta automática (privacidade / evita ruído)".
