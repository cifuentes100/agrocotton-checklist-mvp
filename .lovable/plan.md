## Mudança vs plano anterior

Você não vai gerar o `WEBHOOK_SECRET` agora. Eu coloco um **valor aleatório fixo** no código como secret temporário, com:

- Comentário `// TODO: SUBSTITUIR POR SECRET PRÓPRIO EM PRODUÇÃO` bem visível no código
- Nota explícita no **ADR-018** dizendo que o secret é provisório e foi gerado pela IA
- Dívida técnica registrada no `AGROCOTTON_STATUS.md` (seção "Pendências")

O secret temporário será adicionado como secret oficial no Lovable Cloud (`WEBHOOK_SECRET`) — ou seja, ele NÃO fica hardcoded no código-fonte, fica no cofre de secrets do projeto. Só a "origem" do valor é provisória.

**Valor que vou usar (gere você quando quiser trocar):**

```text
wh_temp_2026_a7f3e9c2b8d4516e0f9a3c7b2d8e4f6a9c1b3d5e7f8a0b2c4d6e8f0a1b3c5d7e
```

(64 chars, prefixo `wh_temp_` pra ficar óbvio que é temporário em qualquer log que vazar)

## O resto do plano segue idêntico

Todo o resto (reescrita do webhook, ADR-018, idempotência, suporte a grupo, msg não-texto, atualização de `diag/env`) continua exatamente como aprovado antes. A única diferença é a origem do `WEBHOOK_SECRET`.

## Ordem de execução depois da sua aprovação

1. **Eu** adiciono `WHAPI_TOKEN` (`AhQsKL3V1PI4RgMD6LohXCvH9U9ih8i4`, do painel whapi que você já mostrou) e `WEBHOOK_SECRET` (valor temporário acima) como secrets do Lovable Cloud
2. **Eu** reescrevo: webhook, diag/env, ADR-018, STATUS, plan.md (5 arquivos)
3. **Você** publica o projeto pelo botão Publish do Lovable
4. **Você (ou Cowork)** configura o webhook na whapi.cloud — passos detalhados abaixo
5. **Você** manda mensagem teste do seu WhatsApp pessoal pro número do canal — deve receber o eco

## Passos pra configurar no painel da whapi.cloud (passo 4)

Abra https://panel.whapi.cloud → entra no canal **DEADPL-Y5ZLU** (o do número +55 61 99814-6922).

### A) Setar a URL do webhook

Vai em **Settings → Webhooks** (ou "Channel settings → Webhooks", depende da versão do painel).

| Campo | Valor |
|---|---|
| **URL** | `https://agrocheck-hub.lovable.app/api/public/whatsapp/webhook` |
| **Mode** | `method: POST` (não use GET) |
| **Events** | marcar só `messages` (mensagens recebidas). Pode marcar `statuses` depois se quiser tracking de entrega |

### B) Adicionar o header de autenticação

Mesma tela de webhooks, geralmente tem uma seção **"Headers"** ou **"Custom headers"**. Adicione:

| Header name | Header value |
|---|---|
| `Authorization` | `Bearer wh_temp_2026_a7f3e9c2b8d4516e0f9a3c7b2d8e4f6a9c1b3d5e7f8a0b2c4d6e8f0a1b3c5d7e` |

⚠️ Cuidado com a palavra `Bearer ` (com espaço depois) — sem ela o webhook responde 401.

### C) Filtros recomendados (opcional mas útil)

- **Exclude messages from me**: ativar (evita o bot responder mensagens que ele mesmo enviou)
- **Exclude status updates**: deixar como quiser (não usamos statuses por enquanto)

### D) Salvar e testar

1. Clica em **Save** no painel
2. Tem um botão **"Test webhook"** ou **"Send test"** em alguns painéis — clica pra mandar um POST de teste e ver se chega resposta `200 OK`
3. Se voltar **401** → o header `Authorization` está errado (digitação ou faltou o `Bearer `)
4. Se voltar **500 ou timeout** → o site não foi publicado ainda OU os secrets não foram salvos
5. Se voltar **200** → manda mensagem real do seu celular pro número do canal e espera o eco

### E) Quando quiser trocar o secret temporário (no futuro)

1. Gera string nova: vai em https://generate-secret.vercel.app/64 e copia
2. No Lovable: **Project Settings → Cloud → Secrets** → edita `WEBHOOK_SECRET` com o valor novo
3. Republish o projeto
4. Volta no painel da whapi → atualiza o header `Authorization` com o novo `Bearer <valor novo>`
5. Salva e manda uma mensagem teste

## Confirmação pedida

- ☐ OK eu adicionar `WHAPI_TOKEN` e `WEBHOOK_SECRET` (com o valor temporário acima) como secrets do Lovable Cloud?
