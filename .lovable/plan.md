## Atualização da documentação do projeto

A última atualização dos documentos é de **2026-04-27 (noite)**. Desde então, ocorreram duas sessões relevantes (correção do `/admin/usuarios` + limpeza do cache do Vite + ajuste no `AuthContext`) que ainda não estão registradas. A documentação ficará desatualizada se a próxima sessão começar sem isso registrado.

### O que vou atualizar

**1. `docs/AGROCOTTON_STATUS.md`**
- Carimbo: `Última atualização: 2026-04-28`
- Trocar "Fase atual" para refletir que o painel admin de usuários está agora estável e o foco volta para o cron 05:30 + Dashboard Admin
- Em **Aplicação Web**: marcar como `[x]` o subitem "CRUD usuários (Gerenciar usuários)" dentro do Dashboard Admin (parcial), mantendo Dashboard Admin global como `[ ]`
- Em **Próximos passos imediatos**: remover/atualizar o item de cron e reordenar com base no estado real
- Adicionar nota curta em "Pontos de atenção" sobre a regra: **server-only imports em `src/server/*.functions.ts` devem ser dinâmicos dentro do `.handler()`** (vira ADR-022, ver abaixo)

**2. `docs/AGROCOTTON_DECISIONS_LOG.md`** — adicionar dois novos ADRs:

- **ADR-022 — Server functions: imports server-only devem ser dinâmicos dentro do `.handler()`**
  Contexto: o botão "Gerenciar usuários" não abria por conta de `whatsapp-bot-logic` + `client.server` vazando para o bundle do cliente via import estático no topo de `morning.functions.ts`.
  Decisão: qualquer arquivo em `src/server/*.functions.ts` que dependa de `client.server`, `process.env` server-only, ou libs Node-only **deve** importar essas dependências via `await import(...)` dentro do `.handler()`. Imports estáticos no topo só para tipos e utilitários cliente-safe.
  Consequências: previne classe inteira de bugs de "tela em branco / botão não abre nada"; obriga revisão de qualquer novo server function antes do merge.

- **ADR-023 — `AuthContext`: liberar `loading` no evento `INITIAL_SESSION`**
  Contexto: em dev/HMR, `supabase.auth.getSession()` pode pendurar a Promise, deixando `ProtectedRoute` eternamente em "Carregando…". Observado ao testar `/admin/usuarios` após limpar o cache do Vite.
  Decisão: o listener `onAuthStateChange` no `AuthContext` chama `setLoading(false)` imediatamente ao receber qualquer evento (incluindo `INITIAL_SESSION`), independente do `getSession()` resolver. Esse é o caminho oficial recomendado pela equipe Supabase para SPAs com SSR.
  Consequências: garante que a UI sempre sai do spinner; o fetch de role continua assíncrono em background.

**3. Novo `docs/CHANGELOG_2026-04-28_admin_usuarios_fix.md`**
Resumo curto da sessão de hoje:
- Sintoma: clicar em "Gerenciar usuários" não abria nada
- Diagnóstico em duas camadas: (a) chunk JS abortado por server-only leak e (b) `AuthContext` deadlock no spinner
- Ações: limpar `node_modules/.vite`, mover `import("@/lib/whatsapp-bot-logic")` para dentro do `.handler()` em `morning.functions.ts`, ajustar listener do `AuthContext`
- Resultado: rota `/admin/usuarios` carrega; ADRs 022 e 023 registram as regras

### O que NÃO vou alterar

- ADRs antigos (regra do projeto: ADRs são imutáveis, só se adiciona)
- O changelog `2026-04-24_sessao_implantador.md` (sessão diferente)
- `.lovable/plan.md` (artefato interno do diagnóstico, não documentação do projeto)

### Arquivos tocados

- `docs/AGROCOTTON_STATUS.md` (editar)
- `docs/AGROCOTTON_DECISIONS_LOG.md` (acrescentar ADR-022 e ADR-023 ao final, antes do template `ADR-NNN`)
- `docs/CHANGELOG_2026-04-28_admin_usuarios_fix.md` (criar)

Aprova que eu aplique?
