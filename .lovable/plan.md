## Trocar gatilho `tomatoma` → `okok`

Substituir a palavra-chave que inicia o checklist no bot WhatsApp, de `tomatoma` para `okok`. Aplicado tanto na lógica de detecção quanto em todas as mensagens de instrução enviadas ao operador.

## Arquivos alterados

**`src/lib/whatsapp-bot-logic.ts`** (8 ocorrências):

1. **Linha 320** — mensagem após cancelamento: `Manda *tomatoma*` → `Manda *okok*`
2. **Linha 357** — comentário: "tomatoma" → "okok"
3. **Linha 361** — comparação de reset: `=== "tomatoma"` → `=== "okok"`
4. **Linha 378** — comentário: gatilho "tomatoma" → "okok"
5. **Linha 380** — comentário: só `tomatoma` → só `okok`
6. **Linha 382** — comparação do gatilho: `inbound.text === "tomatoma"` → `inbound.text === "okok"`
7. **Linhas 387–390** — três mensagens de boas-vindas/instrução (Fernando, Mulé, default): trocar `*tomatoma*` por `*okok*`
8. **Linha 395** — comentário: caminho do `tomatoma` → `okok`
9. **Linha 732** — mensagem de bom-dia: `Manda *tomatoma*` → `Manda *okok*`

## Comportamento resultante

- Operador manda `okok` (lowercase exato) → bot inicia checklist
- Operador manda `okok` durante run ativa → bot reseta e abre nova run
- Mensagens de cancelamento, bom-dia e boas-vindas instruem `okok`
- Qualquer outra coisa (incluindo `tomatoma`) → bot pede `okok` ou ignora conforme regras atuais

## Pontos a observar

- `okok` é curto e pode colidir com respostas de item (operador responde `ok` para itens conformes). A comparação é **exata e lowercase**, então `ok` sozinho não dispara, e `okok` só é interpretado como gatilho **fora** de uma pergunta ativa (ou como reset). Sem risco de conflito com fluxo de respostas.
- Nenhuma migration ou mudança de schema necessária.
