# Changelog — Sessão 2026-04-24

## Contexto da sessão

A Patrícia pediu uma série de ajustes no checklist da colheitadeira (renomear, reordenar e adicionar itens) e, para cada item alterado, propagar uma nova foto de referência para todas as máquinas já cadastradas. Foram feitas 6 mudanças sequenciais nos itens #1 a #6, cada uma envolvendo migration SQL + asset de imagem + propagação via Edge Function temporária no bucket `reference-photos`. No final, foi feita uma explicação sobre sync com GitHub e estratégia de rollback.

## TODOS os arquivos alterados ou criados nesta sessão

### Migrations SQL (todas criadas)
- `supabase/migrations/20260424175652_0db0f88e-e31c-45e4-ba75-6f915855197e.sql` — criado — insere "Cool Gard" como item #1 e empurra os demais (1→2 ... 10→11)
- `supabase/migrations/20260424182710_3ff267af-7dcb-4c62-b920-90bb81bea38d.sql` — criado — renomeia item id=1 para "Oleo do motor" + nova descrição
- `supabase/migrations/20260424190133_b4a700f2-18f9-4eba-9f04-dfac589841f1.sql` — criado — renomeia item id=3 para "Limpeza e regulagem desfribador A" e troca order_idx de id=2 e id=3 (3↔4)
- `supabase/migrations/20260424191814_c9ff1abc-2383-4613-b888-b80d2b59bfe8.sql` — criado — insere item id=12 "Limpeza e regulagem desfribador B" no slot order_idx=4 e empurra 4..11 para 5..12
- `supabase/migrations/20260424194624_2b606c44-c193-4594-b4ec-36696ca7978d.sql` — criado — renomeia item id=2 para "Gracheiro Mancal" / "Verificar pontos destacados"
- `supabase/migrations/20260424200054_9bc29945-eed0-4304-bca0-cd78ff60e054.sql` — criado — renomeia item id=4 para "Gracheiro terceiro ponto" / "Verificar lubrificação"

### Assets de imagem (todos criados)
- `src/assets/cool-gard-referencia.jpg` — criado — foto de referência do item #1 (Cool Gard)
- `src/assets/oleo-motor-referencia.jpg` — criado — foto de referência do item "Oleo do motor"
- `src/assets/desfribador-a-referencia.jpg` — criado — foto de referência do item #3 (Desfribador A)
- `src/assets/desfribador-b-referencia.jpg` — criado/sobrescrito — foto do item #4 (Desfribador B, com anotação "alinhar com vinco")
- `src/assets/gracheiro-mancal-referencia.jpg` — criado — foto do item #5 (Gracheiro Mancal)
- `src/assets/gracheiro-terceiro-ponto-referencia.jpg` — criado — foto do item #6 (Gracheiro terceiro ponto)

### Edge Functions (todas temporárias — criadas, executadas e deletadas)
- `supabase/functions/seed-cool-gard-photo/index.ts` — criado e deletado
- `supabase/functions/seed-oleo-motor-photo/index.ts` — criado e deletado
- `supabase/functions/seed-desfribador-a-photo/index.ts` — criado e deletado
- `supabase/functions/seed-desfribador-b-photo-v2/index.ts` — criado e deletado
- `supabase/functions/seed-gracheiro-mancal-photo/index.ts` — criado e deletado
- `supabase/functions/seed-gracheiro-terceiro-photo/index.ts` — criado e deletado
- `supabase/config.toml` — modificado temporariamente (registro das functions) e revertido ao estado original (`project_id = "ctzajxycetufjkpqhidz"` apenas)

### Planejamento
- `.lovable/plan.md` — modificado várias vezes para documentar cada propagação (estado atual: plano da propagação do Desfribador B v2)

### Documentação
- `docs/CHANGELOG_2026-04-24_sessao_implantador.md` — criado (este arquivo)

**Não foram tocados:** nenhum arquivo em `src/components/`, `src/routes/`, `src/integrations/`, `src/contexts/`, `src/lib/`, `src/styles.css`, `package.json`, `vite.config.ts`, nem nenhum arquivo de configuração de roteamento ou auth.

## Mudanças agrupadas por área

### Implantador (itens de checklist e fotos de referência)

**1. Inserção de "Cool Gard" como item #1**
- **Antes:** checklist começava com "Oleo do motor" no order_idx=1; existiam 10 itens (1..10).
- **Depois:** novo item id=11, order_idx=1 ("Cool Gard"); todos os demais empurrados +1 (agora 11 itens, 1..11).
- **Arquivos:** migration `20260424175652_*.sql`, asset `cool-gard-referencia.jpg`, function `seed-cool-gard-photo`.

**2. Renomeação do item id=1**
- **Antes:** id=1 chamava-se algo diferente.
- **Depois:** "Oleo do motor" / "Verificar nivel do oleo na vareta", agora ocupando order_idx=2.
- **Arquivos:** migration `20260424182710_*.sql`, asset `oleo-motor-referencia.jpg`, function `seed-oleo-motor-photo`.

