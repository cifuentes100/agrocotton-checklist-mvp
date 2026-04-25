## Problema

O webhook do WhatsApp já está recebendo as mensagens da uazapi corretamente (confirmado nos logs), mas falha ao gravar no banco com erro 500:

```
Missing Supabase server environment variables. 
Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.
```

## Causa

O arquivo `src/integrations/supabase/client.server.ts` lê `process.env.SUPABASE_URL` e `process.env.SUPABASE_SERVICE_ROLE_KEY`. Essas variáveis **não estão configuradas no runtime** do servidor (só aparecem `LOVABLE_API_KEY`, `UAZAPI_HOST`, `UAZAPI_TOKEN`).

## Solução

### Passo 1 — Adicionar a `SUPABASE_SERVICE_ROLE_KEY` como secret do servidor
Vou disparar o formulário de adição de secret pra você colar a chave. A chave já existe no projeto Supabase — você só precisa pegar e colar.

**Onde encontrar a chave:**
1. Abrir o painel do Supabase do projeto
2. Ir em **Project Settings → API**
3. Copiar o valor do campo **service_role** (NÃO o `anon`/`publishable`)
4. Colar no formulário que vou abrir aqui no Lovable

### Passo 2 — Adicionar também `SUPABASE_URL` como secret do servidor
Já tem no `.env`, mas pra garantir que esteja disponível no runtime do worker, vou adicionar como secret também. Valor: `https://ctzajxycetufjkpqhidz.supabase.co`

### Passo 3 — Aguardar redeploy e re-testar
Depois que você salvar os secrets, o servidor faz redeploy em ~30s. Aí você manda outro "oi" no WhatsApp e:
- A mensagem deve aparecer gravada na tabela `whatsapp_messages`
- Você deve receber a resposta automática `🤖 Recebi: «oi»`

### Passo 4 — Confirmar nos logs
Vou checar os logs do servidor pra confirmar que:
- O POST do webhook retornou 200 (não mais 500)
- A inserção em `whatsapp_messages` foi bem-sucedida
- O envio da resposta via `/send/text` da uazapi também foi 200

### Passo 5 — Limpeza opcional (depois que tudo funcionar)
- Remover o arquivo `src/routes/api.public.diag.env.ts` (era só pra diagnóstico)

## Riscos / observações

- A `service_role_key` bypassa RLS — é usada SÓ no servidor, nunca no cliente. Já está sendo usada corretamente apenas em `client.server.ts`.
- Não há mudança de código nesse plano — só configuração de secrets. O código do webhook está correto.

## Detalhes técnicos

- O cliente admin é instanciado via Proxy lazy em `client.server.ts`, então a primeira chamada no webhook dispara a leitura de `process.env`. Sem as vars, ele lança o erro que vimos.
- Adicionar via tool `secrets--add_secret` no Lovable disponibiliza as vars como `process.env.*` no runtime do worker TanStack.
- O webhook (`src/routes/api.public.whatsapp.webhook.ts`) já está correto: tem POST handler, logs detalhados, parsing flexível do payload da uazapi e echo bot funcionando.
