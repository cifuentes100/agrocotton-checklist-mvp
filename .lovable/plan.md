## Objetivo

Validar end-to-end o **echo bot do WhatsApp** que já está implementado no código, usando a instância real `ExfblC` da uazapi (`https://free.uazapi.com`). Sem código novo — só configuração de secrets, registro do webhook na uazapi e teste real enviando mensagem de um celular.

## Estado atual (já pronto no código)

- Webhook público: `src/routes/api.public.whatsapp.webhook.ts`
  - `GET` → health-check (retorna `{ok, configured}`).
  - `POST` → recebe mensagem da uazapi, loga em `whatsapp_messages`, ignora `fromMe`, e responde `🤖 Recebi: «texto»` via `POST /send/text` da uazapi.
- Tabela `whatsapp_messages` com RLS (admin lê tudo).
- Secrets `UAZAPI_HOST` e `UAZAPI_TOKEN` já existem no Supabase, mas com valores antigos/placeholder — vamos sobrescrever.

## O que será feito

### 1. Atualizar os dois secrets do Supabase

- `UAZAPI_HOST` = `https://free.uazapi.com`
- `UAZAPI_TOKEN` = `0e4ee35f-61c7-40f4-a4b6-35a8725bcb9d` (token da instância `ExfblC`)

Faço isso com a ferramenta de secrets do Lovable. Não vai pro código nem pro `.env` do repositório.

### 2. Verificar o endpoint de webhook está acessível

Chamar `GET https://<preview-url>/api/public/whatsapp/webhook` e conferir que responde:
```json
{ "ok": true, "service": "whatsapp-webhook", "configured": true }
```

`configured: true` confirma que os secrets estão visíveis para o servidor.

### 3. Simular um POST de inbound (smoke test sem precisar do celular)

Mando um POST de teste pro nosso webhook com payload imitando a uazapi:
```json
{
  "event": "messages",
  "message": {
    "fromMe": false,
    "sender": "5564999999999@s.whatsapp.net",
    "text": "ping de teste",
    "id": "test-msg-001",
    "type": "text"
  }
}
```

Esperado:
- Response `{ ok: true, replied: true/false }`.
- Linha inbound em `whatsapp_messages` com `body = "ping de teste"`.
- Linha outbound com `body = "🤖 Recebi: «ping de teste»"` e `status = sent` (se a uazapi aceitou) ou `failed` (se número 5564999... não existe — esperado, esse é fake).

Se o outbound falhar com erro tipo "número não encontrado", ótimo: prova que a autenticação na uazapi está OK.

### 4. Você configura o webhook na uazapi

Na painel da uazapi, na instância `ExfblC`, registrar webhook:
- **URL:** `https://<preview-url-do-projeto>/api/public/whatsapp/webhook`
- **Events:** `messages`
- **excludeMessages:** `wasSentByApi` (evita loop infinito do bot respondendo a si mesmo)

Te passo a URL exata no momento da execução.

### 5. Teste real

Você manda um `oi` do seu celular pro número conectado na instância `ExfblC`. O bot deve responder `🤖 Recebi: «oi»` em segundos. Conferimos:
- Logs do servidor (via `server-function-logs`).
- Linhas inbound + outbound em `whatsapp_messages`.

## Detalhes técnicos

**Por que o token da instância e não o admin token:** o endpoint `/send/text` da uazapi autentica por instância (header `token: <instance-token>`). O admin token serve só pra criar/listar instâncias via `/instance/*`, que não usamos.

**Por que `excludeMessages: wasSentByApi`:** sem isso, toda resposta do bot voltaria como inbound (porque a própria uazapi notifica mensagens enviadas), gerando loop. O nosso webhook já tem proteção via `parsed.fromMe`, mas filtrar na origem é mais barato.

**RLS de `whatsapp_messages`:** só admin lê via cliente autenticado. Para inspecionar durante o teste vou usar `supabase--read_query` (bypassa RLS).

**Segurança lembrete:** depois do teste, gerar token novo na uazapi e atualizar `UAZAPI_TOKEN` — o atual foi exposto no chat.

## Fora do escopo desta tarefa

- Identificação do operador (cruzar phone com `users` table).
- Máquina de estado da conversa (escolher máquina, pedir foto item por item, criar `checklist_runs` / `item_responses`).
- Recebimento e armazenamento de fotos vindas do WhatsApp no bucket `checklist-photos`.
- Validação de assinatura HMAC do webhook (a uazapi não envia assinatura nativa; cobertura via secret no path se quisermos depois).

Tudo isso fica para sessões seguintes — entram como ADRs/RFs separados quando você decidir avançar pro fluxo completo.

## Critérios de aceite

- `GET /api/public/whatsapp/webhook` retorna `configured: true`.
- POST simulado cria registros inbound + outbound em `whatsapp_messages`.
- Mensagem real do celular faz o bot responder `🤖 Recebi: «...»` em ≤ 5s.
- Nenhum loop de mensagens (bot respondendo a si mesmo).
