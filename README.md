# Kurio — Marketplace de NFTs

Implementação do desafio frontend "NFT Marketplace" em React + TypeScript. Toda a API (REST e Socket.IO) é simulada na camada de rede com MSW, inclusive no build publicado.

- **Demo pública:** https://nft-marketplace-one-nu.vercel.app (mocks e tempo real ativos; use `ana@kurio.test` / `Kurio#2026`)
- **Repositório:** https://github.com/uaivieira/kurio-nft-marketplace
- Arquitetura, contratos e decisões: [ARCHITECTURE.md](./ARCHITECTURE.md)
- Resultados do Lighthouse: [lighthouse/reports/summary.md](./lighthouse/reports/summary.md)

## Stack

React 19, TypeScript, Vite, TanStack Router (rotas por arquivo), TanStack Query, Axios, Socket.IO (`socket.io-client`), Tailwind CSS v4, shadcn/ui (Radix), MSW 2 + `@mswjs/socket.io-binding`, Zod, React Hook Form, Playwright, Lighthouse CI e Vitest (aritmética de ETH e deduplicação de eventos).

## Requisitos

- Node.js 22 ou mais recente
- pnpm 12.10.1 (fixado em `packageManager`; `corepack enable`)

## Setup

```bash
pnpm install
pnpm exec playwright install chromium   # só para os testes E2E
pnpm dev                                # http://127.0.0.1:5173
```

O projeto roda a partir de um checkout limpo, sem serviços externos.

## Variáveis de ambiente

Definidas em `.env` (versionado, sem segredos). `.env.example` tem os mesmos valores.

| Variável | Padrão | Uso |
|---|---|---|
| `VITE_ENABLE_MOCKS` | `true` | Liga o backend simulado (MSW). Fica ligado também no build de demonstração. |
| `VITE_HTTP_TIMEOUT_MS` | `10000` | Timeout do Axios. A suíte E2E usa `4000` para exercitar o cenário de timeout rápido. |

## Credenciais fictícias

| Usuário | E-mail | Senha | Observação |
|---|---|---|---|
| Ana Souza | `ana@kurio.test` | `Kurio#2026` | Tem carteira principal (MetaMask) e secundária (Coinbase): pronta para comprar. |
| Bruno Lima | `bruno@kurio.test` | `Kurio#2026` | Sem carteiras: use para testar o cadastro de carteiras. |

As senhas ficam no banco simulado apenas como hash PBKDF2-SHA256 com salt (WebCrypto). Novos cadastros funcionam normalmente.

Cupons: `KURIO10` (10% de desconto), `EXPIRED5` (expirado). Qualquer outro código é inválido.

NFTs com casos de borda: `onyx-relic-404` (todas as edições esgotadas), `lunar-echo-027` (edição 1/50 com só 2 unidades), `/nft/nao-existe` (inexistente).

## Comandos

| Comando | O que faz |
|---|---|
| `pnpm dev` | Desenvolvimento com mocks |
| `pnpm build` | Verificação de tipos + build otimizado em `dist/` (com mocks) + pré-renderização do início, do Mercado e das páginas de NFT (`dist/index.html`, `dist/mercado.html`, `dist/nft/<id>.html`) |
| `pnpm preview` | Serve o build em http://127.0.0.1:4173 |
| `pnpm typecheck` | `tsc -b` em app, testes e configs |
| `pnpm lint` | oxlint |
| `pnpm test:unit` | Vitest (aritmética de ETH, ledger de eventos, redirecionamento seguro, rascunho do checkout entre usuários, cabeçalhos de segurança do `vercel.json`) |
| `pnpm test:e2e` | Playwright em Chromium desktop (1440×900) e mobile (390×844), contra um build de produção |
| `pnpm test:e2e:update` | Regera as baselines de regressão visual |
| `pnpm test:e2e:report` | Abre o relatório HTML (`playwright-report/`). Traces de falhas ficam em `test-results/` |
| `pnpm lighthouse` | Auditoria Lighthouse (rode `pnpm build` antes): 3 execuções por página e perfil, relatórios em `lighthouse/reports/` |
| `pnpm assets` | Regera as imagens AVIF/WebP em `public/nft/` a partir de `assets-src/` |
| `pnpm figma:compare [filtro]` | Compara cada tela com o PNG do frame do Figma (rode `pnpm build` antes). Relatório e diffs em `figma/report/` |

## Cenários simulados

Escolha o cenário de três formas, e ele persiste após recarregar a página:

1. Na URL: `http://127.0.0.1:5173/?scenario=order-timeout`
2. No painel de cenários: botão com ícone de chave inglesa no canto direito da tela
3. No console: `window.__kurio.setScenario('order-timeout')`

**Reset:** o botão "Restaurar dados do cenário" no painel (ou `await window.__kurio.reset()`) restaura integralmente o banco simulado: catálogo, usuários, carrinhos, favoritos, carteiras, pedidos e sessões. Para voltar também ao cenário padrão, selecione `default`.

