# Changelog — Sessão 2026-04-28 (admin/usuarios fix)

## Contexto da sessão

A Patrícia reportou que clicar em "Gerenciar usuários" no painel admin **não abria nada** — sem erro visível, sem navegação, sem spinner travado, simplesmente nenhuma reação. A rota `/admin/usuarios` existia, o servidor renderizava o HTML correto (verificado por curl e por screenshot do SSR), mas o app ficava não-interativo no cliente.

## Diagnóstico

Camada 1 — **Vazamento de código server-only para o bundle do cliente**

A rota `src/routes/admin.usuarios.tsx` importava `triggerMorningNow` do arquivo `src/server/morning.functions.ts`. Esse arquivo, no topo, fazia:

```ts
import { sendMorningMessages } from "@/lib/whatsapp-bot-logic";
```

E `whatsapp-bot-logic.ts` importava `@/integrations/supabase/client.server` (cliente admin com `SUPABASE_SERVICE_ROLE_KEY` e `process.env`).

No TanStack Start, o handler do `createServerFn` é removido do bundle do cliente, mas as **importações estáticas no topo do arquivo permanecem na cadeia**. Resultado: o chunk JS da rota arrastava 731 linhas de lógica de servidor + o cliente admin do Supabase, e o navegador abortava o carregamento com:

```
Failed to fetch dynamically imported module:
virtual:tanstack-start-client-entry
```

Como o erro acontece no `<Link>`/`navigate` dinâmico, ele é silenciado e a UI simplesmente não troca.

Camada 2 — **Deadlock do `loading` no `AuthContext`**

Mesmo após corrigir o vazamento, a rota ficava em "Carregando…" eterno. Causa: em dev/HMR, a Promise de `supabase.auth.getSession()` pode pendurar indefinidamente, e o `ProtectedRoute` espera `loading === false` antes de renderizar conteúdo.

## Ações tomadas

1. **Limpeza do cache do Vite** — `rm -rf node_modules/.vite` para forçar reconstrução das deps e eliminar o `ERR_ABORTED` no chunk react-dom.
2. **`src/server/morning.functions.ts`** — moveu `import("@/lib/whatsapp-bot-logic")` para dentro do `.handler()` como import dinâmico. Topo do arquivo agora só tem imports cliente-safe.
3. **`src/contexts/AuthContext.tsx`** — listener `onAuthStateChange` chama `setLoading(false)` imediatamente ao receber qualquer evento (incluindo `INITIAL_SESSION`), independente de `getSession()` resolver. Fetch de role continua em background.

## Resultado

- Rota `/admin/usuarios` carrega normalmente com tabela de usuários, botão "Novo usuário" e botão "Disparar bom-dia"
- ProtectedRoute nunca mais fica refém do spinner em dev/HMR
- Regras formalizadas em **ADR-022** (server functions: imports dinâmicos) e **ADR-023** (AuthContext libera loading no INITIAL_SESSION)

## Arquivos tocados

- `src/server/morning.functions.ts`
- `src/contexts/AuthContext.tsx`
- `docs/AGROCOTTON_STATUS.md` (próximos passos + nota de bundling)
- `docs/AGROCOTTON_DECISIONS_LOG.md` (ADR-022 e ADR-023)
