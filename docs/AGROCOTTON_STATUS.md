# AgroCotton Serviços — Status do Projeto

> **Documento vivo.** Atualizado conforme a execução avança. A seção "Progresso" é a
> fonte de verdade sobre onde estamos. Decisões arquiteturais ficam em
> `AGROCOTTON_DECISIONS_LOG.md`.

**Última atualização:** 2026-04-27
**Fase atual:** Bot WhatsApp — migração para whapi.cloud em execução
**Próximo marco:** Admin com backlog + dashboard + CRUD

> **Nota (ADR-011):** o checklist agora tem **11 itens**, não 10. O novo #1 é
> "Cool Gard (Água do motor tratada)". Todos os outros desceram uma posição.
> Histórico antigo permanece íntegro porque os IDs internos foram preservados.

---

## 🎯 Visão geral do projeto

**Cliente:** AgroCotton Serviços (empresa de serviços de colheita de algodão)

**Objetivo MVP:** Sistema de checklist pré-operação para colheitadeiras de algodão,
com validação do mecânico e backlog administrativo.

**Fluxo principal:**
```
05:30 da manhã
    ↓
Operador manda "start" no WhatsApp pro bot
    ↓
Bot identifica o número → busca na tabela users → reconhece operador
    ↓
Operador seleciona máquina → responde 10 itens (OK/NOK + foto)
    ↓
Foto NOK vai pro mecânico validar no app web
    ↓
"🤠 Vamo cavalo!" ao final
    ↓
Admin vê tudo no backlog
```

---

## 👥 Perfis e canais

| Perfil | Canal | Autenticação |
|---|---|---|
| **Operador** | WhatsApp (bot) | ❌ Sem login. Bot identifica pelo telefone cadastrado |
| **Mecânico** | Web app (Lovable) | ✅ Email + senha |
| **Admin** | Web app (Lovable) | ✅ Email + senha |
| **Implantador** | Web app (Lovable) | ✅ Email + senha |

---

## 📐 Stack

- **Frontend:** React 18 + TypeScript + Tailwind + Lovable
- **Backend:** Supabase (Postgres + Storage + Auth + Realtime)
- **Bot:** Edge Function Deno + WhatsApp (provider a definir: uazapi ou Cloud API)
- **Deploy:** Lovable (web) + Supabase (backend) + Edge Functions (bot)

---

## ✅ Progresso

### Infraestrutura
- [x] Projeto Supabase criado (`agrocotton-mvp`, região São Paulo)
- [x] Schema SQL executado (8 tabelas + RLS + triggers)
- [x] Seed dos itens canônicos do checklist (RF-31) — **11 itens após ADR-011**
- [x] Buckets de Storage criados (`checklist-photos`, `reference-photos`)
- [x] Projeto Lovable criado (`AgroCotton Checklist MVP`)
- [x] Integração Lovable ↔ Supabase autorizada e funcionando
- [x] Landing page inicial renderizando
- [x] Repositório GitHub conectado (privado: `cifuentes100/agrocotton-checklist-mvp`)
- [x] Sincronização automática Lovable ↔ GitHub (150+ commits do lovable-dev[bot])
- [x] Backup versionado do código-fonte estabelecido

### Aplicação Web (Lovable)
- [x] Autenticação por email/senha para mecânico/admin/implantador
- [x] Rotas protegidas por perfil
- [x] Dashboard Implantador — layout + lista de máquinas + cadastro de máquinas + 12 fotos de referência por máquina (ADR-009, ADR-013)
- [x] Dashboard Mecânico — fila de validações NOK + drawer comparativo + histórico (ADR-010)
- [ ] Dashboard Admin (backlog + dashboard + CRUD)

### Bot WhatsApp (rota Lovable + cron externo)
- [x] Provedor WhatsApp definido: whapi.cloud (ADR-018)
- [x] Canal DEADPL-Y5ZLU conectado (+55 61 99814 6922)
- [x] Tabela wa_processed criada (idempotência)
- [x] Webhook reescrito para whapi com 5 hardenings
- [ ] WEBHOOK_SECRET definitivo (atualmente usando temporário)
- [ ] Cron 05:30 kickoff matinal (Supabase pg_cron — pendente)
- [ ] State machine do operador (seleção de máquina → 12 itens → foto OK/NOK)
- [ ] Supervisão passiva em grupo enriquecida (RF-32)
- [ ] Relatórios sob demanda (RF-33)

### Testes e validação
- [ ] Teste end-to-end com operador real da AgroCotton
- [ ] Teste do mecânico validando fotos reais
- [ ] Teste do implantador cadastrando uma máquina do zero

---

## 🔒 Segurança em verificação (em andamento)

### RLS — Verificação final
Auditoria completa de Row Level Security em todas as tabelas está em andamento.
Objetivo: confirmar que o estado atual está coerente com os ADRs (principalmente 
ADR-008, ADR-010) e classificar os warnings pré-existentes do linter.