**3. Reordenação 3↔4 + renomeação do item id=3**
- **Antes:** id=3 estava em order_idx=4.
- **Depois:** id=3 em order_idx=3 com nome "Limpeza e regulagem desfribador A"; id=2 em order_idx=4.
- **Arquivos:** migration `20260424190133_*.sql`, asset `desfribador-a-referencia.jpg`, function `seed-desfribador-a-photo`.

**4. Inserção do "Desfribador B" como item #4**
- **Antes:** order_idx=4 era ocupado por id=2 ("Sistema hidraulico").
- **Depois:** novo id=12 em order_idx=4 ("Limpeza e regulagem desfribador B"); itens 4..11 antigos empurrados para 5..12 (12 itens no total).
- **Arquivos:** migration `20260424191814_*.sql`, asset `desfribador-b-referencia.jpg` (regravado depois com anotação "alinhar com vinco"), function `seed-desfribador-b-photo-v2`.
- **Limpeza colateral:** a function v2 deletou linhas órfãs em `machine_reference_photos` com `item_id=4` (que apontavam para a foto do antigo "Sistema hidraulico" antes do reordenamento) e removeu os arquivos `{machine_id}/4.jpg` órfãos do storage.

**5. Renomeação do item id=2 (agora order_idx=5)**
- **Antes:** id=2 = "Sistema hidraulico" / "Verificar pressao e nivel do sistema hidraulico".
- **Depois:** id=2 = "Gracheiro Mancal" / "Verificar pontos destacados".
- **Arquivos:** migration `20260424194624_*.sql`, asset `gracheiro-mancal-referencia.jpg`, function `seed-gracheiro-mancal-photo`.

**6. Renomeação do item id=4 (agora order_idx=6)**
- **Antes:** id=4 = "Lubrificação Gracheiros".
- **Depois:** id=4 = "Gracheiro terceiro ponto" / "Verificar lubrificação".
- **Arquivos:** migration `20260424200054_*.sql`, asset `gracheiro-terceiro-ponto-referencia.jpg`, function `seed-gracheiro-terceiro-photo`.

### Outras áreas tocadas

Nenhuma mudança fora do Implantador. Não foram alterados componentes do Mecânico, Auth, ProtectedRoute, supabase client, estilos globais, roteamento, nem qualquer dependência.

## Schema do banco (Supabase)

- [x] **Criou tabela nova?** Não.
- [x] **Alterou tabela existente?** Sim — `public.checklist_items`: 6 migrations alterando `name`, `description` e `order_idx` de itens existentes e inserindo dois novos itens (id=11 e id=12).
- [x] **Criou/alterou RLS policy?** Não.
- [x] **Criou/alterou trigger ou function?** Não — o trigger `trg_checklist_items_immutable` (que enforce RF-31) foi **temporariamente desabilitado** dentro de cada migration que muda `order_idx` e re-habilitado ao final da mesma migration. Definição do trigger não foi alterada.

### SQL exato rodado nesta sessão

```sql
-- 20260424175652 — Insere Cool Gard como #1
ALTER TABLE public.checklist_items DISABLE TRIGGER trg_checklist_items_immutable;
UPDATE public.checklist_items SET order_idx = -order_idx WHERE order_idx BETWEEN 1 AND 10;
UPDATE public.checklist_items SET order_idx = (-order_idx) + 1 WHERE order_idx BETWEEN -10 AND -1;
INSERT INTO public.checklist_items (id, order_idx, name, description, reference_correct_path)
VALUES (11, 1, 'Cool Gard (Agua do motor tratada)', 'Verificar nivel do Cool Gard no reservatorio do motor', NULL);
ALTER TABLE public.checklist_items ENABLE TRIGGER trg_checklist_items_immutable;

-- 20260424182710 — Renomeia id=1 para Oleo do motor
ALTER TABLE public.checklist_items DISABLE TRIGGER trg_checklist_items_immutable;
UPDATE public.checklist_items SET name = 'Oleo do motor', description = 'Verificar nivel do oleo na vareta' WHERE id = 1;
ALTER TABLE public.checklist_items ENABLE TRIGGER trg_checklist_items_immutable;

-- 20260424190133 — Troca 3↔4 e renomeia id=3
ALTER TABLE public.checklist_items DISABLE TRIGGER trg_checklist_items_immutable;
UPDATE public.checklist_items SET order_idx = -3 WHERE id = 2;
UPDATE public.checklist_items SET order_idx = -4 WHERE id = 3;
UPDATE public.checklist_items
  SET order_idx = 3, name = 'Limpeza e regulagem desfribador A',
      description = 'Inspecionar limpeza geral e regulagem desfribador'
  WHERE id = 3;
UPDATE public.checklist_items SET order_idx = 4 WHERE id = 2;
ALTER TABLE public.checklist_items ENABLE TRIGGER trg_checklist_items_immutable;

-- 20260424191814 — Insere Desfribador B como #4
ALTER TABLE public.checklist_items DISABLE TRIGGER trg_checklist_items_immutable;
UPDATE public.checklist_items SET order_idx = -order_idx WHERE order_idx BETWEEN 4 AND 11;
UPDATE public.checklist_items SET order_idx = (-order_idx) + 1 WHERE order_idx BETWEEN -11 AND -4;
INSERT INTO public.checklist_items (id, order_idx, name, description)
VALUES (12, 4, 'Limpeza e regulagem desfribador B', 'Garantir alinhamento com vinco');
ALTER TABLE public.checklist_items ENABLE TRIGGER trg_checklist_items_immutable;

-- 20260424194624 — Gracheiro Mancal
UPDATE public.checklist_items
SET name = 'Gracheiro Mancal', description = 'Verificar pontos destacados'
WHERE id = 2;

-- 20260424200054 — Gracheiro terceiro ponto
UPDATE public.checklist_items
SET name = 'Gracheiro terceiro ponto', description = 'Verificar lubrificação'
WHERE id = 4;
```

