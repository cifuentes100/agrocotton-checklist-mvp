## Contexto

O usuário enviou a nova foto de referência para o item **#4 — "Limpeza e regulagem desfribador B"** (com a anotação visual "alinhar com vinco"). Essa foto precisa ser propagada para todas as máquinas existentes (atualmente 2).

## Descoberta importante

Ao verificar o banco, encontrei que o item **#4** tem `id = 12` no banco (foi inserido recentemente). Porém, a propagação anterior havia gravado fotos em `machine_reference_photos` usando `item_id = 4`, que na verdade hoje corresponde a outro item ("Lubrificação Gracheiros", order #6) — e não ao item #4 atual.

Como o `ValidationDrawer` e a tela de referências usam o **PK do item** (`item_id`) para buscar a foto, as 2 linhas atualmente em `item_id = 4` estão **órfãs/incorretas** — pertencem ao antigo item que ocupava a posição #4 antes do reordenamento.

## O que será feito

### 1. Salvar a nova foto no projeto
Sobrescrever `src/assets/desfribador-b-referencia.jpg` com a imagem enviada (a versão com a anotação "alinhar com vinco").

### 2. Edge Function temporária `seed-desfribador-b-photo-v2`
- Faz o upload da nova foto (base64 embutida) para o bucket `reference-photos` em `{machine_id}/12.jpg` para cada máquina.
- Faz `upsert` em `machine_reference_photos` com `item_id = 12, path = '{machine_id}/12.jpg'`.
- **Limpa as linhas órfãs**: deleta de `machine_reference_photos` onde `item_id = 4` (essas linhas apontam para uma foto que pertencia ao antigo "Sistema hidráulico" quando ocupava order_idx 4 — não correspondem ao item id=4 atual "Lubrificação Gracheiros").
- Também remove os arquivos `{machine_id}/4.jpg` do storage para não deixar lixo.

### 3. Deploy, executar e remover
- Deploy da function.
- Chamar via curl.
- Deletar a function e limpar `supabase/config.toml`.

## Detalhes técnicos

- **Item alvo**: `checklist_items.id = 12`, `order_idx = 4`, name = "Limpeza e regulagem desfribador B"
- **Bucket**: `reference-photos`
- **Path pattern**: `{machine_id}/{item_id}.jpg` → `{machine_id}/12.jpg`
- **Máquinas**: 2 (`5a61c9fb…` e `711ed80e…`)
- **Cleanup**: remover linhas e arquivos órfãos de `item_id = 4` que sobraram da renumeração anterior

## Resultado esperado

- Item #4 ("Limpeza e regulagem desfribador B") com a foto correta (alinhar com vinco) propagada nas 2 máquinas em `item_id = 12`.
- Linhas órfãs em `item_id = 4` removidas — o item id=4 ("Lubrificação Gracheiros") fica sem foto até o implantador subir uma própria.
- Nenhuma alteração no schema ou nos demais itens.
