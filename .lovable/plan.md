## Plano

### 1. Cadastrar o Fernando como operador
Inserir novo registro em `public.users`:
- `name`: `Fernando`
- `phone`: `+5562999549759` (padrão com `+`, igual aos outros operadores)
- `role`: `operador`

### 2. Saudação personalizada para o Fernando
Em `src/lib/whatsapp-bot-logic.ts`, na função `handleBotMessage`, ajustar as duas mensagens de saudação para detectar se o operador é o Fernando (pelo telefone `+5562999549759`) e, nesse caso, trocar o texto:

- **Quando ele manda algo sem ter run ativa e sem o gatilho `tomatoma`** (mensagem "Olá, {nome}! 🤠 Para iniciar..."):
  → "Você por aqui patrãozinho? É o Fernando, vai querer testar o bot agora! 🤠 Manda *tomatoma* (em minúsculas) pra começar."

- **Quando ele manda `tomatoma` e a run nova é criada** (mensagem "Olá, {nome}! 👋 Iniciando checklist..."):
  → "Você por aqui patrãozinho? É o Fernando, vai querer testar o bot agora! 👋 Iniciando checklist da máquina *{serial}* ({model})."

Demais operadores continuam recebendo a saudação padrão.

### 3. Sem mudanças em schema
Apenas insert de dado em `users` + ajuste de texto no bot. Nenhuma migration de estrutura.

### Resultado
Fernando manda mensagem do `+55 62 9954-9759`, o bot reconhece como operador e responde com a saudação personalizada de "patrãozinho".
