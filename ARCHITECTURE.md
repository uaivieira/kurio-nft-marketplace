# Arquitetura

## Visão geral

```
UI (features/*, routes/*)
  │  hooks
  ▼
TanStack Query (queries/*) ◄──── realtime/RealtimeProvider (socket.io-client)
  │  queryFn / mutationFn                     ▲
  ▼                                           │ eventos Socket.IO (WebSocket)
api/* (Axios + validação Zod)                 │
  │  HTTP /api/*                              │
  ▼                                           │
MSW (interceptores fetch, XHR e WebSocket) ─┘
  └─ mocks/: handlers REST → domain/* → db (estado + localStorage) → publish(evento)
```

- **Contratos tipados:** `src/contracts/*` define cada payload em Zod. O cliente valida toda resposta (`api/*`) e os handlers do MSW validam todo corpo de requisição com os mesmos esquemas. Os tipos TypeScript vêm de `z.infer`, então transporte, estado e UI compartilham uma única definição.
- **Nenhum componente conhece o mock.** Componentes, hooks e o cliente Axios não têm respostas fictícias nem ramificações de negócio para a simulação. O único ponto de contato é `main.tsx`, que inicia o MSW quando `VITE_ENABLE_MOCKS` está ligado.
- **Valores em ETH** trafegam como strings decimais e são calculados em `bigint` de wei (`src/lib/eth.ts`, 18 casas). O mesmo módulo é usado pelo cliente e pelo backend simulado. Quantidades são inteiras. O total exibido é sempre o da cotação da API.

## Rotas (TanStack Router)

| Rota | Acesso | Observação |
|---|---|---|
| `/` | público | Search params tipados e validados: `q`, `collections[]`, `networks[]`, `minPrice`, `maxPrice`, `tab`, `sort`, `page` |
| `/nft/$nftId` | público | `loader` faz prefetch; 404 próprio para NFT inexistente |
| `/cart` | público | Carrinho de visitante ou de usuário |
| `/login`, `/signup` | público | Diálogo sobre a home (desktop) ou tela cheia (mobile); `?redirect=` com retorno seguro (só caminhos relativos) |
| `/checkout`, `/orders/$orderId`, `/favorites`, `/profile`, `/profile/wallets` | privado | Layout `_auth` com `beforeLoad` que redireciona para `/login?redirect=<origem>` |
| `*` | — | Página 404 |

Busca, filtros, ordenação e paginação vivem só na URL: sobrevivem a refresh, voltar e avançar. Toda mudança de filtro zera `page`.

## Contratos REST (`/api`)

Erro padrão (`contracts/errors.ts`): `{ code, message, fieldErrors?, details? }`.

| Código | HTTP | Quando |
|---|---|---|
| `VALIDATION` | 422 | Corpo inválido; `fieldErrors` por campo |
| `UNAUTHENTICATED` | 401 | Sem token, ou credenciais inválidas no login |
| `SESSION_EXPIRED` | 401 | Token expirado ou revogado |
| `FORBIDDEN` | 403 | Recurso de outro usuário (ex.: pedido) |
| `NOT_FOUND` | 404 | Recurso inexistente |
| `CONFLICT` | 409 | E-mail/usuário já cadastrados; endereço de carteira duplicado |
| `AVAILABILITY_CONFLICT` | 409 | Quantidade acima do disponível ou do limite por pedido; edição esgotada |
| `COUPON_INVALID` / `COUPON_EXPIRED` | 422 | Cupom |
| `QUOTE_STALE` | 409 | Cotação enviada não corresponde à atual; `details.quote` traz a nova |
| `IDEMPOTENCY_MISMATCH` | 409 | Mesma `Idempotency-Key` com conteúdo diferente |
| `WALLET_REFUSED` | 403 | Conexão de carteira recusada |
| `TRANSIENT` | 503 | Falha transitória (repetível) |

