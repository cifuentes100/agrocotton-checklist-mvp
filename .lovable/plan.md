## Substituição do item #9: "Correntes RMB" → "Gracheiro pistão da unidade"

Seguindo o padrão estabelecido nas 8 propagações anteriores desta sessão.

### Mapeamento

- **Posição no catálogo (order_idx):** 9
- **ID interno (preservado):** 7
- **Nome atual:** "Correntes RMB"
- **Nome novo:** "Gracheiro pistão da unidade"
- **Descrição nova:** "Verificar lubrificação"

### Etapas

**1. Migration SQL**
```sql
UPDATE public.checklist_items
SET 
  name = 'Gracheiro pistão da unidade',
  description = 'Verificar lubrificação'
WHERE id = 7;
```

**2. Asset**
- Salvar a imagem anexada (label amarelo "Pistão da unidade") em `src/assets/gracheiro-pistao-unidade-referencia.jpg`.

**3. Edge Function temporária `seed-gracheiro-pistao-photo`**
- Imagem embutida em base64 no `index.ts`.
- `verify_jwt = false` em `supabase/config.toml` (temporário).
- Para cada uma das 2 máquinas (`AGR-2026-001`, `AGR-2026-002`):
  - Upload em `reference-photos/{machine_id}/7.jpg` (upsert).
  - Upsert em `machine_reference_photos` com `item_id = 7`.

**4. Executar e cleanup**
- Deploy → POST → confirmar `count: 2`.
- Delete edge function via tool.
- Remover diretório local da function.
- Reverter `supabase/config.toml` para apenas `project_id`.
- Remover `/tmp/img_b64.txt`.

### Resultado esperado

- Item #9 do catálogo passa a ser "Gracheiro pistão da unidade / Verificar lubrificação" (id=7 mantido, order_idx=9 mantido).
- Foto de referência específica disponível para as 2 máquinas existentes.
- Catálogo continua com 12 itens, ordem inalterada.

### Sem alterações em

- Docs SDD (substituição coberta por ADR-013).
- Componentes React (apenas dados mudam).
