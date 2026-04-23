# AgroCotton Serviços — Tela inicial + Cliente Supabase

## Escopo

Criar apenas a base visual do projeto e a configuração do cliente Supabase. Sem rotas adicionais, sem autenticação, sem telas de papéis (operador/mecânico/admin/implantador), sem tabelas ou migrations.

## O que será feito

### 1. Tela inicial (rota `/`)

- Fundo escuro sólido `#0f172a` ocupando a tela inteira.
- Logo textual **"AgroCotton"** centralizado, em verde `#25D366`, tipografia grande e com peso forte (estilo wordmark).
- Subtítulo logo abaixo: *"Sistema de checklist para colheitadeiras de algodão — MVP em construção"*, em cinza claro, centralizado, com largura máxima confortável para leitura.
- Layout vertical centralizado (vertical e horizontal), responsivo em mobile e desktop.
- Substitui completamente o placeholder atual de `src/routes/index.tsx`.
- Atualiza o `<title>` e a meta `description` no `__root.tsx` para refletir "AgroCotton Serviços".

### 2. Cliente Supabase

- Cria `src/lib/supabase.ts` exportando uma instância única de `createClient` do `@supabase/supabase-js`.
- Lê as variáveis de ambiente:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- Validação simples: se alguma variável estiver ausente, lança erro claro em desenvolvimento para facilitar diagnóstico.
- Nenhuma chamada ao Supabase é feita na tela inicial — apenas o cliente fica disponível para uso futuro.

### 3. O que NÃO será feito (por pedido do usuário)

- Sem novas rotas (sem `/login`, `/operador`, `/mecanico`, `/admin`, etc.).
- Sem autenticação.
- Sem componentes de checklist.
- Sem criação de tabelas, schemas ou migrations no Supabase.

## Detalhes técnicos

- Stack do template: TanStack Start + React 19 + TypeScript + Tailwind v4 (já configurado). Observação: o template usa React 19, não 18 — mantemos a versão do template para evitar quebrar o build; isso não afeta o resultado visual nem o uso do Supabase.
- Dependência nova: `@supabase/supabase-js`.
- Arquivos tocados:
  - `src/routes/index.tsx` — substitui placeholder pela tela inicial.
  - `src/routes/__root.tsx` — atualiza meta tags (título/descrição).
  - `src/lib/supabase.ts` — novo arquivo com o cliente.
- Cores aplicadas inline (estilo direto), sem alterar o design system global em `src/styles.css`, já que é apenas uma tela de boas-vindas temporária do MVP.