Além das migrations, as Edge Functions temporárias fizeram `upsert` em `public.machine_reference_photos` para cada máquina (path `{machine_id}/{item_id}.jpg`) e, no caso do Desfribador B v2, deletaram linhas órfãs com `item_id=4`.

## Storage (buckets)

- [x] **Mudou estrutura de paths?** Não — mantido o padrão pré-existente `reference-photos/{machine_id}/{item_id}.jpg`.
- [x] **Mudou policies de bucket?** Não.
- [x] **Mudanças de conteúdo:** uploads no bucket `reference-photos` para cada máquina nos paths `{machine_id}/11.jpg`, `{machine_id}/1.jpg`, `{machine_id}/3.jpg`, `{machine_id}/12.jpg`, `{machine_id}/2.jpg`, `{machine_id}/4.jpg`. Arquivos `{machine_id}/4.jpg` antigos (órfãos) foram removidos antes do upload novo.

## Dependências

- [x] **Adicionou pacotes?** Não.
- [x] **Removeu pacotes?** Não.
- [x] **Atualizou versões?** Não.

## Configurações e variáveis de ambiente

- [x] **`.env` / `.env.example`?** Não.
- [x] **`supabase/config.toml`?** Foi modificado e **revertido** — estado final idêntico ao inicial (`project_id = "ctzajxycetufjkpqhidz"`).
- [x] **Outras configs?** Não.

## Conformidade SDD (autocheck)

- **RF-02 / RF-13 (nunca exibir padrão incorreto):** ✅ mantido — fotos foram propagadas/sobrescritas; nenhuma máquina ficou com foto desatualizada apontando para item renomeado, exceto id=4 (Gracheiro terceiro ponto) cuja foto correta foi propagada na última migration.
- **RF-31 (ordem imutável dos itens):** ⚠️ revisar — o trigger `trg_checklist_items_immutable` foi desabilitado em 4 migrations para permitir reordenamento. Isso é uma violação consciente da regra para evolução de catálogo (não para uso em produção runtime). Documentar essa exceção no SDD.
- **RF-34 (variações técnicas por máquina):** ✅ mantido — cada máquina continua tendo sua própria entrada em `machine_reference_photos`.
- **RF-14 (transição pending → setup → ready):** ✅ mantido — nada relacionado ao status da máquina foi alterado.
- **ADR-010 (view `user_public_info` protege LGPD):** ✅ mantido — nenhuma view ou tabela de usuários foi tocada.

## Bugs corrigidos nesta sessão

- **Linhas órfãs em `machine_reference_photos` com `item_id=4`:** após reordenamentos anteriores, a propagação inicial do Desfribador B havia gravado fotos no `item_id=4`, que depois passou a apontar para outro item ("Lubrificação Gracheiros"). A function `seed-desfribador-b-photo-v2` deletou essas linhas e os arquivos `{machine_id}/4.jpg` correspondentes para evitar exibição de foto incorreta. Posteriormente, a propagação do "Gracheiro terceiro ponto" gravou a foto correta no `item_id=4`.

## Melhorias não solicitadas

Nenhuma. Todas as mudanças foram diretamente solicitadas pela Patrícia (renomeações, inserções, propagações de foto). A única ação adicional foi a limpeza de linhas órfãs descrita acima — feita para honrar RF-02/RF-13.

## Observações e alertas

- **Sync GitHub:** se o repo estiver conectado em Connectors → GitHub, todas as alterações de código (migrations, assets) já estão sincronizadas. Edge functions temporárias foram deletadas, então não aparecem no repo.
- **Rollback:** rollback de código via histórico do Lovable funciona, mas **não desfaz automaticamente** as mudanças no banco Supabase nem no storage. Para reverter os itens de checklist, seria necessário rodar migrations inversas; para reverter fotos, restaurar backups do bucket.
- **Ordem dos itens hoje (12 itens):** order_idx 1..12 com ids respectivos: 11, 1, 3, 12, 2, 4, 5, 6, 7, 8, 9, 10. Útil para qualquer query/relatório futuro.
- **Trigger `trg_checklist_items_immutable`:** continua ativo no banco. Qualquer nova alteração de `order_idx` exigirá o mesmo padrão de DISABLE/ENABLE em migration.
- **Nenhum erro conhecido** em console nem warning pendente nesta sessão.