| Recurso | Endpoint | Resposta |
|---|---|---|
| Sessão | `POST /auth/signup` `{username,email,password,confirmPassword,guestId?}` | 201 `Session` |
| | `POST /auth/login` `{email,password,guestId?}` | `Session` (`{token, expiresAt, user}`) |
| | `GET /auth/session` | `Session` |
| | `POST /auth/logout` | 204 |
| NFTs | `GET /nfts?q&collection&network&minPrice&maxPrice&tab&sort&page` | `CatalogPage` (`items, page, pageSize, total, totalPages, facets, featured`) |
| | `GET /nfts/:id` | `NftDetail` (edições com `available`, `maxPerOrder`, `price`; `version`) |
| Favoritos | `GET /favorites` · `PUT /favorites/:nftId` · `DELETE /favorites/:nftId` | `{ nftIds }` |
| Carrinho | `GET /cart` · `POST /cart/items` · `PATCH /cart/items/:lineId` · `DELETE /cart/items/:lineId` | `Cart` |
| | `PUT /cart/coupon` `{code}` · `DELETE /cart/coupon` | `Cart` |
| | `POST /cart/acknowledge` | `Cart` (confirma ciência de preços alterados) |
| Cotação | `POST /quotes` `{network}` | `Quote` (`id, version, lines, subtotal, discount, networkFee, total, coupon, issues, purchasable`) |
| Pedidos | `POST /orders` + header `Idempotency-Key` `{quoteId, quoteVersion, walletId, connectionId, network, buyer}` | 202 `Order` (`pending`) |
| | `GET /orders/:id` · `GET /orders?status=pending` | `Order` · `{ items }` |
| Perfil | `GET /me/profile` · `PATCH /me/profile` · `PUT /me/avatar` `{dataUrl}` · `POST /me/password` | `{profile, user}` / 204 |
| Carteiras | `GET /me/wallets` · `PUT /me/wallets/primary` · `PUT /me/wallets/secondary` | `WalletsState` |
| | `POST /wallets/connections` · `DELETE /wallets/connections/:id` | `WalletConnection` (simulação de conexão/recusa/desconexão) |

Visitantes são identificados pelo header `X-Guest-Id` (UUID em `localStorage`); usuários, por `Authorization: Bearer <token>`.

**Idempotência:** o servidor guarda `userId:Idempotency-Key → { fingerprint, orderId }`. A mesma chave com o mesmo conteúdo devolve o mesmo pedido; com conteúdo diferente, 409 `IDEMPOTENCY_MISMATCH`. No cliente (`lib/idempotency.ts`), a chave é derivada do payload e guardada em `sessionStorage`, então reenvio após timeout, clique repetido ou refresh reutilizam a mesma chave.

## Eventos Socket.IO

Envelope: `{ eventId, type, resource: { kind, id }, version, occurredAt, data }`.

| Evento | Destino | `data` |
|---|---|---|
| `nft.updated` | todas as conexões | `{ nftId, price, totalAvailable, editions[{id, price, available}] }` |
| `order.updated` | só as conexões do dono (`userId`) | `{ orderId, status, failureReason }` |

`version` é monotônica por recurso (`nft.version`, `order.version`) e é a mesma exposta pelo REST.

**No cliente** (`realtime/`):

- `EventLedger` descarta `eventId` já visto (duplicata) e versão menor ou igual à última conhecida do recurso (evento antigo). Antes de aplicar, as atualizações de cache também comparam com a `version` do dado em cache, então um evento nunca regride um estado mais novo vindo do REST.
- `nft.updated` atualiza com `setQueryData` o detalhe e todas as páginas de catálogo em cache, e invalida carrinho e cotação, que são recalculados pela API. Uma mudança em item do carrinho é anunciada na live region.
- `order.updated` atualiza o status em cache e refaz a busca do pedido (o recibo vem do REST). Pedido confirmado invalida o carrinho.
- **Reconexão:** no `connect` seguinte a uma queda, todas as queries ativas de NFT, catálogo e dados privados são invalidadas: o REST é a fonte da verdade sobre o que se perdeu. Pedidos pendentes também têm polling de 4 s como rede de segurança.
- **Ciclo de vida:** o provider é chaveado pelo token. Logout ou troca de usuário remove listeners, desconecta, limpa o ledger e abre outra conexão com a nova identidade. O servidor só entrega `order.updated` ao dono, e o cliente ainda confere `userId`.

### Transporte nos mocks e limitações

