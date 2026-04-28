## Diagnóstico

Quando você clica em "Gerenciar usuários", o navegador tenta carregar dinamicamente o chunk JS da rota `/admin/usuarios`. Esse carregamento está falhando com o erro:

```
Failed to fetch dynamically imported module: virtual:tanstack-start-client-entry
```

### Causa raiz

A rota `src/routes/admin.usuarios.tsx` importa, no topo do arquivo:

```ts
import { triggerMorningNow } from "@/server/morning.functions";
```

Esse arquivo (`src/server/morning.functions.ts`) importa `@/lib/whatsapp-bot-logic`, que por sua vez importa `@/integrations/supabase/client.server` — um módulo **exclusivo de servidor** que lê `SUPABASE_SERVICE_ROLE_KEY` do `process.env` e usa o cliente admin do Supabase (bypass de RLS).

No TanStack Start, o handler de `createServerFn` é removido do bundle do cliente, **mas as importações de nível superior do arquivo do server function permanecem na cadeia**. Quando o cliente tenta carregar a rota, o bundler arrasta `whatsapp-bot-logic.ts` (731 linhas de lógica de servidor) e `client.server.ts` para o chunk do cliente, o que quebra a montagem do módulo virtual da rota e causa o "Failed to fetch dynamically imported module".

Esse é exatamente o tipo de erro que aparece como tela em branco / botão que "não faz nada" — porque o `<Link>`/`navigate` dispara o import dinâmico, ele rejeita silenciosamente, e a UI não troca.

## Plano de correção

1. **Isolar o server function em um arquivo dedicado e seguro para o cliente importar**
   - Manter `src/server/morning.functions.ts` apenas com o `createServerFn` e suas dependências de tipos.
   - Mover a importação de `sendMorningMessages` (`@/lib/whatsapp-bot-logic`) para **dentro do `.handler(...)`** usando `await import("@/lib/whatsapp-bot-logic")` (import dinâmico). Assim o módulo de servidor pesado nunca entra no grafo do cliente.

2. **Validar que o chunk da rota carrega**
   - Após o ajuste, abrir `/admin/usuarios` direto pela URL e via botão "Gerenciar usuários" para confirmar.

3. **Como prática geral neste projeto**: qualquer arquivo em `src/server/*.functions.ts` que use `client.server` ou libs Node-only deve fazer essas importações dinamicamente dentro do `.handler()`, nunca no topo do arquivo.

## Detalhes técnicos

Mudança proposta em `src/server/morning.functions.ts`:

```ts
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const triggerMorningNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: caller } = await supabase
      .from("users").select("role").eq("id", userId).maybeSingle();

    if (!caller || caller.role !== "admin") {
      throw new Error("Apenas admin pode disparar bom-dia manualmente");
    }

    // Import dinâmico: mantém whatsapp-bot-logic e client.server FORA do bundle do cliente
    const { sendMorningMessages } = await import("@/lib/whatsapp-bot-logic");
    return await sendMorningMessages({ force: true });
  });
```

Não é necessário alterar `admin.usuarios.tsx`, `whatsapp-bot-logic.ts` nem `client.server.ts`.

Posso aplicar?