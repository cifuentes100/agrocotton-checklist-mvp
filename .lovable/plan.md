
# Plano — Inserir "Cool Gard" como novo item #1 do checklist

## Mudança proposta

A lista de 10 itens vira 11. O novo item entra no topo, e tudo que estava lá desce uma posição.

### Antes → Depois

| order_idx | Antes | Depois |
|-----------|-------|--------|
| **1** | Agua e oleo do motor | **Cool Gard (Água do motor tratada)** *(novo)* |
| 2 | Sistema hidraulico | Agua e oleo do motor |
| 3 | Limpeza e regulagem | Sistema hidraulico |
| 4 | Lubrificacao Gracheiros | Limpeza e regulagem |
| 5 | Correias RMB | Lubrificacao Gracheiros |
| 6 | Esteira RMB | Correias RMB |
| 7 | Correntes RMB | Esteira RMB |
| 8 | Rolamentos RMB e cesto | Correntes RMB |
| 9 | Calibragem de pneus | Rolamentos RMB e cesto |
| 10 | Filtro de ar | Calibragem de pneus |
| **11** | — | Filtro de ar |

> **Importante:** o `id` de cada item NÃO muda — só o `order_idx` muda. Isso preserva todos os históricos (`item_responses` continua apontando para o `item_id` correto, sem perder nada).

---

## 1. Migração SQL (uma única migration)

A trigger `prevent_order_idx_change` bloqueia qualquer UPDATE em `order_idx`. Vou desabilitar temporariamente, reorganizar e religar.

```sql
-- 1. Desabilita trigger de imutabilidade temporariamente
alter table public.checklist_items disable trigger prevent_order_idx_change;

-- 2. Empurra todos os itens existentes para baixo (10 → 11, 9 → 10, ..., 1 → 2)
--    Atualiza em ordem decrescente para não quebrar a constraint UNIQUE caso exista.
update public.checklist_items set order_idx = order_idx + 1
where order_idx between 1 and 10;

-- 3. Insere o novo item Cool Gard como #1
insert into public.checklist_items (id, order_idx, name, description, reference_correct_path)
values (
  11, -- próximo id sequencial (atualmente o maior é 10)
  1,
  'Cool Gard (Agua do motor tratada)',
  'Verificar nivel do Cool Gard no reservatorio do motor',
  null
);

-- 4. Religa a trigger
alter table public.checklist_items enable trigger prevent_order_idx_change;
```

**Observações sobre a trigger `enforce_item_order` em `item_responses`:**
- Ela valida sequência **na hora do INSERT** comparando o `order_idx` corrente.
- Não vai disparar nessa migration (não estamos inserindo respostas).
- Para runs **futuras** das 2 máquinas afetadas, o operador vai precisar começar pelo novo #1 (Cool Gard). Isso já é o comportamento esperado do app.
- Para runs **antigas** (já completas), nada quebra — a leitura junta `item_id` direto, sem revalidar ordem.

---

## 2. Foto de referência — propagar para as 2 máquinas existentes

A imagem que você enviou (Cool Gard + colheitadeira com marcação "verificar nível") será:

1. Copiada para `src/assets/cool-gard-referencia.jpg` (workspace do projeto).
2. Lida pela migration via um script Node auxiliar **OU** subida manualmente por upload no bucket `reference-photos` em dois caminhos:
   - `5a61c9fb-52ea-4c2a-8b86-8a63c48811e7/11.jpg`
   - `711ed80e-95f4-4618-a1bc-6c202eb4e37d/11.jpg`
3. Após o upload, INSERTs em `machine_reference_photos`:

```sql
insert into public.machine_reference_photos (machine_id, item_id, path, updated_at)
values
  ('5a61c9fb-52ea-4c2a-8b86-8a63c48811e7', 11, '5a61c9fb-52ea-4c2a-8b86-8a63c48811e7/11.jpg', now()),
  ('711ed80e-95f4-4618-a1bc-6c202eb4e37d', 11, '711ed80e-95f4-4618-a1bc-6c202eb4e37d/11.jpg', now())
on conflict (machine_id, item_id) do update
  set path = excluded.path, updated_at = excluded.updated_at;
```

**Como vou subir a foto para o Storage:** vou rodar um script Node usando a service_role_key (no sandbox) que lê `src/assets/cool-gard-referencia.jpg` e faz upload nos dois caminhos via API do Storage. Já tenho `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` disponíveis no ambiente.

> Nota: a imagem que você enviou é uma colagem didática (embalagem do Cool Gard + foto de uma colheitadeira John Deere genérica). Ela serve como referência visual inicial. O implantador pode substituir por uma foto real específica de cada máquina depois — o botão "Substituir foto" na tela de referências já permite isso.

