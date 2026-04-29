## Bug confirmado

O bot está respondendo "Tipo de mensagem não suportado…" para o número `+555597135090` (Guilherme Growth Hacker), que **não está cadastrado** em `users`. Logs do banco mostram 3 áudios (`message_type=voice`) recebidos hoje, cada um seguido de uma resposta outbound do bot.

### Causa raiz

No webhook (`src/routes/api.public.whatsapp.webhook.ts`), o filtro de allowlist por telefone só roda **dentro** de `handleBotMessage` (linhas 290-302 de `src/lib/whatsapp-bot-logic.ts`), que é chamado apenas para mensagens `text` e `image`.

Para qualquer outro tipo (voice, video, document, sticker, location, etc.) o webhook responde direto, nas linhas 199-213, **sem nunca consultar a tabela `users`**:

```ts
} else {
  const warnText = "Tipo de mensagem não suportado. Envie *texto* (ok/nok/observação) ou *foto* do item.";
  const send = await sendWhapiText(phone, warnText);  // ← envia pra qualquer um
  ...
}
```

Resultado: qualquer pessoa do mundo que mandar áudio/vídeo pro número do bot recebe a mensagem de aviso. Mensagens de texto/imagem de números desconhecidos já estão silenciadas corretamente.

## Correção proposta

Centralizar a allowlist no webhook, **antes** do roteamento por tipo. Se o telefone não for um operador ativo cadastrado, o webhook **registra o inbound em `whatsapp_messages` (auditoria) e retorna sem enviar nada** — independente do tipo da mensagem.

### Mudanças

**`src/routes/api.public.whatsapp.webhook.ts`** — em `handleSingleMessage`, depois de logar o inbound 1:1 (linha 184) e antes do `if (msg.type === "text")`:

1. Normalizar o telefone (`+` + dígitos).
2. Consultar `users` por `phone = +<from>`, `role = 'operador'`, `active = true`.
3. Se não existir: retornar `"skip:phone_not_registered"`. Nenhuma chamada de envio. Inbound já foi logado pra rastreio.
4. Se existir: segue o fluxo atual (text/image → bot, outros tipos → aviso "tipo não suportado").

### Efeitos colaterais

- Remover a checagem duplicada dentro de `handleBotMessage` (linhas 289-302) — fica redundante. Opcional manter como defesa em profundidade; recomendo manter (custo zero, vale como segurança).
- Operadores cadastrados continuam recebendo o aviso "tipo não suportado" quando mandam áudio/vídeo (comportamento atual desejado).
- Mensagens de grupo (`@g.us`) continuam sendo logadas sem resposta — fluxo já correto, fica antes da nova checagem.

### Critério de sucesso

Após a correção, repetir o teste do Guilherme: mandar áudio/vídeo/texto de um número não cadastrado → 0 mensagens outbound, inbound registrado em `whatsapp_messages`.

## Fora de escopo

- Não vou implementar o comando `parar` agora (já adiado).
- Não vou mexer em RLS — o webhook usa `supabaseAdmin` que bypassa RLS de qualquer forma; a allowlist é regra de aplicação.