- `msw` intercepta o `WebSocket` do navegador; `@mswjs/socket.io-binding` codifica e decodifica os pacotes Engine.IO/Socket.IO. O app usa o `socket.io-client` real, sem atalhos para o cache.
- Somente o transporte `websocket` (sem long-polling HTTP), namespace padrão e sem acknowledgements.
- Caminho `/realtime/` em vez de `/socket.io/`: o MSW remove o prefixo `/socket.io/` antes de casar a URL, o que faria o handler também capturar o WebSocket de HMR do Vite em `/`.
- O token vai na query string do handshake, porque o binding não expõe o pacote CONNECT. Num backend real, iria em `auth`.
- O `socket.io-client` é carregado dinamicamente após o MSW iniciar, porque o `engine.io-client` captura `globalThis.WebSocket` ao ser avaliado.
- O servidor envia pings Engine.IO a cada 20 s para o cliente não encerrar a conexão por inatividade.
- Cada aba tem o próprio servidor simulado em memória; o estado é compartilhado entre abas só através do snapshot em `localStorage`, não em tempo real.

## Backend simulado (MSW)

O boot usa `defineNetwork` e uma única `InterceptorSource` (`msw/experimental`) com interceptores de fetch, XHR e WebSocket. REST e Socket.IO continuam atravessando a camada de rede e os mesmos handlers; não é necessário registrar service worker. A API experimental é uma dependência de compatibilidade a revalidar nas atualizações do MSW.

- `mocks/db/state.ts`: estado tipado, persistido em `localStorage` (`kurio:mockdb:v1`, com versão de schema). `reset()` re-semeia tudo.
- `mocks/db/seed.ts`: 48 NFTs determinísticos (nomes e preços do Figma + gerados com PRNG de semente fixa), 9 coleções, 3 redes, 4 edições por NFT, 2 usuários, 2 cupons e casos de borda.
- `mocks/domain/*`: regras de negócio (catálogo e facetas, carrinho e cotação, pedidos, carteiras, auth). `updateEdition()` é o único ponto que altera preço ou estoque; ele persiste e publica `nft.updated` na mesma operação, então REST e eventos nunca divergem.
- `mocks/http.ts`: wrapper de rota com latência e falhas por cenário, autenticação, validação Zod e mapeamento de erros.
- `mocks/scenarios.ts`: cenários determinísticos. Os contadores (requisições, falhas únicas) zeram a cada troca de cenário ou reset.
- Pedidos se resolvem por horário (`resolveAt`): mesmo após um refresh, o pedido pendente se resolve no próximo acesso ou no timer reagendado no boot.
- `window.__kurio` (`mocks/control.ts`) é a superfície de controle para testes e demonstração. Ela só altera o backend simulado; o app vê o efeito pelo REST e pelos eventos.

## Sessão

- `POST /auth/login` devolve um token opaco (TTL de 8 h). O cliente guarda `{token, expiresAt, user}` em `localStorage` e recupera a sessão após refresh. Senhas nunca são guardadas no cliente.
- O guard de rota usa a sessão local. A validade real é conferida a cada chamada: um 401 `SESSION_EXPIRED` dispara `expireSession()` (limpa sessão e cache), avisa e redireciona para `/login?redirect=<rota atual>&reason=expired`.
- **Contexto do checkout:** o formulário é salvo em `sessionStorage` com o `userId` dono. Após expirar e entrar de novo, a mesma pessoa encontra o formulário preenchido; outro usuário não o vê.
- **Logout e troca de usuário:** `queryClient.clear()` e remoção de `['private', …]`, rascunho e chaves de idempotência apagados, socket reaberto com a nova identidade.

## Carrinho

- O estado fica no servidor (simulado): `cart:guest:<id>` ou `cart:user:<id>`. Por isso sobrevive a refresh e é coerente com a cotação.
- Ao entrar ou se cadastrar, o cliente envia `guestId`; o servidor mescla os itens do visitante no carrinho do usuário, somando quantidades dentro dos limites.
- Limites por linha: `min(disponível, maxPerOrder)` da edição, validados no cliente (stepper) e no servidor (409).
- Cada linha traz `unitPrice` atual e `priceWhenAdded`. Quando divergem, a cotação inclui um `issue` do tipo `price-changed` e a UI avisa até o usuário confirmar ciência (`/cart/acknowledge`). Esgotado e insuficiente bloqueiam a finalização.
- Cupom aplicado fica no carrinho. Subtotal, desconto, taxa de rede e total vêm de `POST /quotes`, nunca de cálculo no cliente.

