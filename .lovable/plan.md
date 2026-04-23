# Criar documentação do projeto em /docs

## Escopo

Criar apenas dois arquivos markdown na pasta `/docs` na raiz do projeto. Nenhum código, dependência, rota ou tela é tocado.

## Arquivos a criar

1. **`docs/AGROCOTTON_STATUS.md`** — documento vivo de status do projeto AgroCotton Serviços, contendo:
   - Visão geral do MVP (checklist de colheitadeiras de algodão)
   - Fluxo principal (operador via WhatsApp → mecânico valida → admin)
   - Tabela de perfis e canais (operador, mecânico, admin, implantador)
   - Stack técnica
   - Checklist de progresso (infra, web app, bot WhatsApp, testes)
   - Próximos passos imediatos
   - Pontos de atenção pendentes
   - Invariantes SDD (RF-31, RF-02/RF-13, RF-03, RF-35, RF-36)

2. **`docs/AGROCOTTON_DECISIONS_LOG.md`** — log de ADRs (Architecture Decision Records):
   - ADR-001: Supabase como backend completo (aceita)
   - ADR-002: Lovable para o web app (aceita)
   - ADR-003: Provider WhatsApp (pendente: uazapi vs Cloud API)
   - ADR-004: Bot WhatsApp fora do Lovable (aceita)
   - ADR-005: Eliminar app web do operador (aceita)
   - ADR-006: Email/senha para mecânico/admin/implantador (aceita)
   - ADR-007: Ordem de construção — Implantador primeiro (aceita)
   - Template para próximas decisões

## O que NÃO será feito

- Sem alterações em `src/`, `package.json`, `supabase/`, rotas ou componentes.
- Sem instalação de dependências.
- Sem criação de telas ou lógica.
- O conteúdo dos dois arquivos será exatamente o fornecido pelo usuário, sem modificações.
