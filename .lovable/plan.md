## Objetivo

Permitir que o implantador clone uma máquina existente (status `ready`) gerando uma nova com serial diferente e copiando automaticamente as fotos de referência configuradas. Isso elimina o retrabalho de fotografar 11+ itens em máquinas idênticas da mesma fazenda.

## Ajustes em relação ao prompt original

O prompt fornecido está escrito assumindo Supabase Edge Functions (Deno), mas este projeto usa **TanStack Start com `createServerFn`** rodando no Worker (a documentação interna é explícita: "Do NOT use Supabase Edge Functions"). Vou seguir a arquitetura correta do projeto. Outros ajustes:

- A coluna em `machine_reference_photos` chama-se `path` (não `photo_path`).
- Toast usa `sonner` (`toast.success/error`), não `useToast`.
- As RLS policies de `machine_reference_photos` já permitem insert por admin/implantador — não é preciso criar policy nova.
- Hoje o checklist tem N itens (qualquer quantidade — admin pode adicionar). O texto "12 fotos" no modal será dinâmico ("X itens").

## O que será construído

### 1. Server function `cloneMachine` (substitui a Edge Function)

Arquivo novo: `src/server/machines.functions.ts`

- `createServerFn({ method: "POST" })` com `requireSupabaseAuth` middleware.
- Input validado com Zod: `{ sourceMachineId, newSerial, newLocation?, newYear?, copyPhotos }`.
- Validação de role (`implantador` ou `admin`) via `users` table.
- Validação de serial único antes de inserir.
- Busca máquina origem; copia `model`, `specs`, e — se não fornecido — `year`/`location`.
- Cria nova máquina com `status = copyPhotos ? "ready" : "pending"`.
- Se `copyPhotos`:
  - Lê `machine_reference_photos` da origem usando o cliente autenticado.
  - Para cada foto, usa `supabaseAdmin.storage.from("reference-photos").copy(srcPath, destPath)` onde `destPath = ${newMachine.id}/${item_id}.jpg`.
  - Faz upsert dos registros na tabela `machine_reference_photos` para a nova máquina.
  - Em caso de falha em qualquer cópia: rollback (delete da máquina criada + delete dos arquivos já copiados no Storage).
- Retorna `{ machine, photosCopied }`.

### 2. Modal `CloneMachineDialog`

Arquivo novo: `src/components/implantador/CloneMachineDialog.tsx`

Segue o padrão visual do `MachineFormDialog` (mesmo dark theme, cor `#a78bfa`):

- Props: `{ open, onOpenChange, sourceMachine, totalItemsCount, onCloned }`.
- Cabeçalho mostra o serial origem em destaque.
- Campos:
  - **Modelo** (read-only, vem da origem).
  - **Ano** (editável, prefill com origem).
  - **Serial** (obrigatório, validação em tempo real via debounce: query em `machines` por `serial`).
  - **Localização** (editável, prefill com origem).
  - **Checkbox "Copiar fotos de referência (N itens)"** (default: true). Se desmarcado, mostra aviso de que a máquina nascerá `pending`.
- Botão "Clonar agora": disabled quando serial vazio/duplicado/loading. Texto muda para "Clonando… (pode levar alguns segundos)" durante a operação.
- Chama `useServerFn(cloneMachine)`. Em sucesso: `toast.success`, fecha modal, chama `onCloned()` (recarrega lista). Em erro: `toast.error` com mensagem retornada.

### 3. Botão "Clonar" na lista de máquinas

Edição em `src/routes/implantador.maquinas.tsx`:

- Na coluna "Ações", adicionar botão "Clonar" com ícone `Copy` ao lado de "Configurar fotos".
- Botão só aparece quando `m.status === "ready"`.
- Ao clicar, abre `CloneMachineDialog` com `sourceMachine` setado.
- Após clonagem bem-sucedida: chama `load()` para refrescar a tabela.

### 4. Carregar contagem total de itens do checklist

Para mostrar "(N itens)" no checkbox, a página de máquinas faz um `count` em `checklist_items` ao montar (uma vez), e passa para o modal.

## Detalhes técnicos

**Caminhos de Storage:** o código atual usa `${machineId}/${itemId}.jpg`. A clonagem usa o mesmo padrão para o destino, derivando do `newMachine.id`.

**Por que server function e não chamar `storage.copy()` direto do browser:** o cliente browser autenticado pode chamar `.copy()`, mas exige policies específicas no bucket privado e expõe lógica de rollback no cliente (frágil). Server function com `supabaseAdmin` para Storage + cliente autenticado para checagem de role é mais robusto, atômico e replica o padrão já usado em `api.public.whatsapp.webhook.ts`.

**Rollback:** se qualquer `storage.copy()` falhar, o handler:
1. Lista os destinos já copiados.
2. Faz `storage.remove([...destPaths])`.
3. Deleta as linhas inseridas em `machine_reference_photos`.
4. Deleta a `machines` recém-criada.
5. Retorna erro descritivo.

**RLS:** as policies existentes em `machine_reference_photos` e `machines` já cobrem inserts por implantador/admin via cliente autenticado. Como a server function valida role explicitamente e usa `supabaseAdmin` apenas para o Storage `.copy()` (Storage não tem nossas RLS de role customizadas), está coberto sem migration.

**Validação de role na server function:** consulta `users` table com o `userId` do middleware e checa `role in ('admin','implantador')`. Retorna 403 se não autorizado.

## Arquivos afetados

- **Novo:** `src/server/machines.functions.ts`
- **Novo:** `src/components/implantador/CloneMachineDialog.tsx`
- **Editado:** `src/routes/implantador.maquinas.tsx` (botão Clonar + carregar count + estado do modal)

## Critérios de aceite

- Botão "Clonar" aparece só em máquinas com status `ready`.
- Serial duplicado é bloqueado tanto na UI (em tempo real) quanto na server function.
- Clonando com fotos: nova máquina nasce `ready` com todas as fotos visíveis em "Configurar fotos".
- Clonando sem fotos: nova máquina nasce `pending` e abre fluxo normal de configuração.
- Falha de cópia faz rollback completo (sem máquinas órfãs nem arquivos vazados).
- Toast de sucesso/erro funciona; lista recarrega após sucesso.

## Fora do escopo desta tarefa

- Ajuste em `docs/AGROCOTTON_STATUS.md` / ADR (faço numa próxima sessão se quiser registrar a decisão arquitetural de usar server function em vez de Edge Function).
- Botão "Clonar" no Dashboard Admin (tarefa do RF-35).
