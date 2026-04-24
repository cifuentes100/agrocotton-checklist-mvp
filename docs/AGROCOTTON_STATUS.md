# AgroCotton Serviços — Status do Projeto

> **Documento vivo.** Atualizado conforme a execução avança. A seção "Progresso" é a
> fonte de verdade sobre onde estamos. Decisões arquiteturais ficam em
> `AGROCOTTON_DECISIONS_LOG.md`.

**Última atualização:** 2026-04-24
**Fase atual:** Construção — Dashboard Admin
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

### Aplicação Web (Lovable)
- [x] Autenticação por email/senha para mecânico/admin/implantador
- [x] Rotas protegidas por perfil
- [x] Dashboard Implantador — layout + lista de máquinas + configuração de 10 fotos por máquina (ADR-009)
- [x] Dashboard Mecânico — fila de validações NOK + drawer comparativo + histórico (ADR-010)
- [ ] Dashboard Admin (backlog + dashboard + CRUD)

### Bot WhatsApp (fora do Lovable)
- [ ] Decisão: uazapi vs WhatsApp Cloud API
- [ ] Webhook Edge Function (`wa-webhook`)
- [ ] State machine do operador (seleção de máquina → 10 itens → foto → OK/NOK)
- [ ] Cron 05:30 (kickoff matinal)
- [ ] Supervisão passiva em grupo (RF-32)
- [ ] Relatórios sob demanda (RF-33)

### Testes e validação
- [ ] Teste end-to-end com operador real da AgroCotton
- [ ] Teste do mecânico validando fotos reais
- [ ] Teste do implantador cadastrando uma máquina do zero

---

## 🗺️ Próximos passos imediatos

1. **Construir tela do Implantador** (ADR-007)
   - É o primeiro usuário real do sistema
   - Sem ele, não há máquinas cadastradas nem fotos de referência
   - Sem isso, operador não tem o que inspecionar

2. **Construir tela do Mecânico**
   - Fila Realtime de fotos NOK
   - Validação (aprovar/reprovar + diagnóstico)

3. **Construir Admin** (backlog + dashboard)
   - Backlog + dashboard + CRUD

4. **Construir Bot WhatsApp** (fora do Lovable, em Edge Function)
   - Decidir provider antes
   - Espelhar invariantes do SDD (RF-31, RF-03, RF-13, RF-36)

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

- **RF-31** — sequência imutável de 10 itens do checklist, finalização "Vamo cavalo!"
- **RF-02/RF-13** — exibir APENAS o padrão correto. Nunca padrão incorreto.
- **RF-03** — foto nova obrigatória em OK e NOK. Câmera direta; galeria bloqueada.
- **RF-35** — contador de horas de lubrificação com alerta persistente.
- **RF-36** — recusa exige justificativa textual ≥ 20 chars, auditável.

---

## 📁 Arquivos relacionados

- `agrocotton_prompts_lovable_revisados.md` — prompts originais SDD revisados
- `AGROCOTTON_DECISIONS_LOG.md` — log de decisões arquiteturais (ADRs)
- `AGROCOTTON_STATUS.md` — este arquivo