---

## 3. Status das máquinas

Conforme você decidiu: **mantém o status atual** (`ready`) das 2 máquinas. A propagação automática da foto vai garantir que elas tenham as 11 fotos completas após a migration, então o status `ready` continua válido sem nenhum aviso necessário.

---

## 4. Documentação (ADRs e STATUS)

### `docs/AGROCOTTON_DECISIONS_LOG.md` — adicionar **ADR-013** ao final

```markdown
## ADR-013 — Inclusão do item "Cool Gard" como #1 do checklist

**Data:** 2026-04-24
**Status:** Aceito

### Contexto
A verificação de nível do Cool Gard (líquido de arrefecimento tratado do motor) é uma rotina crítica omitida na lista original de 10 itens. Detectada na revisão com Fernando/Márcio.

### Decisão
- Cool Gard entra como item **#1** do checklist (ordem `order_idx = 1`).
- Os 10 itens originais descem uma posição cada (#1→#2 ... #10→#11).
- IDs originais são preservados — só o `order_idx` muda.
- A trigger `prevent_order_idx_change` é temporariamente desabilitada apenas durante a migration.
- Foto de referência inicial é propagada para todas as máquinas já cadastradas (atualmente 2). O implantador pode substituir depois.

### Consequências
- O checklist agora tem 11 etapas, não 10. Toda a UI e textos que mencionam "10 itens" devem ser atualizados.
- Históricos (`item_responses`) ficam intactos porque referenciam `item_id`, não `order_idx`.
- Próximo run de cada máquina deve começar pelo novo #1 (Cool Gard) — comportamento já garantido pela trigger `enforce_item_order`.
```

### `docs/AGROCOTTON_STATUS.md` — atualizar

- "Última atualização": **2026-04-24**.
- Adicionar **ADR-013** na lista de decisões.
- Em qualquer menção a "10 itens" / "10 etapas" do checklist, trocar para **"11 itens"**.
- Preservar todo o resto do conteúdo (não apagar nada).

---

## 5. Atualização da UI (textos hardcoded)

Procurar por strings que mencionam "10" no contexto do checklist e ajustar:

- `src/routes/implantador.referencias.$machineId.tsx`:
  - Cabeçalho "X de 10 itens configurados" — já é dinâmico (`totalItems`), nada a mudar.
  - Botão "Finalizar configuração" aparece quando `configuredCount === totalItems` — já dinâmico.
- `.lovable/plan.md` e outros docs internos: atualizar menções a "10 itens" para "11 itens" onde aparecer (apenas nos arquivos vivos: `docs/`).
- Se o Dashboard Mecânico tiver alguma referência fixa ao número 10, ajustar.

Vou rodar `rg "10 itens|10 etapas|10 fotos"` antes de editar para mapear todos os pontos.

---

## Detalhes técnicos

**Arquivos a criar:**
- `supabase/migrations/{timestamp}_inserir_cool_gard_item_1.sql`
- `src/assets/cool-gard-referencia.jpg` (cópia de `user-uploads://nivel_cool-gard.jpg`)

**Arquivos a editar:**
- `docs/AGROCOTTON_DECISIONS_LOG.md` (append ADR-013)
- `docs/AGROCOTTON_STATUS.md` (data + ADR + número de itens)
- Qualquer arquivo encontrado por `rg` com referência fixa a "10 itens" no contexto do checklist

**Operações fora da migration (executadas via script Node no sandbox):**
1. Upload de `src/assets/cool-gard-referencia.jpg` para `reference-photos/5a61c9fb-52ea-4c2a-8b86-8a63c48811e7/11.jpg`
2. Upload da mesma foto para `reference-photos/711ed80e-95f4-4618-a1bc-6c202eb4e37d/11.jpg`
3. Os INSERTs em `machine_reference_photos` ficam **dentro** da migration (após a foto estar no bucket).

**Ordem de execução:**
1. Copiar foto para `src/assets/`.
2. Rodar script Node para upload no Storage (2 caminhos).
3. Aplicar migration SQL (reorganiza `order_idx` + insere novo item + INSERTs em `machine_reference_photos`).
4. Atualizar docs.
5. Rodar `rg` e ajustar menções a "10 itens" se houver.

**Fora do escopo:**
- Renumerar `id` dos itens (preservados intactos).
- Mudar status das máquinas existentes.
- Editar UI dinâmica que já lê `totalItems` da query.
- Tela do Admin / Bot WhatsApp.

