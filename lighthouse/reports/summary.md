# Lighthouse — medians (3 runs per page and profile)

Gerado em 2026-11-26T21:40:46.652Z por `pnpm lighthouse` (build otimizado servido por `vite preview`, cenário de mocks `default`).

Código auditado: o mesmo do commit `790e32dc147354721d564e6efd2aa85c14b7a5d5` (build gerado antes do commit, a partir dessas alterações).

| Page | Profile | Performance | Accessibility | Best Practices | SEO | Agentic Browsing | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|---|---|
| / | mobile | 100 | 100 | 100 | 100 | 4/4 | 1.73 s | 0.000 | 0 ms |
| /mercado | mobile | 100 | 100 | 100 | 100 | 4/4 | 1.58 s | 0.000 | 0 ms |
| /nft/emerald-ape-042 | mobile | 100 | 100 | 100 | 100 | 4/4 | 1.66 s | 0.000 | 0 ms |
| /login | mobile | 100 | 100 | 100 | 100 | 4/4 | 1.73 s | 0.000 | 0 ms |
| /profile | mobile | 100 | 100 | 100 | 100 | 4/4 | 1.73 s | 0.000 | 0 ms |
| /cart | mobile | 100 | 100 | 100 | 100 | 4/4 | 0.91 s | 0.000 | 0 ms |
| / | desktop | 100 | 97 | 100 | 100 | 4/4 | 0.41 s | 0.000 | 0 ms |
| /mercado | desktop | 100 | 97 | 100 | 100 | 4/4 | 0.37 s | 0.000 | 0 ms |
| /nft/emerald-ape-042 | desktop | 100 | 100 | 100 | 100 | 4/4 | 0.40 s | 0.000 | 0 ms |
| /login | desktop | 100 | 96 | 100 | 100 | 4/4 | 0.41 s | 0.000 | 0 ms |
| /profile | desktop | 100 | 96 | 100 | 100 | 4/4 | 0.40 s | 0.000 | 0 ms |
| /cart | desktop | 100 | 100 | 100 | 100 | 4/4 | 0.37 s | 0.000 | 0 ms |

## Environment

- Lighthouse 13.6.0 (via @lhci/cli), Chrome 158.0.0.0
- Node v26.8.2, Darwin 27.0.0 arm64, Apple M5
- Perfil mobile: emulação padrão do Lighthouse (Moto G Power, 4G lento simulado, CPU 4x). Perfil desktop: preset `desktop`.
- Relatórios HTML/JSON de cada execução: `lighthouse/reports/<perfil>/`.
- Agentic Browsing conta só as auditorias aplicáveis; as de WebMCP aparecem como "não se aplica" quando o Chrome não expõe `navigator.modelContext` (as ferramentas são cobertas por `tests/e2e/agentic.spec.ts`).
