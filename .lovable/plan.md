## Diagnóstico

**1. Cron das 5:30 nunca disparou — extensões `pg_cron` e `pg_net` não estão habilitadas.**
Confirmei em `pg_extension`: vazio. A rota `/api/public/morning-trigger` existe e funciona, mas ninguém a chama. Logs `whatsapp_messages` das últimas 24h não tem nenhum outbound matinal — só conversas iniciadas manualmente.

**2. Não existe tela de cadastro de usuários.** Tabela `public.users` tem RLS bloqueando INSERT/UPDATE/DELETE. Vou usar RPCs SECURITY DEFINER pro admin.

---

## Plano

### Parte A — Disparo automático com horário **por usuário**

1. **Migration schema**:
   - Adicionar coluna `morning_time time NOT NULL DEFAULT '05:30'` em `public.users` (horário local Brasília).
   - Adicionar coluna `morning_enabled boolean NOT NULL DEFAULT true` (pra desligar individualmente sem apagar).
2. **Habilitar `pg_cron` + `pg_net`**.
3. **Estratégia de agendamento**: como cada operador pode ter horário diferente, **não vou criar um job por usuário**. Vou criar **um job a cada minuto** que chama a rota `/api/public/morning-trigger`. A rota passa a:
   - Calcular hora atual em America/Sao_Paulo (HH:MM).
   - Selecionar operadores onde `morning_enabled=true AND morning_time = HH:MM:00`.
   - Enviar bom-dia só pra esses.
   - Anti-duplicata: gravar em tabela nova `morning_dispatches(user_id, dispatched_on date, dispatched_at timestamptz)` com unique `(user_id, dispatched_on)` pra evitar disparo duplo se o cron rodar 2x no mesmo minuto.
4. **Botão "Disparar bom-dia agora"** no admin: server function `triggerMorningNow` que valida `current_role()='admin'` e força envio pra todos operadores (ignora horário e anti-duplicata).

### Parte B — Tela de cadastro de usuários (`/admin/usuarios`)

1. **RPCs SECURITY DEFINER** (validam `current_role()='admin'`):
   - `admin_list_users()` → retorna todos.
   - `admin_create_user(_name, _phone, _role, _morning_time, _morning_enabled)`.
   - `admin_update_user(_id, _name, _phone, _role, _morning_time, _morning_enabled)`.
   - `admin_delete_user(_id)` — bloqueia auto-delete.
   - Normalizam phone (`+` na frente, só dígitos), validam role ∈ {operador, mecanico, implantador, admin}.
2. **Rota `src/routes/admin.usuarios.tsx`**:
   - Tabela: nome, telefone, role, **horário do bom-dia**, **ativo (toggle)**, ações.
   - Botão "Novo usuário" → dialog com form: name, phone, role (Select), **morning_time (input type="time", default 05:30)**, **morning_enabled (Switch)**.
   - Editar inline ou via dialog.
   - Botão "Disparar bom-dia agora" no topo.
   - Guarded por admin.
3. **Link no menu** `src/routes/admin.tsx`.

---

## Detalhes técnicos

**Migration schema** (via migration tool):
```sql
ALTER TABLE public.users
  ADD COLUMN morning_time time NOT NULL DEFAULT '05:30',
  ADD COLUMN morning_enabled boolean NOT NULL DEFAULT true;

CREATE TABLE public.morning_dispatches (
  user_id uuid NOT NULL,
  dispatched_on date NOT NULL,
  dispatched_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, dispatched_on)
);
ALTER TABLE public.morning_dispatches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin le dispatches" ON public.morning_dispatches FOR SELECT
  TO authenticated USING (public.current_role()='admin');
```

**Migration cron** (via insert tool, contém token):
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'morning-checklist-trigger',
  '* * * * *',  -- a cada minuto; rota filtra pelo horário do usuário
  $$
  SELECT net.http_post(
    url := 'https://agrocheck-hub.lovable.app/api/public/morning-trigger?token=<WEBHOOK_SECRET>',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
```

**Mudança em `sendMorningMessages`** (`src/lib/whatsapp-bot-logic.ts`):
- Aceita parâmetro opcional `{ force?: boolean }`.
- Se `force=false` (cron): query `users` com `role='operador' AND morning_enabled=true AND morning_time = (now() AT TIME ZONE 'America/Sao_Paulo')::time(0)` truncado pro minuto; antes de enviar, tenta `INSERT` em `morning_dispatches` — se conflitar, pula.
- Se `force=true` (botão admin): envia pra todos operadores.

---

## Resultado esperado

- Cada operador tem seu próprio horário de bom-dia configurável pelo admin.
- Esposa pode receber 05:30, outro operador às 06:00, etc.
- Admin tem `/admin/usuarios` com CRUD completo + horário + toggle on/off.
- Botão "disparar agora" pra testes.
- Anti-duplicata: ninguém recebe 2x no mesmo dia.

Aprova?