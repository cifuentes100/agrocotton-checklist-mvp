## Objetivo

Conectar o domínio `agrocotton.com.br` (e `www.agrocotton.com.br`) ao projeto publicado, para que o site e o webhook da uazapi usem a URL pública oficial.

## Estado atual (verificado)

- Projeto **publicado** e visibilidade **public**: ✅
- Published URL atual: `https://agrocheck-hub.lovable.app`
- Custom domain configurado: **nenhum**
- Secrets `SB_URL` e `SB_SERVICE_ROLE_KEY`: já adicionadas
- Meta `noindex, nofollow` já no `__root.tsx`

## Importante: conexão de domínio é feita pela UI do Lovable

A conexão de domínio **não é feita por código** — é configurada na interface do Lovable, em **Project Settings → Domains**. Não tenho ferramenta para fazer isso por você; quem precisa clicar é você. Este plano descreve exatamente o que fazer e o que fica do meu lado depois.

## Passo a passo (você executa na UI)

### 1. Abrir Domains
- Desktop: clique no nome do projeto (canto superior esquerdo) → **Settings** → aba **Domains**
- Mobile: botão **…** (canto inferior direito) → **Settings** → aba **Domains**

### 2. Conectar o domínio raiz
- Clique em **Connect Domain**
- Digite: `agrocotton.com.br`
- Lovable vai mostrar os registros DNS necessários

### 3. Conectar o www como entrada separada
- Clique em **Connect Domain** de novo
- Digite: `www.agrocotton.com.br`
- (o `www` **não** é adicionado automaticamente — precisa entrar como segunda entrada)

### 4. Configurar DNS no registrador (onde o domínio foi comprado: Registro.br, GoDaddy, etc.)

Adicionar exatamente o que o Lovable mostrar. Os valores padrão são:

| Tipo | Nome | Valor |
|---|---|---|
| A | `@` (raiz) | `185.158.133.1` |
| A | `www` | `185.158.133.1` |
| TXT | `_lovable` | (valor `lovable_verify=...` que aparece na tela) |

**Atenção:**
- Remover quaisquer registros A/AAAA/CNAME antigos para `@` e `www` que apontem para outros lugares
- Se usa Cloudflare ou outro proxy: marcar **"Domain uses Cloudflare or a similar proxy"** na seção Advanced antes de salvar (muda pra setup via CNAME)

### 5. Aguardar verificação
- Status passa por: **Verifying** → **Setting up** → **Active**
- Pode levar de minutos até 72h (geralmente <1h no Registro.br)
- SSL é provisionado automaticamente

### 6. Definir domínio principal
- Quando ambos ficarem **Active**, marcar `agrocotton.com.br` como **Primary**
- O `www` redireciona automaticamente para o principal

## O que eu (Lovable) faço depois que ficar Active

Quando você me avisar que o domínio está **Active**, eu vou:

1. **Atualizar a documentação interna** (`docs/AGROCOTTON_STATUS.md`, `.lovable/plan.md`) com a nova URL oficial
2. **Confirmar a URL do webhook da uazapi** que você precisa colar no painel deles:
   ```
   https://agrocotton.com.br/api/public/whatsapp/webhook
   ```
3. **Verificar** que `noindex` e proteção de login continuam funcionando no domínio novo
4. **Testar** o endpoint público de diagnóstico (`/api/public/diag/env`) para confirmar que as secrets `SB_URL`/`SB_SERVICE_ROLE_KEY` carregam no domínio novo

## O que NÃO precisa mudar no código

- `src/integrations/supabase/client.ts` continua usando o Supabase project URL (não muda)
- Webhook handler (`api.public.whatsapp.webhook.ts`) já é agnóstico de domínio — funciona em qualquer host
- `noindex` no `__root.tsx` herda em todas as rotas, inclusive no domínio novo

## Resumo do que você precisa fazer agora

1. Abrir **Settings → Domains** no Lovable
2. Conectar `agrocotton.com.br` e `www.agrocotton.com.br` (duas entradas)
3. Copiar os registros DNS que aparecerem e colar no seu registrador
4. Me avisar quando o status virar **Active** para eu atualizar a URL do webhook
