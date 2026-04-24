

# Plano (revisado): Tela do Implantador (ADR-007 + ADR-009)

Construir o módulo do Implantador para cadastrar colheitadeiras e configurar 10 fotos de referência **por máquina**, corrigindo o bug do schema original (`reference_correct_path` global) com uma nova tabela `machine_reference_photos`.

## 1. Migração SQL

### 1.1 Nova tabela `machine_reference_photos`

```sql
create table public.machine_reference_photos (
  machine_id uuid not null references public.machines(id) on delete cascade,
  item_id    int  not null references public.checklist_items(id),
  path       text not null,
  updated_at timestamptz not null default now(),
  primary key (machine_id, item_id)
);

alter table public.machine_reference_photos enable row level security;
```

### 1.2 RLS em `machine_reference_photos`

- **SELECT**: todos autenticados (`auth.uid() is not null`).
- **INSERT/UPDATE/DELETE**: implantador e admin (`current_role() in ('implantador','admin')`).

### 1.3 Depreciação da coluna antiga

```sql
comment on column public.checklist_items.reference_correct_path
  is 'DEPRECATED - use machine_reference_photos';
```

Coluna mantida (não removida) para não quebrar nada existente. Nenhuma leitura ou escrita nova vai usá-la.

### 1.4 Policies que ainda faltam

- **`machines` UPDATE**: implantador/admin podem mudar status (`current_role() in ('implantador','admin')`).
- **`checklist_items` SELECT**: todos autenticados podem listar os 10 itens (sem essa policy a tela quebra). UPDATE não é mais necessário (não vamos escrever nessa tabela).

### 1.5 Storage policies — bucket `reference-photos`

- **INSERT/UPDATE/DELETE em `storage.objects`**: implantador/admin no bucket `reference-photos`.
- **SELECT em `storage.objects`**: implantador/admin/mecanico no bucket `reference-photos` (operador continua acessando via signed URL gerada pelo bot).

## 2. Estrutura de rotas

```text
src/routes/
├── implantador.tsx                          (layout: topbar + sidebar + Outlet)
├── implantador.index.tsx                    (redirect → /implantador/maquinas)
├── implantador.maquinas.tsx                 (lista + criar máquina)
└── implantador.referencias.$machineId.tsx   (configurar 10 fotos por máquina)
```

`<ProtectedRoute roles={['implantador','admin']}>` envolve só o layout.

## 3. `ProtectedRoute` — múltiplos roles

Trocar prop `role: AppRole` por `roles: AppRole[]`. Atualizar callers em `admin.tsx`, `mecanico.tsx`, `implantador.tsx`. Admin passa a poder supervisionar `/implantador/*`.

## 4. Layout do Implantador

- Fundo `#0f172a`, acento roxo `#a78bfa`.
- **Topbar**: "AgroCotton — Modo Implantador" + botão "Sair".
- **Sidebar fixa** com 2 links (`<Link>` do TanStack, estado ativo destacado):
  - "Máquinas" → `/implantador/maquinas`
  - "Configurar Referências" → `/implantador/maquinas` (a configuração é acessada clicando em uma máquina da lista)
- `<Outlet/>` para a página filha.
- `<Toaster/>` (sonner) para feedback.

## 5. Página `/implantador/maquinas`

- `SELECT * FROM machines ORDER BY created_at DESC`.
- Tabela shadcn: Serial | Modelo | Ano | Local | Status | Ações.
- **Badge de status**: `pending`=cinza, `setup`=amarelo, `ready`=verde, `maintenance`=vermelho.
- Ação "Configurar fotos" → navega para `/implantador/referencias/$machineId`.
- Botão **"Nova máquina"** abre `Dialog` com formulário (`react-hook-form` + `zod`):
  - Serial (string, obrigatório, único)
  - Modelo (string, obrigatório)
  - Ano (number, opcional)
  - Localização (string, opcional)
- INSERT em `machines` com `status='pending'`. Erro de duplicidade de serial → mensagem PT.
- Após sucesso: toast + redirect para `/implantador/referencias/{novo_id}`.