## Checkout e pedidos

1. Formulário validado (Zod), pré-preenchido com perfil e carteira cadastrada; seleção de rede (altera a taxa).
2. Conexão simulada da carteira escolhida (`POST /wallets/connections`), com recusa e desconexão.
3. "Confirmar compra" abre a revisão com um snapshot da cotação. Se um evento mudar a cotação nesse intervalo, o envio fica bloqueado até "Atualizar valores".
4. "Enviar pedido" faz `POST /orders` com `quoteVersion` e `Idempotency-Key`. O servidor revalida preço, estoque, cupom e taxa:
   - `QUOTE_STALE`: a revisão mostra o total antigo e o novo e exige nova confirmação.
   - `AVAILABILITY_CONFLICT`: fecha a revisão; o carrinho mostra o problema.
   - Timeout ou rede: o cliente reenvia uma vez com a mesma chave e recebe o mesmo pedido.
   - Trava por `ref` e botão desabilitado impedem duplo envio.
5. `/orders/:id` mostra pendente, confirmado ou recusado. O recibo só aparece com `status === 'confirmed'` vindo da API e reproduz o snapshot gravado no pedido (linhas, preços, taxas, total), imune a mudanças posteriores do catálogo. Na confirmação, o servidor baixa o estoque e remove do carrinho só os itens e quantidades comprados. Na recusa, o carrinho fica intacto.

## Estratégia de cache (TanStack Query)

| Dado | Chave | `staleTime` | Observação |
|---|---|---|---|
| Catálogo | `['catalog', query]` | 30 s | `placeholderData: keepPreviousData`; `AbortSignal` cancela requisições obsoletas, e a chave por parâmetros descarta respostas fora de ordem |
| Detalhe | `['nft', id]` | 15 s | Prefetch no `loader` |
| Privados | `['private', userId \| 'guest', …]` | 30 s (carrinho 10 s) | Isolados por usuário; `removeQueries(['private'])` em troca de identidade |
| Cotação | `['private', scope, 'quote', network, cartVersion]` | 0 | Nova a cada versão do carrinho |
| Pedido | `['private', scope, 'order', id]` | 30 s | Polling de 4 s só enquanto pendente |

- `retry`: só para `TRANSIENT` (503) e erro de rede, até 2 vezes com backoff exponencial (500 ms, 1 s). Erros 4xx aparecem na hora. Mutations não repetem automaticamente; o envio de pedido tem o reenvio idempotente explícito descrito acima.
- `refetchOnWindowFocus: false`, `refetchOnReconnect: true`, `gcTime` de 5 min.
- **Mutations:** as de carrinho substituem o cache com a resposta e invalidam a cotação. Favoritos usam atualização otimista com rollback (`onMutate`/`onError`) e revalidação em `onSettled`. Perfil e avatar atualizam também o usuário da sessão.

## Acessibilidade

- Link "Pular para o conteúdo", foco visível global (`:focus-visible`), `main` focável.
- Diálogos e gavetas (Radix) com foco preso e devolvido ao gatilho.
- `Field` associa label, `aria-invalid`, `aria-describedby` e mensagem com `role="alert"`; erros da API são mapeados para os campos.
- Live region global (`role="status"`) anuncia mutations e eventos em tempo real; um aviso visível aparece quando a conexão em tempo real cai.
- Estados não dependem só de cor: edições esgotadas são riscadas e têm texto "(esgotada)"; filtros usam `aria-pressed`; tabs usam `aria-selected`.
- `prefers-reduced-motion` neutraliza animações (inclusive o shimmer dos skeletons).
- Ajustes em relação ao layout: alvos de toque mínimos de 24 px (pontos do carrossel e ícones de compartilhar), títulos `h2` ocultos para manter a hierarquia, e cor de texto secundário `#b39463` (contraste AA sobre o fundo).

## Fidelidade ao Figma: decisões e desvios

