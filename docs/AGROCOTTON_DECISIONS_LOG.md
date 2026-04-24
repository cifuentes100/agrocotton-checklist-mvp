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

## ADR-010 — View `user_public_info` para proteger PII de usuários

**Data:** 2026-04-24
**Status:** ✅ Aceita e implementada

**Contexto:**
Dashboard do Mecânico precisa exibir o NOME do operador ao validar uma resposta.
A tabela `public.users` contém também o telefone (dado sensível, LGPD). RLS é por
linha, não por coluna — uma policy ampla de SELECT em `users` vazaria telefones
para todos os mecânicos e admins via cliente.

**Decisão:**
Criada view `public.user_public_info(id, name, role)` com `SECURITY DEFINER`
(`security_invoker = false`), exposta para `authenticated`/`anon`. A tabela raw
`public.users` mantém a policy restritiva (cada um só lê o próprio registro).
Toda query cross-role no front deve usar a view, nunca a tabela raw.

**Consequências:**
- Mecânico, admin e implantador conseguem ler nome de qualquer usuário, mas
  nunca telefone.
- Telefones só são acessíveis via service role (bot WhatsApp, edge functions)
  ou pelo próprio dono do registro.
- Joins do front passam a ser feitos contra `user_public_info`. Como views não
  carregam FK, a relação não é inferida pelo PostgREST — usa-se um segundo
  lookup `select id, name from user_public_info where id in (...)` indexado
  num `Map`.
- O linter Supabase reporta "Security Definer View" como ERROR — é
  intencional aqui (a definição inteira do ADR depende disso).

---

## ADR-011 — Inclusão do item "Cool Gard" como #1 do checklist

**Data:** 2026-04-24
**Status:** ✅ Aceita e implementada

**Contexto:**
A verificação de nível do **Cool Gard** (líquido de arrefecimento tratado do
motor — Cool-Gard II 50/50) é uma rotina crítica que estava omitida da lista
canônica de 10 itens. Identificada na revisão com Fernando e Márcio. Sem essa
verificação, há risco de superaquecimento do motor da colheitadeira.

**Decisão:**
- Cool Gard entra como item **#1** do checklist (`order_idx = 1`).
- Os 10 itens originais descem uma posição cada (#1→#2 ... #10→#11).
- Os `id` originais são preservados — apenas o `order_idx` muda. Isso mantém
  íntegros todos os históricos em `item_responses` (que referenciam `item_id`).
- A trigger `trg_checklist_items_immutable` (que normalmente bloqueia mudanças
  em `order_idx`) foi temporariamente desabilitada apenas durante a migration.
- Foto de referência inicial (colagem didática Cool-Gard II + reservatório na
  colheitadeira) propagada automaticamente para as 2 máquinas já cadastradas
  via edge function de uso único `seed-coolgard-photo` (já removida após uso).

**Consequências:**
- O checklist passa a ter **11 etapas**, não mais 10. Toda menção a "10 itens"
  precisa ser revisada (a UI já é dinâmica e não tem strings fixas).
- Próximo run de cada máquina começa pelo Cool Gard (garantido pela trigger
  `enforce_item_order` em `item_responses`).
- O implantador pode substituir a foto didática inicial por uma foto real
  específica de cada colheitadeira via UI existente ("Substituir foto").
- Os IDs ficam não-sequenciais com `order_idx`: o item id=11 fica em #1, o
  id=1 em #2, etc. Isso é intencional e não afeta nada.

---

## ADR-012 — Renomear item #2 para "Oleo do motor" (separação Cool Gard / óleo)

**Data:** 2026-04-24
**Status:** ✅ Aceita e implementada

**Contexto:**
Após a inclusão do **Cool Gard** como item #1 (ADR-011), o item #2 ainda se
chamava "Agua e oleo do motor" — texto herdado do checklist anterior, quando
água e óleo eram inspecionados juntos. Com o Cool Gard agora cobrindo o
líquido de arrefecimento de forma explícita, o item #2 passa a tratar
exclusivamente do óleo do motor, e o método de verificação correto é a
**vareta**.

**Decisão:**
- Item `id = 1` (`order_idx = 2`) renomeado para **"Oleo do motor"** com
  descrição **"Verificar nivel do oleo na vareta"**.
- `id` e `order_idx` preservados — apenas `name` e `description` mudam.
  Histórico em `item_responses` permanece íntegro.
- Trigger `trg_checklist_items_immutable` (que protege `order_idx`) não foi
  afetada — o nome/descrição não estão sob a trigger, mas ela foi disabled/
  enabled por precaução durante a migration.
- Foto de referência (colagem didática "ok / max" da vareta + localização do
  filtro de óleo na colheitadeira) propagada para as 2 máquinas existentes
  via edge function de uso único `seed-oleo-motor-photo` (já removida).

**Consequências:**
- O implantador pode substituir a foto didática inicial pela foto real do
  motor de cada máquina via UI ("Substituir foto").
- Operadores agora têm instrução clara: **inspecionar a vareta**, não tentar
  inferir o nível por outros meios.
- Nenhuma mudança em código frontend (UI consome `name`/`description`
  diretamente do banco).

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
