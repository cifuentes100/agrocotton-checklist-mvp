# AgroCotton Serviços — Log de Decisões Arquiteturais

> Cada decisão importante vira um **ADR (Architecture Decision Record)**. Nunca editar
> ADRs antigos — só adicionar novos que superseded eles. Isso preserva o histórico de
> raciocínio do projeto.
>
> **Formato:** ADR-NNN, data, contexto, decisão, consequências, status.

---

## ADR-001 — Usar Supabase como backend completo

**Data:** 2026-04-22
**Status:** ✅ Aceita e implementada

**Contexto:**
MVP precisa de banco de dados, armazenamento de fotos, autenticação e tempo real.
Alternativas consideradas: Firebase, AWS (DynamoDB + S3 + Cognito), backend próprio.

**Decisão:**
Supabase como plataforma única. Postgres + Storage + Auth + Realtime + Edge Functions
em um só lugar. Free tier suficiente para MVP.

**Consequências:**
- Menos integrações pra configurar
- Lock-in parcial no Supabase (mas usa Postgres puro, portável)
- Edge Functions em Deno (curva de aprendizado menor que Lambda)
- RLS (Row Level Security) obriga pensar em segurança desde o começo

---

## ADR-002 — Usar Lovable para gerar o web app

**Data:** 2026-04-22
**Status:** ✅ Aceita e implementada

**Contexto:**
Desenvolvedor principal (Patrícia) não é programadora. Precisa gerar código de produção
sem escrever manualmente.

**Decisão:**
Lovable gera o web app (React + TypeScript + Tailwind) via prompts. Integração nativa
com Supabase.

**Consequências:**
- Velocidade alta no front
- Dependência de créditos do Lovable
- Bot WhatsApp NÃO é feito no Lovable (não é o forte dele) → ver ADR-004
- Commits precisam ser reescritos manualmente para seguir convenção SDD

---

## ADR-003 — Provider de WhatsApp: DECISÃO PENDENTE

**Data:** 2026-04-23
**Status:** 🟡 Em aberto

**Contexto:**
Bot WhatsApp é o canal principal do operador. Duas opções principais:

| Critério | WhatsApp Cloud API (Meta) | uazapi |
|---|---|---|
| Custo | Grátis até 1000 conversas/mês | R$ 79/mês fixo |
| Setup | Meta Business verification (~2 semanas) | Minutos |
| Template messages | Obrigatórios para iniciar conversa | Não precisa |
| Bot passivo em grupo (RF-32) | **Não suporta** | **Suporta** |
| Produção real | Oficial | Não-oficial (risco de ban) |

**Decisão:**
Adiada. Recomendação atual: começar com uazapi por causa do RF-32 (bot passivo em
grupo que Cloud API não permite). Migrar para Cloud API depois.

**A decidir antes de construir o bot:**
- Confirmar se RF-32 (bot passivo em grupo) é crítico ou pode ser adiado
- Validar orçamento pros R$ 79/mês da uazapi
- Ou começar com Cloud API aceitando perder RF-32 no MVP

---

## ADR-004 — Bot WhatsApp construído FORA do Lovable

**Data:** 2026-04-23
**Status:** ✅ Aceita

**Contexto:**
O Prompt 7 original do SDD pedia pro Lovable construir o bot. Avaliação: Lovable não é
bom com cron jobs, webhooks assinados com HMAC, retries exponenciais e grupo como
membro passivo. É boa em front web.

**Decisão:**
Bot WhatsApp é desenvolvido separadamente em Edge Function Deno, usando Cursor/Claude
Code para gerar o código. Deploy via Supabase Functions.

**Consequências:**
- Patrícia vai precisar aprender minimamente a usar Claude Code ou contratar alguém
- Maior controle sobre o bot (código próprio)
- Setup mais complexo que "tudo no Lovable", mas resultado mais confiável

---

## ADR-005 — Eliminar app web do operador. WhatsApp é o ÚNICO canal dele.

**Data:** 2026-04-23
**Status:** ✅ Aceita

**Contexto:**
Os 7 prompts do SDD original tinham redundância: o Prompt 3 criava um "Web App do
Operador em /operador, estilo chat WhatsApp" com login por telefone via OTP, E o
Prompt 7 criava o bot WhatsApp fazendo o mesmo fluxo.

A ideia original da Patrícia já era clara:
> *"Quando o operador aciona o start do agente no whatsapp é iniciado o processo do
> check list."*

**Decisão:**
App web do operador é **eliminado**. O operador NÃO tem login. NÃO tem tela web. Vive
100% no WhatsApp. Bot o reconhece pelo número de telefone cadastrado na tabela
`users`.

**Consequências:**
- Menos código pro Lovable gerar → economia de créditos
- Sem custo de SMS/OTP para autenticação do operador
- Bot WhatsApp vira elemento crítico do MVP (sem ele, operador não consegue fazer
  checklist — não há "fallback web")
- Eliminado: rota `/operador`, tela de login por OTP, captura de foto via
  `<input capture>` web (vai pro WhatsApp nativo)