## 6. Página `/implantador/referencias/$machineId` (ADR-009)

- Buscar máquina (`SELECT * FROM machines WHERE id = $machineId`); se não existir → estado vazio com link de volta.
- Buscar `SELECT * FROM checklist_items ORDER BY order_idx` (10 itens).
- Buscar `SELECT item_id, path, updated_at FROM machine_reference_photos WHERE machine_id = $machineId` → indexar por `item_id`.
- **Cabeçalho**: "Configurar referências — {serial}".
- **Barra de progresso**: "X de 10 itens configurados" (X = linhas em `machine_reference_photos` para essa máquina). `Progress` shadcn em roxo.
- **Lista de 10 cards** (ordem `order_idx`):
  - Número + nome + descrição.
  - Se foto existe: thumbnail (signed URL 1h) + "Substituir foto".
  - Se não: botão **"Adicionar foto do padrão correto"**.
  - Input escondido: `<input type="file" accept="image/jpeg,image/png,image/heic" capture="environment">`. Sem opção de galeria. Sem nenhuma menção a "padrão incorreto" (RF-13).
- **Fluxo de upload**:
  1. `supabase.storage.from('reference-photos').upload('{machineId}/{itemId}.jpg', file, { upsert: true })`.
  2. **UPSERT** em `machine_reference_photos` (machine_id, item_id, path, updated_at = now()) com `onConflict: 'machine_id,item_id'`.
  3. Recarregar fotos da máquina + recalcular progresso + atualizar thumbnail.
  4. Toast PT.
- **Botão "Finalizar configuração"**: aparece quando `count(machine_reference_photos WHERE machine_id = $machineId) = 10`. Ao clicar: `UPDATE machines SET status='ready' WHERE id = $machineId` → toast + voltar para `/implantador/maquinas`.

## 7. Atualização de docs

- **`docs/AGROCOTTON_DECISIONS_LOG.md`**: adicionar **ADR-009 — Fotos de referência são por máquina, não globais** com o conteúdo exato fornecido pelo usuário.
- **`docs/AGROCOTTON_STATUS.md`**: anotar ADR-009 como decisão tomada na seção apropriada.

## 8. Detalhes técnicos

- Data fetching: `useEffect` + `useState` (consistente com o resto do app).
- Signed URLs: `createSignedUrl(path, 3600)`, armazenadas em `Map<itemId, url>`.
- Form: `zod` + `react-hook-form` (já instalados).
- Toasts: `sonner` (já no projeto).
- Tema: fundo `#0f172a`, cards `bg-slate-900/60 border-slate-800`, acento `#a78bfa` (botões primários, sidebar ativa, progresso, borda do botão Sair).
- Strings em PT-BR em toda a UI.

## 9. Arquivos a criar/editar

**Criar:**
- `src/routes/implantador.index.tsx`
- `src/routes/implantador.maquinas.tsx`
- `src/routes/implantador.referencias.$machineId.tsx`
- `src/components/implantador/MachineFormDialog.tsx`
- `src/components/implantador/ReferenceItemCard.tsx`
- `src/components/implantador/StatusBadge.tsx`

**Editar:**
- `src/routes/implantador.tsx` → vira layout protegido por `roles=['implantador','admin']`.
- `src/components/ProtectedRoute.tsx` → `roles: AppRole[]`.
- `src/routes/admin.tsx`, `src/routes/mecanico.tsx` → atualizar prop.
- `docs/AGROCOTTON_DECISIONS_LOG.md` → ADR-009.
- `docs/AGROCOTTON_STATUS.md` → registrar ADR-009.

**Não tocar:** `src/integrations/supabase/types.ts`, `src/routeTree.gen.ts`.

## 10. Fora do escopo

- Histórico de substituição de fotos.
- Pausar/retomar com localStorage.
- Edição avançada de specs JSONB.
- Telas Mecânico / Admin / Bot WhatsApp.
- Remoção física da coluna `reference_correct_path` (fica deprecated, sem uso).

