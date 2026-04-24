## Substituição do item #8: "Esteira RMB" → "Pino do cabeçalho"

Seguindo o padrão estabelecido nas 7 propagações anteriores desta sessão (Cool Gard, Óleo, Desfribador A, Desfribador B, Gracheiro Mancal, Gracheiro terceiro ponto, Luva de redução).

### Mapeamento

- **Posição no catálogo (order_idx):** 8
- **ID interno (preservado):** 6
- **Nome atual:** "Esteira RMB"
- **Nome novo:** "Pino do cabeçalho"
- **Descrição nova:** "Verificar lubrificação"

### Etapas

**1. Migration SQL (UPDATE em checklist_items)**
```sql
UPDATE public.checklist_items
SET 
  name = 'Pino do cabeçalho',
  description = 'Verificar lubrificação'
WHERE id = 6;
```
- `order_idx = 8` permanece intacto (preserva posição no catálogo).
- ID interno preservado (não há reordenamento, ADR-011 continua válido para histórico).

**2. Asset**
- Salvar a imagem anexada (com label amarelo "Pino do Cabeçalho") em `src/assets/pino-cabecalho-referencia.jpg`.

**3. Edge Function temporária `seed-pino-cabecalho-photo`**
- Imagem embutida em base64 dentro do `index.ts`.
- `verify_jwt = false` em `supabase/config.toml` (temporário).
- Para cada uma das 2 máquinas (`AGR-2026-001` e `AGR-2026-002`):
  - Upload em `reference-photos/{machine_id}/6.jpg` (upsert).
  - Upsert em `machine_reference_photos` com `item_id = 6`.

**4. Executar e cleanup**
- Deploy → curl POST → confirmar `count: 2` na resposta.
- Delete da Edge Function via tool.
- Remover diretório local `supabase/functions/seed-pino-cabecalho-photo/`.
- Reverter `supabase/config.toml` para o estado base (apenas `project_id`).
- Remover `/tmp/img_b64.txt`.

### Resultado esperado

- Item #8 do catálogo passa a ser "Pino do cabeçalho / Verificar lubrificação" (id=6 mantido).
- Foto de referência específica do pino do cabeçalho disponível para as 2 máquinas existentes.
- Catálogo atual continua com 12 itens, ordem inalterada.
- Confirmação retornada: quantas máquinas receberam a foto (esperado: 2).

### Sem alterações em

- `docs/AGROCOTTON_DECISIONS_LOG.md` (esta substituição se enquadra na evolutividade já coberta por ADR-013).
- `docs/AGROCOTTON_STATUS.md` (catálogo continua com 12 itens).
- Componentes React (apenas dados mudam).
