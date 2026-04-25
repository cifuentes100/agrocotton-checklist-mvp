## Catálogo do checklist editável pelo admin durante implantação

Implementa parcialmente ADR-015 ("Catálogo gerenciável via UI") em formato simplificado, restrito ao admin, justificado pela fase atual de implantação (catálogo ainda em calibragem). Adiciona também a possibilidade do admin acessar o painel do implantador para liberar o trabalho dele quando necessário.

### Parte 1 — Admin acessa painel do implantador

**Como funciona hoje:** rota `/implantador/*` aceita roles `["implantador", "admin"]` (já configurado em `ProtectedRoute`). O admin já consegue entrar — mas não há link visível do painel admin para o painel implantador.

**Mudança:** adicionar no topbar/sidebar do `/admin` um botão "Modo Implantador" que navega para `/implantador/maquinas`. E recíproco no `/implantador` (apenas se role=admin): botão "Voltar para Admin" que navega para `/admin`. Isso evita digitar URL na mão.

### Parte 2 — Edição inline do catálogo na página de configuração

Local: `src/routes/implantador.referencias.$machineId.tsx` (página onde o admin/implantador já vê os 12 itens lado a lado com as fotos de referência). É o lugar natural — o catálogo é visualizado ali, então edição direta no card é a UX mais direta.

**Cada `ReferenceItemCard` ganha (apenas se role=admin):**
- **Botão lápis** (ícone `Pencil` do lucide) ao lado do nome → abre modal/dialog com dois campos: nome e descrição. Botões: Cancelar / Salvar.
- **Setas ↑ ↓** (ícones `ChevronUp` / `ChevronDown`) para mover o item para cima/baixo no catálogo. Seta ↑ desabilitada no primeiro item; ↓ desabilitada no último.

Implantador continua vendo a página normalmente sem esses controles (somente leitura do catálogo + upload de foto). Decisão deliberada: durante implantação só o admin (Patricia) ajusta o catálogo; implantadores são gente de campo e não devem mexer na estrutura.

### Parte 3 — Backend: permitir UPDATE em checklist_items

Hoje a tabela `checklist_items` tem RLS só com SELECT para autenticados. Para edição funcionar:

**Migration:**
1. Adicionar policy `UPDATE` em `checklist_items` permitindo apenas `current_role() = 'admin'`.
2. Remover trigger `prevent_order_idx_change` que hoje bloqueia QUALQUER mudança de `order_idx` (RF-31 estrita). Substituir por uma versão que **só dispara em runtime contra item_responses** — ou seja, manter a invariante "operador não pula ordem" sem impedir reordenamento administrativo do catálogo. Isso já está alinhado com ADR-013 ("imutabilidade em runtime, evolutividade em migrations") — esta mudança extende "evolutividade em migrations" para "evolutividade via UI admin".

**Algoritmo de reorder (cliente, dentro de uma transação RPC ou sequência de updates):**
- `move_up(item_id)`: troca `order_idx` desse item com o do item imediatamente acima. Como há `UNIQUE` implícito? Verifico no schema: não há unique constraint em order_idx, mas ainda assim a troca direta pode violar a sanidade. Fazer em 3 passos: item A vai pra `-1` (temporário), item B recebe o order_idx antigo de A, item A recebe o order_idx antigo de B. Encapsular numa **função RPC** `move_checklist_item(item_id, direction)` em SQL para atomicidade.

### Parte 4 — Documentação

Adicionar **ADR-016** ao `docs/AGROCOTTON_DECISIONS_LOG.md`:
- Título: "Edição admin do catálogo via UI durante implantação (versão mínima de ADR-015)"
- Status: Aceita e implementada
- Relaciona-se com: ADR-013, ADR-015
- Justifica que a versão entregue é mínima (rename + reorder por admin), sem soft delete, sem audit log, sem state machine — ADR-015 permanece como referência da versão completa pós-MVP alfa.

Atualizar `docs/AGROCOTTON_STATUS.md` na seção "Próximos passos" marcando que parte de ADR-015 foi entregue.

---

### Detalhes técnicos

**Arquivos novos:**
- (nenhum) — toda mudança em arquivos existentes.

**Arquivos modificados:**

1. **Migration SQL (Supabase):**
   - `CREATE POLICY "admin atualiza checklist_items" ON public.checklist_items FOR UPDATE TO authenticated USING (public.current_role() = 'admin') WITH CHECK (public.current_role() = 'admin');`
   - `DROP TRIGGER IF EXISTS ...` no trigger `prevent_order_idx_change` (e/ou drop da função se não usada). Manter `enforce_item_order` (esse atua em `item_responses` e protege runtime).
   - `CREATE OR REPLACE FUNCTION public.move_checklist_item(_item_id int, _direction text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ ... $$;` que valida role=admin, encontra vizinho na direção, faz swap atômico via order_idx temporário negativo.
   - `GRANT EXECUTE ON FUNCTION public.move_checklist_item(int, text) TO authenticated;`

2. **`src/components/implantador/ReferenceItemCard.tsx`:**
   - Adicionar props opcionais `canEdit: boolean`, `canMoveUp: boolean`, `canMoveDown: boolean`, `onEdit()`, `onMoveUp()`, `onMoveDown()`.
   - Renderizar botões lápis + ↑ ↓ (`Pencil`, `ChevronUp`, `ChevronDown`) ao lado do nome quando `canEdit` for true.

3. **`src/components/implantador/EditChecklistItemDialog.tsx` (novo):**
   - Dialog com Input (nome) + Textarea (descrição). Salva via `supabase.from("checklist_items").update(...)`.

4. **`src/routes/implantador.referencias.$machineId.tsx`:**
   - Importar `useAuth` para detectar role.
   - Para admin: passar `canEdit/canMoveUp/canMoveDown` + handlers para o Card.
   - `handleEdit(item)`: abre dialog.
   - `handleMove(item, direction)`: chama `supabase.rpc("move_checklist_item", { _item_id, _direction })` e recarrega lista.

5. **`src/routes/admin.tsx` (ou layout admin):**
   - Botão "Modo Implantador" no topbar.

6. **`src/routes/implantador.tsx`:**
   - Quando `role === "admin"`, mostrar botão "Voltar para Admin" no topbar.

7. **`docs/AGROCOTTON_DECISIONS_LOG.md`:**
   - Adicionar ADR-016 (antes do template de "próximas decisões", se houver).

8. **`docs/AGROCOTTON_STATUS.md`:**
   - Atualizar item "Próximos passos" referenciando ADR-016.

### O que NÃO é feito agora

- Soft delete de itens (item.active boolean) — fica para ADR-015 pós-MVP.
- Adicionar/remover itens via UI (só rename + reorder por enquanto).
- Audit log de mudanças.
- State machine `editable / frozen / maintenance`.
- Permitir implantador editar (continua só admin).
