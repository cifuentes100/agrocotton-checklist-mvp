
# Autenticação email/senha (ADR-006)

Implementar login para os 3 perfis técnicos (mecânico, admin, implantador) usando Supabase Auth, com proteção de rotas por role. Operador continua fora — vive no WhatsApp.

## ⚠️ Observação importante sobre o vínculo Auth ↔ public.users

A tabela `public.users` **não tem coluna `email`**. As colunas são: `id (uuid)`, `name`, `phone`, `role`, `created_at`. O único vínculo possível com `auth.users` é pelo `id` (uuid).

Portanto a estratégia será:
- Após `signInWithPassword`, pegar o `user.id` do Auth e buscar em `public.users` por `id = auth.user.id` (não por email).
- Para o cadastro manual via SQL funcionar, o `id` em `public.users` deve ser exatamente igual ao `id` em `auth.users`. Vou documentar isso explicitamente no `AGROCOTTON_STATUS.md` na seção "Pontos de atenção" para que o seed manual seja feito corretamente (ex: `INSERT INTO public.users (id, name, phone, role) SELECT id, 'Fulano', '+55...', 'admin' FROM auth.users WHERE email = 'fulano@x.com';`).

Se o usuário autenticado não tiver linha correspondente em `public.users`, o sistema faz `signOut()` e mostra erro "Usuário sem permissão. Contate o administrador."

## Arquivos a criar

### 1. `src/contexts/AuthContext.tsx`
Provider React com estado:
- `user`: objeto do Supabase Auth (ou `null`)
- `role`: `"implantador" | "mecanico" | "admin" | null`
- `loading`: boolean (true durante carregamento inicial da sessão)
- `signIn(email, senha)`: faz login, busca role, retorna `{ role }` ou lança erro com mensagem em PT
- `signOut()`: limpa sessão e estado

Comportamento:
- No mount: chamar `supabase.auth.getSession()` e, em paralelo, registrar `supabase.auth.onAuthStateChange()` (listener registrado ANTES do `getSession`, conforme guideline).
- Quando há sessão: buscar `public.users` por `id = session.user.id`. Se não existir → signOut + estado limpo + flag de erro.
- Hook exportado: `useAuth()`.

### 2. `src/components/ProtectedRoute.tsx`
Componente wrapper que recebe `role` (string) e `children`:
- Se `loading` → spinner verde centralizado em fundo escuro.
- Se `!user` → `<Navigate to="/login" />` (usando `useNavigate` do TanStack Router via `useEffect` + `redirect`, ou simplesmente renderizando `null` e navegando).
- Se `user` mas `role` diferente → redirect para a home do role correto (`/admin`, `/mecanico`, `/implantador`).
- Se OK → renderiza `children`.

### 3. `src/routes/login.tsx`
Tela de login:
- Fundo `#0f172a`, card centralizado.
- Título "AgroCotton" em verde `#25D366`.
- Campos: email (Input) e senha (Input type=password) usando os componentes shadcn já existentes (`@/components/ui/input`, `label`, `button`).
- Botão "Entrar" verde (#25D366), com estado de loading.
- Mensagens de erro em português:
  - `Invalid login credentials` → "Email ou senha incorretos"
  - usuário sem linha em `public.users` → "Usuário sem permissão. Contate o administrador."
  - erro genérico → "Erro ao entrar. Tente novamente."
- Após login bem-sucedido: redirecionar com `useNavigate` para `/admin` | `/mecanico` | `/implantador` conforme role.
- Se já logado ao acessar `/login`: redirecionar para a home do role.
- Sem links de "esqueci senha" nem "criar conta".

### 4. Rotas placeholder protegidas
- `src/routes/admin.tsx` → `<ProtectedRoute role="admin">` envolvendo: título "Dashboard Admin" + botão "Sair" (chama `signOut` e navega para `/`).
- `src/routes/mecanico.tsx` → idem com role `mecanico` e título "Dashboard Mecânico".
- `src/routes/implantador.tsx` → idem com role `implantador` e título "Dashboard Implantador".

Cada uma com fundo escuro `#0f172a`, texto claro, botão "Sair" estilo outline em verde.

## Arquivos a modificar

### `src/routes/__root.tsx`
Envolver `<Outlet />` em `<AuthProvider>` dentro do `RootComponent` para que toda a árvore tenha acesso ao contexto.

### `src/routes/index.tsx`
Adicionar botão "Entrar" verde (#25D366) abaixo do subtítulo:
- Se `useAuth().user` e `role` existem → texto "Acessar painel" + navega para a home do role.
- Senão → texto "Entrar" + navega para `/login`.
- Enquanto `loading`, esconder o botão ou mostrar disabled.

### `docs/AGROCOTTON_STATUS.md`
Marcar no checklist "Aplicação Web (Lovable)":
- `[x] Autenticação por email/senha para mecânico/admin/implantador`
- `[x] Rotas protegidas por perfil`

E adicionar uma nota curta na seção "Pontos de atenção pendentes" sobre o seed manual de usuários precisar usar o mesmo `id` do `auth.users` em `public.users` (com SQL de exemplo).

Os outros arquivos em `docs/` ficam intactos.

## O que NÃO será feito

- Sem tela de signup público.
- Sem fluxo "esqueci senha".
- Sem criação de usuários de teste automaticamente.
- Sem novas tabelas ou migrations.
- Sem alteração de `AGROCOTTON_DECISIONS_LOG.md`.
- Sem implementar funcionalidade real nos 3 dashboards (apenas título + Sair).

## Detalhes técnicos

- Cliente Supabase usado: `@/integrations/supabase/client` (que já tem persistSession habilitado).
- Roteamento: TanStack Router file-based, hooks `useNavigate`, `Link` de `@tanstack/react-router`.
- Tipo do role: união literal `"implantador" | "mecanico" | "admin"`. Se Postgres devolver outro valor (ex: `"operador"`), tratar como inválido → signOut + erro.
- Sem alterações em `routeTree.gen.ts` (auto-gerado pelo plugin Vite ao adicionar arquivos de rota).
- Sem alterações em RLS — as policies existentes em `users`, `machines`, `checklist_runs` já usam `current_role()` baseado em `auth.uid()` e continuam válidas.
