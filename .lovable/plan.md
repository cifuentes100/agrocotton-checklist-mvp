## Problema confirmado

O webhook da uazapi chega no servidor mas falha com **HTTP 500**:

```
Missing Supabase server environment variables.
Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.
```

Confirmei agora:
- No **Supabase** existem `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` ✅
- No **Lovable** (runtime do Worker) só existem `LOVABLE_API_KEY`, `UAZAPI_HOST`, `UAZAPI_TOKEN` ❌

Os secrets do Supabase **não são automaticamente injetados** no runtime do TanStack/Cloudflare Worker. Eles só ficam disponíveis nas Edge Functions do próprio Supabase. Para o `client.server.ts` ler via `process.env.*`, precisam ser adicionados também como secrets do Lovable.

## Solução (sem mudança de código)

### Passo 1 — Adicionar `SUPABASE_URL` como secret do Lovable
Valor: `https://ctzajxycetufjkpqhidz.supabase.co`
(Esse valor não é sensível — é o mesmo que já está no `.env` público.)

### Passo 2 — Adicionar `SUPABASE_SERVICE_ROLE_KEY` como secret do Lovable
**Onde pegar:**
1. Abrir https://supabase.com/dashboard/project/ctzajxycetufjkpqhidz/settings/api
2. Rolar até **Project API keys**
3. Copiar o valor do campo **`service_role`** (clicar em "Reveal" — é o longo, NÃO o `anon`)
4. Colar no formulário que vou abrir

### Passo 3 — Aguardar redeploy (~30s) e re-testar
- Mandar "oi" no WhatsApp pro número conectado
- Esperado: receber `🤖 Recebi: «oi»` de volta
- A mensagem deve aparecer na tabela `whatsapp_messages` (linhas inbound + outbound)

### Passo 4 — Verificar nos logs do servidor
Confirmar que:
- O POST do webhook retorna 200
- A inserção em `whatsapp_messages` foi bem-sucedida
- O envio via uazapi `/send/text` retornou 200

### Passo 5 (opcional) — Limpeza
- Remover `src/routes/api.public.diag.env.ts` que era só pra diagnóstico

## Riscos / observações

- A `service_role_key` bypassa RLS — é usada **só** no servidor (`client.server.ts`), nunca no cliente. Já está sendo usada corretamente.
- Não há mudança de código — só configuração de secrets.
- O webhook (`src/routes/api.public.whatsapp.webhook.ts`) já está completo: log, parsing flexível, insert no banco e echo bot.

## Detalhes técnicos

- `src/integrations/supabase/client.server.ts` instancia o client admin via Proxy lazy lendo `process.env.SUPABASE_URL` e `process.env.SUPABASE_SERVICE_ROLE_KEY`. Sem essas vars, lança o erro visto.
- Adicionar via `secrets--add_secret` no Lovable expõe as vars como `process.env.*` no Worker em runtime.
- Os mesmos secrets já existem no Supabase mas não cruzam para o Worker do Lovable automaticamente.