- **Fonte de verdade:** variáveis do Figma (`color/*`, `font/family`, estilos de texto) e a geometria dos nós (posição e tamanho) da cópia do arquivo. Cores em `src/index.css` mapeadas 1:1 (`color/ink` `#140d0a`, `color/surface-card` `#241612`, `color/surface-dark` `#38220f`, `color/primary` `#d28a4c`, `color/text-accent` `#e89b55`, `color/text-primary` `#f7f3ec`, `color/text-secondary` `#cfb28c`, `color/secondary` `#b39463`, `color/border` `#3f2319`, `color/border-soft` `#55321f`). A escala tipográfica do Figma virou utilitários (`text-micro` 9, `text-tiny` 10, `text-caption` 13, `text-md` 15, `text-title` 28, `text-display` 43/70); os demais tamanhos coincidem com os do Tailwind. Container de 1200 px de conteúdo, como nos frames desktop.
- **Comparação automatizada:** `pnpm figma:compare` renderiza cada tela com fixtures fixas (carrinho Emerald ×2, Violet ×6, Ivory ×9; usuária Ana). Esses itens e quantidades não coincidem com todos os frames mobile; a comparação não deve ser interpretada como igualdade de dados. O script compara pixel a pixel com o PNG do frame em `figma/frames/`. Saída em `figma/report/` (diff e `summary.md`). A métrica é sensível a qualquer deslocamento vertical, a diferenças de antialiasing entre o render do Figma e o Chromium, à moldura arredondada dos frames mobile e a conteúdo que muda de propósito (contagens reais nos filtros, 6 páginas em vez de 4, home renderizada atrás dos modais de login). Por isso serve como guia de regressão, não como nota absoluta.
- **Revisão visual pendente:** os relatórios ainda mostram diferenças de geometria e composição, sobretudo no fundo de login/cadastro desktop e na home mobile. Regressão visual aprovada significa estabilidade frente às baselines da aplicação; não comprova fidelidade integral ao Figma.
- **Assets:** usadas as 4 artes exportadas (`Frame 136`, `NFT Artwork 04/05/10`), convertidas para AVIF/WebP em 160/320/480 px. O catálogo reaproveita as artes, como o próprio Figma faz. Fonte Roboto Mono auto-hospedada (`public/fonts`). Ícones Iconly (MIT, react-iconly 2.2.10) e marcas Simple Icons foram incorporados como SVGs locais, apenas nas variantes usadas, sem carregar o runtime das bibliotecas. Glifos utilitários usam geometria Lucide (ISC).
- **Login e cadastro:** diálogo sobre a home no desktop, alinhado ao topo como no frame; tela cheia no mobile, com o título e o link de troca ("Novo na Kurio? Crie uma conta") do frame mobile. Os rótulos dos campos ficam visualmente ocultos (o design só mostra placeholders), mas continuam associados aos campos para leitores de tela. O botão de cadastro usa "Criar perfil" no mobile e "Criar conta" no desktop. O diálogo mobile permite rolagem interna para manter campos e ações acessíveis em telas baixas. Login social desabilitado e rotulado.
- **Checkout:** os campos de endereço e tipo de carteira vêm da carteira cadastrada selecionada (somente leitura). No desktop, "Usar outra carteira?" alterna para a carteira secundária, e "Carteira e rede" lista os provedores (WalletConnect, MetaMask, Coinbase Wallet); WalletConnect conecta qualquer carteira, os demais só a do próprio tipo. O cupom fica atrás do link "Tem um código promocional? Aplique aqui". No mobile, como no frame, aparecem os cards "Carteira conectada" (Principal/Reserva) com "Trocar carteira" e a lista de provedores; os dados do colecionador vêm pré-preenchidos num bloco recolhível que abre sozinho se houver erro. No mobile, a lista de itens, o cupom e o detalhamento de valores ficam ocultos, preservando o total e os alertas de preço e estoque antes da compra. "Confirmar compra" abre uma revisão antes do envio, exigida pelo enunciado.
- **Perfil:** dados e senha têm botões separados ("Salvar" e "Alterar senha") para que erros de um não bloqueiem o outro.
- **Carteiras:** o formulário principal serve para cadastrar e editar; "Adicionar" existe na carteira secundária.
- **Mobile:** barra inferior com Início, Lista de interesse, busca (o FAB central do Figma não tinha função definida), Carrinho e Perfil.
- **Tablet (768–1023 px):** os frames são só 1440 e 414. Hero, detalhe com miniaturas, tabela do carrinho e checkout em duas colunas passam a valer a partir de 1024 px; abaixo disso usam a composição compacta. Um teste E2E garante ausência de overflow horizontal em 320, 390, 768 e 1440 px; 320 px representa o reflow de 1280 px a 400% de zoom (WCAG 1.4.10).
- **Alvos de toque:** os pontos do carrossel têm 24 px de área clicável (o desenho tem 8 px) para cumprir o critério de tamanho de alvo.
- **Telas sem frame mobile** (perfil, carteiras, confirmação) seguem os padrões dos frames mobile existentes.
- **Fora de escopo** (Criadores, Aprenda, editorial, suporte, atividade, ofertas, downloads, newsletter, "Esqueceu a senha?", avaliações): visíveis, porém inertes e marcados "em breve". A newsletter informa que nada foi enviado. "Ver no Etherscan" abre um diálogo que explica que a referência é simulada.

