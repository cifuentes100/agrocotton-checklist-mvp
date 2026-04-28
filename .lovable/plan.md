## Diagnóstico

Encontrei **dois problemas** olhando os logs do `whatsapp_messages`:

### 1. Telefone errado no banco
O WhatsApp da sua esposa envia do número **`555591299413`** (DDI 55 + DDD 55 + `91299413` — 8 dígitos, **sem o nono dígito** de celular).

Eu havia cadastrado como `+5555991299413` (com o 9 extra). Por isso o bot não a reconhece e responde *"Seu número não está cadastrado como operador"*.

### 2. WHAPI atingiu o limite do plano trial
Mesmo com o cadastro corrigido, **todas** as respostas do bot pra ela estão falhando com:
```
402: trial version limit exceeded
```
A conta whapi.cloud passou do limite gratuito. Enquanto isso não for resolvido, ela não vai receber **nenhuma** mensagem do bot — independente do cadastro.

---

## Plano

### 1. Corrigir o telefone no banco
Migration:
```sql
UPDATE public.users 
SET phone = '+555591299413' 
WHERE name = 'Esposa';
```

### 2. Atualizar a verificação no código do bot
Em `src/lib/whatsapp-bot-logic.ts`, trocar:
```ts
const isEsposa = phoneWithPlus === "+5555991299413";
```
por:
```ts
const isEsposa = phoneWithPlus === "+555591299413";
```
(duas ocorrências)

### 3. Ação manual sua (fora do código)
**Fazer upgrade do plano whapi.cloud** ou trocar o token (`WHAPI_TOKEN`) por uma conta com cota disponível. Sem isso, o bot continua não respondendo pra ninguém de fora dos números já testados hoje.

---

## Resultado esperado
Após a migration + ajuste no código + upgrade whapi: ela manda `tomatoma` e recebe a saudação *"Você por aqui Mulé? 💛"*.
