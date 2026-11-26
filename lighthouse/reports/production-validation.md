# Validação da publicação — 2026-11-26

- Demo: https://nft-marketplace-one-nu.vercel.app
- Código publicado: `790e32dc147354721d564e6efd2aa85c14b7a5d5` (árvore limpa no momento do deploy).
- Deploy Vercel: `dpl_ACThbQHVxkzJJmz3TiKVtzdtYEf2`, estado READY, alias de produção `nft-marketplace-one-nu.vercel.app`.
- O commit seguinte só altera o teste citado abaixo e estes relatórios; ele foi publicado de novo, então a demo corresponde ao último commit da `main`.
- Typecheck, lint (sem comentários) e build aprovados; 40 testes unitários aprovados.
- E2E local: 197 aprovados, 0 falhas, 29 ignorados por perfil (desktop 1440×900 e mobile 390×844).
- E2E contra a demo pública (`PLAYWRIGHT_BASE_URL=https://nft-marketplace-one-nu.vercel.app pnpm test:e2e`): 197 aprovados, 0 falhas, 29 ignorados. O teste de texto digitado antes de o app assumir esperava o evento `load`, que o carregador da produção adia; passou a esperar `domcontentloaded` e foi repetido contra a demo. Inclui snapshots, acessibilidade, compra simulada, idempotência, tempo real, isolamento de sessão, páginas de entrada pré-renderizadas e ferramentas WebMCP.
- Acesso direto e refresh: `/`, `/mercado`, `/nft/<id>`, `/nft/inexistente`, `/cart`, `/checkout`, `/profile`, `/profile/wallets`, `/favorites`, `/orders/<id>`, `/login`, `/signup` e rotas inexistentes respondem 200. Os arquivos para agentes têm o tipo certo: `/llms.txt` (`text/plain`), `/.well-known/ard.json` e `/.well-known/ai-catalog.json` (`application/json`), `/agent-skills/kurio-marketplace.md` (`text/markdown`).
- Geometria: 954/954 nós em 15 frames, tolerância de ±1 px; desvios intencionais justificados em `figma/geometry-exemptions.json`.

## Lighthouse em produção

Uma execução mobile por página (Lighthouse 13.6.0), medições de laboratório, com mocks ativos. O manifesto ARD também foi validado com o validador do Lighthouse 13.5, a versão do DevTools atual, que lê `/.well-known/ai-catalog.json`.

| Página | Performance | Acessibilidade | Boas práticas | SEO | Agentic Browsing | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|---|
| `/` | 100 | 100 | 100 | 100 | 4/4 | 1.06 s | 0.000 | 1 ms |
| `/nft/emerald-ape-042` | 100 | 100 | 100 | 100 | 4/4 | 1.06 s | 0.000 | 0 ms |
| `/profile` (abre a porta de login) | 100 | 100 | 100 | 100 | 4/4 | 1.21 s | 0.000 | 0 ms |
| `/cart` | 100 | 100 | 100 | 100 | 4/4 | 0.93 s | 0.000 | 0 ms |

Relatórios completos em `production/`; medianas de três execuções locais por página e perfil em `summary.md`.

A publicação é uma demonstração com backend, carteira e pagamentos simulados. Não valida transações financeiras reais.