**Warnings conhecidos do Supabase Linter** (pré-existentes, não bloqueantes):

| Warning | Gravidade | Status |
|---|---|---|
| Security Definer View | 🟢 Intencional | Documentado no ADR-010 (proteção LGPD) |
| `machine_serials` sem auth adequado | ⚠️ Média | A catalogar em ADR futuro |
| Leaked Password Protection off | 🟡 Baixa | Feature opcional, a ativar pré-produção |
| Function Search Path | 🟢 Baixa | Cosmético, não afeta segurança |
| RLS Enabled No Policy | 🟡 Baixa | Intencional em tabelas bloqueadas por design |

---

## 🗺️ Próximos passos imediatos

1. Concluir verificação de RLS e catalogar findings (ADR futuro se necessário)
2. Construir Dashboard Admin (RF-35: contador de lubrificação + relatórios + CRUD usuários)
3. Decidir ADR-003 (provider WhatsApp: uazapi vs Cloud API)
4. Construir Bot WhatsApp (após ADR-003 resolvido)

---

## 🚨 Pontos de atenção pendentes

- **Decisão sobre provider do WhatsApp** ainda não foi tomada. Ver
  `AGROCOTTON_DECISIONS_LOG.md` → ADR-003 (pendente).
- **Seed de usuários iniciais** no Supabase: precisa definir email/senha/role de pelo
  menos 1 admin, 1 mecânico e 1 implantador para começar a testar.
  - ⚠️ A tabela `public.users` **não tem coluna `email`**. O vínculo com `auth.users` é
    feito pelo `id` (uuid). Portanto, o seed manual deve usar o mesmo `id` do usuário
    criado no Supabase Auth. Exemplo:
    ```sql
    -- Após criar o usuário em Authentication → Users no painel Supabase:
    INSERT INTO public.users (id, name, phone, role)
    SELECT id, 'Fulano de Tal', '+5511999999999', 'admin'
    FROM auth.users
    WHERE email = 'fulano@agrocotton.com';
    ```
    Se o usuário autenticar mas não existir em `public.users`, o app faz logout
    automático e mostra "Usuário sem permissão".
- **Fotos de referência reais** dos 11 itens: precisam ser levantadas em campo pelo
  implantador na primeira visita à AgroCotton. Conforme **ADR-009**, essas fotos são
  agora armazenadas **por máquina** na tabela `machine_reference_photos` (não mais
  globalmente em `checklist_items.reference_correct_path`, que ficou DEPRECATED).
  A foto do novo item #1 (Cool Gard) já foi propagada automaticamente para as
  máquinas existentes (ADR-011) com uma colagem didática — o implantador pode
  substituir por foto real específica quando for ao campo.
- **Contador de horas de lubrificação (RF-35)**: ainda não existe fonte de dados.
  Definir: será manual (operador informa) ou integrado com a máquina? MVP provavelmente
  manual.

---

## 📋 Invariantes SDD (não-negociáveis)

Para referência rápida, as regras que NUNCA podem ser quebradas:

- **RF-31** — sequência de **12 itens** (atualizada em 24/04/2026 — ver ADR-013), finalização "Vamo cavalo!". **Imutabilidade em runtime** (operador não pode pular ordem, aplicação/bot enforça). **Evolutividade em migrations** até o MVP alfa.
- **RF-02/RF-13** — exibir APENAS o padrão correto. Nunca padrão incorreto.
- **RF-03** — foto nova obrigatória em OK e NOK. Câmera direta; galeria bloqueada.
- **RF-35** — contador de horas de lubrificação com alerta persistente.
- **RF-36** — recusa exige justificativa textual ≥ 20 chars, auditável.

---

## 📋 Catálogo atual do checklist (24/04/2026)

12 itens na ordem canônica de inspeção:

| order_idx | id | Nome |
|---|---|---|
| 1 | 11 | Cool Gard (Água do motor tratada) |
| 2 | 1 | Óleo do motor |
| 3 | 3 | Limpeza e regulagem desfribador A |
| 4 | 12 | Limpeza e regulagem desfribador B |
| 5 | 2 | Gracheiro Mancal |
| 6 | 4 | Gracheiro terceiro ponto |
| 7 | 5 | Correias RMB |
| 8 | 6 | Esteira RMB |
| 9 | 7 | Correntes RMB |
| 10 | 8 | Rolamentos RMB e cesto |
| 11 | 9 | Calibragem de pneus (interno 50 / externo 45 / traseiro 50 PSI) |
| 12 | 10 | Filtro de ar |

Qualquer alteração futura exige ADR e ocorre antes do MVP alfa (ver ADR-013).

---

## 📁 Arquivos relacionados

- `agrocotton_prompts_lovable_revisados.md` — prompts originais SDD revisados
- `AGROCOTTON_DECISIONS_LOG.md` — log de decisões arquiteturais (ADRs)
- `AGROCOTTON_STATUS.md` — este arquivo
