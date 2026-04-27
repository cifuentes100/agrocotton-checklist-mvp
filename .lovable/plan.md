## Objetivo

Garantir que o site fique seguro para produção em `agrocotton.com.br`:
1. Manter a capa atual (`/` mostra "AgroCotton" + botão **Entrar**)
2. Bloquear o Google e qualquer outro buscador de indexar o site
3. Confirmar que toda área interna já está protegida por login

## Diagnóstico (já verificado)

A proteção de acesso **já está completa** no código:

| Camada | Status |
|---|---|
| `AuthProvider` envolve todo o app em `__root.tsx` | OK |
| `ProtectedRoute` protege `/admin`, `/mecanico`, `/implantador` | OK |
| Tela `/login` com Supabase Auth funcional | OK |
| Sem login → redireciona pra `/login` | OK |
| Role inválida → desloga automaticamente | OK |
| RLS ativo nas tabelas | OK |
| `service_role_key` só em edge functions, nunca no browser | OK |

**Conclusão:** não precisa adicionar gate de senha extra. O login Supabase + RLS já é a "senha de produção".

## Mudança única necessária

Adicionar `<meta name="robots" content="noindex, nofollow" />` no `head()` do root route (`src/routes/__root.tsx`) para:
- Impedir que Google/Bing indexem `agrocotton.com.br`
- Impedir que apareça em pesquisas
- Impedir que crawlers sigam links internos

Como é uma ferramenta interna (apenas equipe cadastrada), faz sentido não estar em buscadores.

## Detalhes técnicos

**Arquivo:** `src/routes/__root.tsx`

Adicionar dentro do array `meta` do `head()`:

```tsx
{ name: "robots", content: "noindex, nofollow" },
{ name: "googlebot", content: "noindex, nofollow" },
```

Por estar no root route, herda automaticamente em todas as rotas filhas.

## O que NÃO vou fazer

- Não vou adicionar tela de "senha única" antes do login (desnecessário, login Supabase já protege)
- Não vou mudar visibilidade do Lovable para Private (você quer que a equipe acesse pelo domínio sem precisar de conta Lovable)
- Não vou mexer em `ProtectedRoute`, `AuthContext`, `/login` ou RLS (já está correto)
- Não vou redirecionar `/` automaticamente pra `/login` (você escolheu manter a capa)

## Próximos passos depois deste plano

1. Aplicar o `noindex` (1 edição)
2. Você clica em **Publish**
3. Conectamos o domínio `agrocotton.com.br` em Settings → Domains
4. Voltamos pra finalizar o webhook do bot uazapi com a URL nova
