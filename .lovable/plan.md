## Objetivo

Fazer a tela **Configurar referências** e todo o módulo **Implantador** funcionarem bem em celulares (testado a partir de 360px de largura), mantendo o visual atual no desktop.

## Diagnóstico

Hoje o layout quebra em mobile principalmente por:

1. `src/routes/implantador.tsx` usa **sidebar fixa de 240px sempre visível** + `padding 24px` no conteúdo. Em telas <768px sobra muito pouco espaço para o conteúdo.
2. O **header** tem texto grande e botões lado a lado — estoura em telas estreitas.
3. Em `src/routes/implantador.referencias.$machineId.tsx`:
   - Título com serial em uma única linha pode estourar.
   - Botão "Finalizar configuração" está alinhado à direita com `size="lg"` — ocupa muito espaço.
   - Botão "+ Adicionar item" centralizado fica pequeno.
4. Em `src/components/implantador/ReferenceItemCard.tsx`:
   - Thumbnail 96×96 + 4 botões de ação (editar/up/down) na mesma linha do título competem por espaço.
   - O botão "Adicionar foto do padrão correto" tem texto longo que pode estourar.
5. Os diálogos `EditChecklistItemDialog` e `AddChecklistItemDialog` usam o `DialogContent` padrão (largura mínima fixa) — pode encostar nas bordas em telas pequenas.

## Mudanças propostas

### 1. `src/routes/implantador.tsx` — layout responsivo com drawer

- Esconder a sidebar fixa em `<md` e expô-la via **Sheet (drawer lateral)** acionado por um botão "menu" (ícone hambúrguer) no header.
- Em `≥md`: comportamento atual (sidebar fixa de 240px).
- Header:
  - Reduzir padding lateral em mobile (`px-3 md:px-6`).
  - Ocultar o subtítulo "— Modo Implantador" em mobile (`hidden sm:inline`).
  - Botões "Voltar para Admin" e "Sair" mantêm `size="sm"`; em mobile mostrar só ícones quando necessário (ou texto curto "Admin"/"Sair").
- Conteúdo: `p-4 md:p-6`.

### 2. `src/routes/implantador.referencias.$machineId.tsx` — densidade mobile

- Título: `text-xl md:text-2xl`, permitir quebra (`break-words`); serial em linha separada se necessário.
- Card de progresso: manter, mas com `text-xs md:text-sm`.
- Botão "+ Adicionar item ao checklist": **`w-full md:w-auto`** (ocupar largura total em mobile).
- Botão "Finalizar configuração": **`w-full md:w-auto`** e container `flex-col md:flex-row` em vez de `justify-end`.
- Espaçamento da lista: `space-y-3` mantido.

### 3. `src/components/implantador/ReferenceItemCard.tsx` — reflow em mobile

- Thumbnail: `h-20 w-20 md:h-24 md:w-24` (um pouco menor em mobile).
- Cabeçalho do card (`#N + nome + ações`):
  - Em mobile, **mover os botões de ação (editar/up/down) para uma segunda linha abaixo do nome**, alinhados à direita, em vez de ficarem na mesma linha.
  - Implementação: trocar o container de `flex items-start justify-between` para um wrapper `flex flex-col gap-2`, com o bloco de ações usando `self-end md:self-auto md:absolute`-style — na prática, manter HTML e usar classes responsivas: `flex-wrap` + `w-full md:w-auto justify-end` no grupo de botões.
- Texto do botão de upload: encurtar em mobile para "Adicionar foto" (texto completo no `md:` ou via `hidden sm:inline`).

### 4. Diálogos (`EditChecklistItemDialog`, `AddChecklistItemDialog`)

- Adicionar `className="... w-[calc(100vw-2rem)] max-w-md sm:w-full"` no `DialogContent` para garantir margem nas bordas em telas pequenas.
- `DialogFooter`: já é `flex-col-reverse sm:flex-row` por padrão do shadcn — ok.

### 5. QA visual

Após implementar, validar via preview nos breakpoints:
- 375×812 (iPhone)
- 414×896
- 768×1024 (tablet)
- 1280×720 (desktop, regressão)

## Arquivos afetados

- `src/routes/implantador.tsx` (sidebar → drawer em mobile, header responsivo)
- `src/routes/implantador.referencias.$machineId.tsx` (botões full-width em mobile, título responsivo)
- `src/components/implantador/ReferenceItemCard.tsx` (thumbnail menor, ações em segunda linha em mobile)
- `src/components/implantador/EditChecklistItemDialog.tsx` (largura responsiva do dialog)
- `src/components/implantador/AddChecklistItemDialog.tsx` (largura responsiva do dialog)

## Fora de escopo

- Refatorar as outras rotas do Implantador (`/maquinas`, `/index`) — mesmo drawer já as cobre, mas a densidade interna delas será revisada apenas se você pedir.
- Mudanças nos módulos `mecanico` e `admin`.

Sem alterações de banco de dados nesta tarefa.
