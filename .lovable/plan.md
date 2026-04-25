# Diagnóstico e correção do webhook WhatsApp

## O que descobrimos agora

1. Você mandou "oi" do +55 38 9733-8775 e a mensagem chegou no WhatsApp Web do número conectado ✅
2. **Nenhum log do webhook chegou no nosso servidor** nos últimos minutos ❌
3. Quando testamos a rota `/api/public/whatsapp/webhook` manualmente, ela retornou **HTTP 302** (redirect, provavelmente para `/login`) — isso é um bug, rotas `/api/public/*` deveriam ser livres de autenticação
4. Tem um polling chamando `/api/public/diag/env` a cada ~3s retornando 404 (loop ativo em alguma tela aberta — não crítico, mas precisa parar)

## O que vamos fazer

### Passo 1 — Confirmar a URL exata salva na uazapi
Pedir para você abrir o painel da uazapi de novo e me mandar print da configuração do webhook (depois de salvo) para ter 100% de certeza de que:
- A URL final está correta (sem `/messages` no final, sem espaço, sem barra extra)
- O "Habilitado" continua ligado
- Os eventos `messages` e a exclusão `wasSentByApi` continuam lá

### Passo 2 — Investigar o redirect 302 da rota pública
Verificar o arquivo `src/routes/api.public.whatsapp.webhook.ts` e descobrir por que está redirecionando ao invés de aceitar POST. Possíveis causas:
- Falta handler `POST` (só tem `GET`)
- Algum middleware global redirecionando
- Falta de slash trailing causando redirect

Corrigir o handler para sempre aceitar POST e responder 200 (com log mesmo que o body não bata em nada).

### Passo 3 — Verificar o token configurado no servidor
Confirmar via `fetch_secrets` que o `UAZAPI_TOKEN` está setado e checar se o código da rota está validando o token correto enviado pela uazapi (geralmente vem no header `Authorization` ou `token` do request).

### Passo 4 — Adicionar logs detalhados no início do handler
Antes de qualquer validação, logar:
- método, url completa, headers recebidos (sem expor o token)
- primeiros caracteres do body
Isso garante que vamos enxergar QUALQUER tentativa de chamada da uazapi nos logs do servidor.

### Passo 5 — Parar o polling do `/api/public/diag/env`
Encontrar a página/componente que está fazendo polling e:
- Confirmar se ainda é necessário
- Se sim, corrigir para usar o método correto (provavelmente POST ao invés de GET) ou consertar o handler para responder GET
- Se não, remover o polling

### Passo 6 — Re-teste
Após o deploy das correções, você manda outro "oi" no WhatsApp e verificamos os logs novamente.

## Detalhes técnicos

- Stack: TanStack Start, rota pública em `src/routes/api.public.whatsapp.webhook.ts`
- Secret `UAZAPI_TOKEN` precisa ser atualizado depois (token novo: `c94fd389-0936-4e3d-b44a-f4a913403ea2`) — vou disparar o formulário de update na fase de implementação
- Logs do worker disponíveis via tooling — podemos confirmar entrega em tempo real

## O que preciso de você antes de começar

Print da tela do webhook da uazapi **depois de salvo** (com a janela de configuração ainda aberta ou reaberta), para confirmar a URL exata e os eventos marcados. Sem isso, posso corrigir o servidor mas não tenho como saber se a uazapi está realmente apontando pra cá.