- Prompt 3 do SDD original → **descartado**

**Supersedes:** Prompt 3 do `agrocotton_prompts_lovable_revisados.md`

---

## ADR-006 — Autenticação email/senha para mecânico/admin/implantador

**Data:** 2026-04-23
**Status:** ✅ Aceita

**Contexto:**
Com o operador fora do web app (ADR-005), restaram 3 perfis técnicos no web:
mecânico, admin, implantador. Quantos usuários esperados: 5–10 pessoas no MVP.

Alternativas consideradas:
- SMS/OTP para os 3 perfis (caro, desnecessário, dificulta teste)
- Login simples por nome (sem senha — inseguro)
- Email + senha (simples, grátis, suficiente)

**Decisão:**
Autenticação por email + senha via Supabase Auth. Cadastro manual dos primeiros
usuários via SQL no Supabase (não precisa tela de signup pública — ninguém de fora
deve conseguir se cadastrar).

**Consequências:**
- Cada um desses perfis precisa de email válido
- Processo de cadastro de novos usuários fica sob responsabilidade do admin
- Sem "forgot password" no MVP inicial (adicionar depois se necessário)

---

## ADR-007 — Ordem de construção: Implantador antes de Mecânico e Admin

**Data:** 2026-04-23
**Status:** ✅ Aceita

**Contexto:**
O SDD original listava os prompts do Lovable em uma ordem que privilegiava o
operador. Com o ADR-005 (operador fora do web), a pergunta ficou: qual dos 3 perfis
restantes construímos primeiro?

**Decisão:**
Ordem de construção no Lovable:
1. Autenticação (pré-requisito de todos)
2. Implantador (cadastrar máquinas + fotos de referência)
3. Mecânico (validar fotos NOK)
4. Admin (backlog + dashboard)

**Raciocínio:**
- Implantador é o **primeiro usuário real** do sistema. Sem ele, não há máquinas
  nem fotos de referência.
- Sem máquinas cadastradas, operador não tem o que inspecionar → bot quebra.
- Sem fotos de referência, operador não tem padrão pra comparar → RF-02/RF-13
  quebram.
- Mecânico e admin só têm o que ver depois que existir dados produzidos pelo
  operador, então ficam depois. Enquanto não temos bot pronto, testamos com dados
  fake inseridos via SQL.

**Consequências:**
- Primeira entrega testável de ponta a ponta exige: Implantador pronto + bot
  pronto + pelo menos 1 operador cadastrado + pelo menos 1 máquina com 10 fotos
  de referência.

---

## ADR-008 — RLS: usuários autenticados leem o próprio registro em public.users

**Data:** 2026-04-23
**Status:** ✅ Aceita e implementada

**Contexto:**
Durante o primeiro teste de login, o AuthContext recebia "Usuário sem permissão"
mesmo com o usuário existindo em `auth.users` E em `public.users` com IDs batendo.
Causa: RLS estava habilitada em `public.users` mas não havia policy permitindo o
SELECT do próprio registro pelo usuário autenticado.

**Decisão:**
Criada policy `usuarios autenticados leem seu proprio registro` que permite SELECT
em public.users quando `auth.uid() = id`.

**Consequências:**
- Cada usuário lê apenas o próprio cadastro (exceto admins, que podem precisar de
  policy adicional no futuro para listar todos os usuários no painel admin)
- Esperar policies adicionais em CRUD de usuários do admin (a criar depois)

---

## ADR-009 — Fotos de referência são por máquina, não globais

**Data:** 2026-04-23
**Status:** ✅ Aceita e implementada

**Contexto:**
O schema original tinha `checklist_items.reference_correct_path` como coluna global.
Isso significava que a foto de referência era compartilhada entre todas as máquinas.
Bug identificado pelo Lovable durante o planejamento da tela do Implantador.

**Decisão:**
Nova tabela `machine_reference_photos(machine_id, item_id, path)` com PK composta.
Cada máquina tem suas próprias 10 fotos de referência. Coluna antiga marcada como
DEPRECATED (mantida pra não quebrar nada).

**Consequências:**
- Suporta RF-34 (variações técnicas por máquina)
- Máquinas diferentes podem ter padrões de referência diferentes
- Bot WhatsApp precisa consultar essa tabela pela combinação (machine_id, item_id)
- Implantador configura as 10 fotos específicas para cada máquina nova

---

## 📝 Template para próximas decisões

```
## ADR-NNN — Título curto e direto

**Data:** AAAA-MM-DD
**Status:** 🟡 Proposta | ✅ Aceita | ❌ Rejeitada | ⚠️ Superseded por ADR-XXX

**Contexto:**
Qual problema/pergunta estamos resolvendo? Quais alternativas foram consideradas?

**Decisão:**
O que foi decidido, em uma ou duas frases diretas.

**Consequências:**
- O que muda no código/processo
- Trade-offs aceitos
- O que fica pra depois

**Supersedes:** ADR-XXX (se aplicável)
```