## Performance (Lighthouse)

Medianas de 3 execuções por página e perfil em [lighthouse/reports/summary.md](./lighthouse/reports/summary.md). Configuração em `lighthouse/lighthouserc.cjs`; relatórios HTML/JSON em `lighthouse/reports/<perfil>/`.

Mediana atual: **100 em Performance, Accessibility, Best Practices e SEO** no início e no detalhe, em mobile e desktop (LCP mobile 1,6 s no início e 1,4 s no detalhe; CLS e TBT zero).

**Como:** o LCP é uma imagem que depende de dados. Enquanto a página dependia do JS para existir, a cadeia HTML → ~300 kB de JS → boot do backend simulado → renderização → imagem deixava o LCP em ~3,6 s no 4G lento simulado.

- **Pré-renderização em build (SSG).** `pnpm build` também compila `src/entry-prerender.tsx` para Node. `scripts/prerender.ts` gera o HTML do início (`dist/index.html`) e de cada NFT (`dist/nft/<id>.html`) com o router e os componentes reais. Os dados vêm do seed padrão do backend simulado, consultado pelas funções de domínio e validado pelos mesmos contratos Zod. O cache do TanStack Query vai desidratado no HTML (`window.__KURIO_STATE__`).
- **Assumir o HTML sem trocar o que aparece.** O cliente hidrata o cache com os dados marcados como velhos, resolve a rota (`router.load()`) e só então monta com `createRoot` dentro de `startTransition`. A primeira renderização é idêntica ao HTML, e as queries revalidam em segundo plano contra o backend deste navegador. Um teste E2E garante deslocamento de layout ~0 nessa troca.
- **JS fora do caminho do LCP.** Nas páginas pré-renderizadas, o script de entrada e os `modulepreload` são injetados por um carregador inline assim que o navegador reporta o LCP da imagem (`PerformanceObserver`), com teto de 1,5 s. A página já está completa e visível; links funcionam como navegação normal até o app assumir.
- **Outras URLs.** O fallback de SPA (carrinho, checkout, conta) e o início com filtros na URL recebem esse HTML marcado como desatualizado antes da primeira pintura: o conteúdo pré-renderizado fica oculto e o app carrega na hora, então o catálogo padrão nunca aparece no lugar do pedido.
- **Demais otimizações:**
  - latência padrão de 20 ms (o cenário `slow` mantém 2,5 s);
  - preload responsivo da arte LCP de cada página;
  - imagens AVIF;
  - fonte local com preload só do peso 400;
  - interceptação em página (sem service worker);
  - Socket.IO, toasts, painel de cenários e diálogos carregados depois da primeira pintura;
  - remoção de `tough-cookie` do bundle de mocks.
- **Limitação:** o HTML estático reflete o seed padrão. Num navegador com dados simulados alterados (preços mudados por cenário, por exemplo), os valores pré-renderizados aparecem por um instante até a revalidação em segundo plano.

A auditoria usa o mesmo build publicado, com imagens, fontes e funcionalidades completas.

## Limitações conhecidas

- Os dados simulados são por navegador (`localStorage`); não há sincronização entre dispositivos.
- Tempo real entre abas não é propagado (cada aba tem o próprio servidor simulado).
- Uploads de avatar ficam como data URL (até 1 MB) no armazenamento local.
- A regressão visual depende do renderizador do Chromium; baselines geradas em macOS podem precisar de `pnpm test:e2e:update` em outro sistema.
