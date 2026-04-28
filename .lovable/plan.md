## Desativar usuário do bot (conceito reutilizável)

Você quer "desativar" a Esposa: zero interação com o bot, zero bom-dia, mas sem perder o registro nem dar permissão indevida. Vou tratar isso como um **conceito do sistema** — coluna `active` em `users` — e não como hack pontual pra ela.

## Mudança de schema

Migration adicionando à tabela `public.users`:

```sql
ALTER TABLE public.users ADD COLUMN active boolean NOT NULL DEFAULT true;
```

Backfill: todos existentes ficam `active=true`. Em seguida:

```sql
UPDATE public.users
   SET active = false, morning_enabled = false
 WHERE id = '803d40a8-e0b8-4ace-a3ac-8b41ea41c7d4';  -- Esposa
```

## Mudanças de código

**1. `src/lib/whatsapp-bot-logic.ts` — `handleBotMessage` (linha ~290):**
Adicionar `.eq("active", true)` na busca do operador. Usuário desativado cai no branch `if (!user)` e o bot fica em silêncio (já é o comportamento de hoje pra não cadastrado).

**2. `src/lib/whatsapp-bot-logic.ts` — `sendMorningMessages` (linha ~692):**
Adicionar `.eq("active", true)` na query de operadores que recebem bom-dia.

**3. Funções RPC do admin (`admin_list_users`, `admin_create_user`, `admin_update_user`):**
Migration redefine essas funções pra ler/escrever a coluna `active`. `admin_create_user` recebe novo parâmetro `_active boolean DEFAULT true`. `admin_update_user` recebe `_active boolean`. `admin_list_users` retorna `active` no SELECT.

**4. Tela `/admin/usuarios` (`src/routes/admin.usuarios.tsx`):**
- Tabela ganha coluna "Ativo" (badge verde/cinza)
- Form de edição/criação ganha switch "Ativo"
- Tipo TS gerado se atualiza sozinho após migration

## Resultado pra Esposa

Logo após a migration:
- Se ela mandar QUALQUER coisa no WhatsApp → bot não responde nada (cai no silêncio que implementamos antes)
- Bom-dia das 5:30 → não recebe
- Continua aparecendo na lista do admin com badge "Inativo" — você pode reativar com 1 clique no futuro

## Pontos a confirmar

- **Esposa tem run em andamento?** Já cancelamos as duas runs anteriores via SQL. Se sobrar alguma, o `.eq("active", true)` vai impedir ela de continuar — a run fica órfã `in_progress` no banco até alguém limpar. Vou verificar e cancelar se houver, na mesma migration.
- **RLS:** a coluna `active` não muda nenhuma policy (continua sendo o admin via RPC `SECURITY DEFINER` que faz tudo).

## Entregáveis

1. Migration: `ALTER TABLE users ADD COLUMN active`, `UPDATE` da Esposa, `CANCEL` de runs ativas dela, redefinição das 3 RPCs admin.
2. `whatsapp-bot-logic.ts`: 2 filtros `.eq("active", true)`.
3. `admin.usuarios.tsx`: coluna "Ativo" + switch no form.