| Cenário | Efeito |
|---|---|
| `default` | Sucesso, latência fixa de 20 ms |
| `empty-catalog` | Catálogo sem resultados |
| `slow` | Toda resposta demora 2,5 s (skeletons) |
| `jitter` | Latência de 80 ms a 1,8 s em sequência reproduzível (respostas fora de ordem) |
| `offline` | Toda requisição falha com erro de rede |
| `http-500` | `GET /nfts` responde 503 sempre |
| `flaky-catalog` | As 3 primeiras chamadas a `GET /nfts` falham; a seguinte funciona |
| `favorites-fail` | Favoritar/desfavoritar responde 503 (rollback otimista) |
| `session-expired` | A primeira requisição autenticada responde 401 `SESSION_EXPIRED` |
| `price-change-during-checkout` | No primeiro envio do pedido, o preço do 1º item sobe 10% (409 `QUOTE_STALE`) |
| `sold-out-during-checkout` | No primeiro envio, a edição do 1º item esgota (409 `AVAILABILITY_CONFLICT`) |
| `order-timeout` | O primeiro `POST /orders` cria o pedido mas a resposta nunca chega |
| `payment-rejected` | Pedidos terminam recusados |
| `wallet-refused` | A carteira recusa a conexão (403 `WALLET_REFUSED`) |
| `order-hold` | Pedidos ficam pendentes até `window.__kurio.resolveOrder(id, 'confirmed' \| 'rejected')` |

Conflito de cadastro e validação não precisam de cenário: cadastre `ana@kurio.test` ou o usuário `bruno`.

## Como reproduzir os fluxos de falha

Entre com `ana@kurio.test` e adicione um NFT ao carrinho antes dos fluxos de compra.

- **Preço alterado no carrinho (Socket.IO):** abra `/cart` e rode `window.__kurio.updateEdition('emerald-ape-042', 'e50', { price: '1.50' })` com o Emerald Ape no carrinho. O aviso aparece, o resumo é recalculado e a mudança é anunciada ao leitor de tela.
- **Cotação desatualizada no checkout:** em `/checkout`, conecte a carteira, clique em "Confirmar compra" e, com a revisão aberta, rode o mesmo `updateEdition`. O envio fica bloqueado até "Atualizar valores".
- **Preço muda no envio:** cenário `price-change-during-checkout`, depois "Enviar pedido". A revisão mostra o total antigo e o novo e pede nova confirmação.
- **Timeout com recuperação:** cenário `order-timeout`, depois "Enviar pedido". Após o timeout, o cliente reenvia com a mesma `Idempotency-Key` e recebe o mesmo pedido.
- **Pagamento recusado:** cenário `payment-rejected`. O recibo não é exibido e o carrinho continua intacto.
- **Desconexão com pedido pendente:** cenário `order-hold`, envie o pedido e rode `window.__kurio.setSocketOnline(false)`. Recarregue a página, depois rode `window.__kurio.resolveOrder(window.__kurio.pendingOrderIds()[0], 'confirmed')` e `window.__kurio.setSocketOnline(true)`. Ao reconectar, o cliente reconcilia com a API e mostra o recibo, sem criar outra compra.
- **Eventos duplicados e antigos:** em `/nft/sage-nomad-009`, rode `updateEdition(...)`, depois `window.__kurio.emitDuplicate()` e `window.__kurio.emitStale('sage-nomad-009')`. O preço não regride.
- **Sessão expirada:** `window.__kurio.expireSessions()` e navegue para uma área privada (ou clique em "Conectar carteira" no checkout). O login abre com aviso e retorna ao ponto de origem. No checkout, os dados preenchidos são mantidos.

## Deploy (Vercel)

`vercel.json` define o build (`pnpm build`), a saída `dist/`, o rewrite de SPA, para que acesso direto e refresh funcionem em qualquer rota, e os cabeçalhos de segurança (CSP, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`) de toda resposta; detalhes em [ARCHITECTURE.md](./ARCHITECTURE.md#segurança). O MSW intercepta fetch, XHR e WebSocket na página, sem exigir service worker.

```bash
pnpm dlx vercel        # preview
pnpm dlx vercel --prod # produção
```

Para validar uma URL publicada com os mesmos testes (sem iniciar servidor local):

```bash
PLAYWRIGHT_BASE_URL=https://sua-demo.vercel.app pnpm test:e2e
```

`/mercado` serve `dist/mercado.html` e `/nft/<id>` serve a página pré-renderizada `dist/nft/<id>.html` quando ela existe; IDs desconhecidos e todas as outras rotas caem no fallback da SPA (`index.html`), e o app resolve a rota no cliente. Arquivos de `assets/`, `fonts/` e as imagens AVIF/WebP em `/nft/` são servidos como estáticos.

## Estrutura

```
src/
  contracts/   esquemas Zod: a única fonte de tipos entre transporte, estado e UI
  api/         chamadas Axios tipadas (validam a resposta com os esquemas)
  queries/     hooks TanStack Query, chaves e mutations
  realtime/    cliente Socket.IO, ledger de eventos, live region
  features/    telas (catálogo, detalhe, carrinho, checkout, conta, auth)
  components/  layout e componentes shadcn/ui adaptados
  routes/      rotas TanStack Router (arquivo = rota)
  mocks/       backend simulado: banco, cenários, handlers REST, servidor Socket.IO
tests/e2e/     Playwright (funcionais + regressão visual)
lighthouse/    configuração, script de medianas e relatórios
```
