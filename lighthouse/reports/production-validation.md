# Validação da publicação — 2026-11-26

- Demo: https://nft-marketplace-one-nu.vercel.app
- Código publicado: `568627ff5066de5a13b13a7730f218ed8c44a49b`.
- Deploy Vercel: `dpl_J5A3YVx2Q6QppyD1jnL4xFVV4uWc`, estado READY.
- Typecheck, lint e build aprovados; 38 testes unitários aprovados.
- E2E local e na demo pública: 148 aprovados e 22 ignorados por perfil em cada execução. Inclui snapshots, acessibilidade, compra simulada, idempotência, realtime e isolamento de sessão.
- Geometria: 954/954 nós em 15 frames, tolerância de ±1 px e exceções documentadas em `figma/geometry-exemptions.json`.

## Lighthouse em produção

Uma execução mobile por página; medições de laboratório, com mocks ativos.

| Página | Performance | Acessibilidade | Boas práticas | SEO | LCP |
|---|---|---|---|---|---|
| https://nft-marketplace-one-nu.vercel.app/ | 100 | 100 | 100 | 100 | 1.21 s |
| https://nft-marketplace-one-nu.vercel.app/nft/emerald-ape-042 | 100 | 100 | 100 | 100 | 1.21 s |

Relatórios completos em `production/`; medianas de três execuções locais por página e perfil em `summary.md`.

A publicação é uma demonstração com backend, carteira e pagamentos simulados. Não valida transações financeiras reais.
