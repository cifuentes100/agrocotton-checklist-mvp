## Objetivo
Fazer com que a palavra `tomatoma` **sempre force o reinício** do checklist do operador — ignorando o cooldown de 12h e cancelando qualquer run em andamento. Isso destrava a demo (e qualquer teste) sem precisar mexer no banco entre uma rodada e outra.

## Comportamento atual vs. novo

| Situação ao receber `tomatoma` | Hoje | Depois |
|---|---|---|
| Sem run + sem checklist nas últimas 12h | Inicia novo ✅ | Inicia novo ✅ |
| Sem run + checklist concluído há < 12h | **Bloqueia** com "checklist de hoje já foi feito" ❌ | **Inicia novo** ✅ |
| Com run em andamento | Cancela a anterior e inicia nova ✅ | Cancela a anterior e inicia nova ✅ |
| Qualquer outra mensagem (texto/foto que não seja `tomatoma`) sem run ativa | Pede pra mandar `tomatoma` | **Igual** (cooldown continua valendo se a pessoa não mandar o gatilho) |

Resumindo em linguagem simples: **`tomatoma` vira o "botão de reset"**. Se o operador escrever isso, o sistema sempre começa do zero — não importa se ele acabou de terminar um.

## O que muda no código

Arquivo único: `src/lib/whatsapp-bot-logic.ts`, função `handleBotMessage`.

Pequena mudança no bloco "4. Sem run ativa":
- Hoje, depois de validar o gatilho `tomatoma`, o código consulta `checklist_runs` das últimas 12h e bloqueia se achar uma `completed`.
- Vamos **remover essa checagem do caminho do `tomatoma`**. O cooldown de 12h continua existindo de fato (ele já é aplicado naturalmente: o operador só recebe a mensagem automática "bom dia" 1x por dia), mas o gatilho manual `tomatoma` passa por cima.

Nada de migration, nada de mudança de schema, nada de mexer em outros perfis.

## Riscos

- Operadores reais poderiam, em tese, refazer o checklist múltiplas vezes no mesmo dia se descobrirem o `tomatoma`. Como o gatilho já é conhecido (é o único jeito de iniciar), e o histórico fica todo registrado em `checklist_runs`, isso não corrompe dado — só gera mais runs. Aceitável pro estágio de MVP/demo.

## Validação pós-mudança

Manda 3x `tomatoma` em sequência do operador demo:
1. Primeira → inicia checklist
2. Completa o fluxo
3. Manda `tomatoma` de novo → deve iniciar **outro** checklist imediatamente, sem aparecer "checklist de hoje já foi concluído"