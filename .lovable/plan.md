# Adicionar novos itens ao checklist (admin)

Hoje o checklist tem 12 itens fixos. O admin já pode editar nome/descrição e reordenar, mas não pode **criar** itens novos. Este plano libera essa criação a partir da tela `/implantador/referencias/:machineId`.

## O que muda na experiência

- Na página de configurar referências, quando o usuário tem papel `admin`, aparece um botão **“+ Adicionar item”** abaixo da lista.
- Clicar abre um modal com campos **Nome** (obrigatório) e **Descrição** (opcional).
- Ao salvar, o novo item entra no fim da lista (próximo `order_idx`) e fica imediatamente disponível para foto de referência e para futuros checklists.
- Apenas `admin` vê o botão; `implantador` puro continua só configurando fotos dos itens existentes.

## Mudanças no banco

Hoje a tabela `public.checklist_items` permite somente SELECT (todos autenticados) e UPDATE (admin). Falta INSERT.

Migration:

1. Garantir que `id` seja gerado automaticamente. Hoje `id` é `integer NOT NULL` sem default — vamos criar uma `SEQUENCE` (se não existir) e definir `DEFAULT nextval(...)` para que novos inserts não precisem informar `id` manualmente.
2. Criar policy `INSERT` em `checklist_items` restrita a `current_role() = 'admin'`.
3. Criar RPC `public.add_checklist_item(_name text, _description text)` com `SECURITY DEFINER`:
   - Valida que `current_role() = 'admin'`.
   - Calcula `next_order = coalesce(max(order_idx), 0) + 1`.
   - Insere `(name, description, order_idx)` e retorna o `id` criado.

Usar RPC garante que o cálculo de `order_idx` é atômico e evita corrida com a unique-like ordenação atual.

## Mudanças no frontend

**Novo componente** `src/components/implantador/AddChecklistItemDialog.tsx`
- Modal com inputs Nome/Descrição (mesmo visual do `EditChecklistItemDialog`).
- Chama `supabase.rpc('add_checklist_item', { _name, _description })`.
- Em sucesso: toast + callback `onAdded` para recarregar a lista.

**`src/routes/implantador.referencias.$machineId.tsx`**
- Estado `addOpen`.
- Quando `isAdmin`, renderiza um botão “+ Adicionar item” abaixo do `space-y-3` da lista.
- `onAdded` chama `reloadItems()` (que já existe).

Sem mudanças em `EditChecklistItemDialog`, `ReferenceItemCard`, RPC `move_checklist_item`, ou nas telas de mecânico/operador — eles leem `checklist_items` dinamicamente e absorvem o novo item automaticamente.

## Riscos / observações

- Itens novos não terão foto de referência cadastrada para máquinas existentes; o card já trata `photoUrl = null` mostrando o ícone de câmera, então o fluxo continua válido.
- Não há DELETE de itens neste plano (pediram só “adicionar além dos 12”). Se mais tarde quiser excluir/desativar item, fazemos em iteração separada (precisa decidir o que acontece com `item_responses` históricos — provavelmente soft-delete via coluna `archived`).
- A página `/mecanico/historico` e `/mecanico/index` continuam funcionando porque consultam `checklist_items` por `id`/ordem dinamicamente.

## Resumo dos arquivos

- **Migration nova** (`supabase/migrations/...add_checklist_items_insert.sql`)
- **Novo**: `src/components/implantador/AddChecklistItemDialog.tsx`
- **Editar**: `src/routes/implantador.referencias.$machineId.tsx`
- **Editar**: `docs/AGROCOTTON_DECISIONS_LOG.md` (ADR-017)
