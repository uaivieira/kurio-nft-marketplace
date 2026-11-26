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

## Internacionalização (i18n)

Todo texto exibido ao usuário (conteúdo visível, `aria-label`, `alt`, `title`, `placeholder`, textos só para leitor de tela, toasts, anúncios da live region, estados de vazio, erro e carregamento, painel de cenários, título e descrição do documento) vem do dicionário `src/i18n/locales/pt-BR.ts`, via `useTranslation()`/`t()` nos componentes e `i18n.t()` fora deles. Os dados simulados (nomes, descrições, coleções e usuários do seed) continuam em português, porque são conteúdo, não interface.

- **Instância:** `src/i18n/index.ts` inicializa o i18next de forma síncrona (`initAsync: false`), com recursos embutidos no bundle, `lng` e `fallbackLng` `pt-BR`, sem detector de idioma nem backend, e `interpolation.escapeValue: false` (o React já escapa). `main.tsx` e `entry-prerender.tsx` carregam a mesma instância, então o HTML pré-renderizado e a primeira renderização do cliente usam exatamente os mesmos textos. O i18next viaja no bundle do app, que só carrega depois do LCP; a página pré-renderizada não depende dele.
- **Chaves tipadas:** as chaves são em inglês e agrupadas por área (`common`, `layout`, `catalog`, `detail`, `cart`, `checkout`, `order`, `auth`, `account`, `favorites`, `realtime`, `errors`, `validation`, `mocks`). `CustomTypeOptions` declara o dicionário como tipo, então uma chave inexistente ou uma interpolação faltando falha no `pnpm typecheck`. Plurais usam `_one`/`_other` (e `_zero` onde o português do Brasil, que trata 0 como singular, precisa de "0 itens"); interpolações usam `{{nome}}`; frases com marcação usam `Trans` com componentes nomeados (`<anchor>`, `<strong>`, `<button>`, `<emphasis>`; nunca `<link>`, que o parser do react-i18next trata como elemento vazio do HTML).
- **HTML idêntico ao anterior:** o React separa nós de texto vizinhos com `<!-- -->` no HTML do servidor. Uma frase que antes era montada no JSX com valores no meio (por exemplo "48 NFTs encontrados. Página 1 de 6.") viraria um nó só com `t()` e mudaria os bytes do `#root`. `src/i18n/interpolate.ts` divide a frase traduzida nos pontos de interpolação e devolve os pedaços como nós separados, reproduzindo a marcação original; é usado apenas nos textos das páginas pré-renderizadas.
- **Validação:** os esquemas Zod (`src/contracts/*`, `src/features/checkout/schema.ts`) emitem chaves (`validation.*`, via o helper tipado `validation()` de `src/i18n/keys.ts`), e o servidor simulado devolve as mesmas chaves em `fieldErrors`. `Field` e o formulário de cupom traduzem a mensagem com `translateMessage()`, que deixa intactas as mensagens padrão do Zod que não são chaves.
- **Erros da API:** os handlers do MSW mantêm `code` e `details` e usam uma `message` técnica em inglês. `errorMessage()` (`src/lib/api-error.ts`) converte para `errors.<CODE>.<motivo>`, com `details.reason` escolhendo a variante (por exemplo `NOT_FOUND` de pedido ou de carteira) e `errors.<CODE>.default` como padrão; `AVAILABILITY_CONFLICT` com `details.quote` mostra o primeiro problema bloqueante da cotação. Os problemas da cotação (`issues[].details`) e a recusa de pedido (`order.failure`) trazem dados estruturados, e a UI monta o texto em pt-BR a partir deles. `src/lib/api-error.test.ts` fixa as mensagens de cada cenário.
- **Datas e números:** `Intl` com `i18n.language` (data do recibo e faixa de preço do filtro, sem separador de milhar, como antes). Valores em ETH continuam em `formatEth` (`src/lib/eth.ts`), com a precisão decimal exata; a nota de avaliação do detalhe mobile mantém o ponto decimal de antes.
- **Documento:** `index.html` referencia `%t:common.meta.title%` e `%t:common.meta.description%`; um plugin do `vite.config.ts` substitui pelos textos do dicionário (com escape de HTML) e falha o build se a chave não existir.
- **Botão de fechar:** o botão de fechar dos diálogos e do menu lateral do shadcn/ui anuncia "Fechar" (`common.close`); antes do i18n ele anunciava "Close", em inglês.
- **Como adicionar um idioma:** crie `src/i18n/locales/<idioma>.ts` com o tipo `typeof ptBR` (o typecheck aponta chaves faltando), registre-o em `resources` de `src/i18n/index.ts` e defina como escolher o idioma (`lng` fixo, detector ou preferência do usuário). Atualize também `<html lang>` em `index.html`. Nenhum componente precisa mudar.

## Rotas (TanStack Router)

| Rota | Acesso | Observação |
|---|---|---|
| `/` | público | Início completo (hero, catálogo, NFT em destaque, editorial, rodapé). Search params tipados e validados: `q`, `collections[]`, `networks[]`, `minPrice`, `maxPrice`, `tab`, `sort`, `page` |
| `/mercado` | público | Composição de mercado dos frames do Figma: hero, filtros e grade, sem destaque, editorial nem rodapé. Mesmos search params e o mesmo prefetch do início; navegação de catálogo permanece em `/mercado` |
| `/nft/$nftId` | público | `loader` faz prefetch; 404 próprio para NFT inexistente |
| `/cart` | público | Carrinho de visitante ou de usuário |
| `/login`, `/signup` | público | Diálogo sobre a composição do Mercado (desktop) ou tela cheia (mobile); `?redirect=` com retorno seguro (só caminhos da mesma origem) |
| `/checkout`, `/orders/$orderId`, `/favorites`, `/profile`, `/profile/wallets` | privado | Layout `_auth` com `beforeLoad` que redireciona para `/login?redirect=<origem>` |
| `*` | — | Página 404 |

Busca, filtros, ordenação e paginação vivem só na URL: sobrevivem a refresh, voltar e avançar. Toda mudança de filtro zera `page`. Valores inválidos na URL viram "não definido" em vez de derrubar a rota, então um link editado à mão ou antigo ainda abre a página.

Os `loader` só fazem prefetch: um erro não derruba a rota, ele aparece pelo estado da própria query no componente (nova tentativa, vazio ou mensagem de erro). O início e o `/mercado` leem facetas e NFT em destaque da mesma entrada de cache do catálogo, sem uma segunda requisição. O caminho `/mercado` e a âncora `#catalogo` fazem parte das URLs públicas (links, histórico, `vercel.json`) e por isso continuam em português, assim como os identificadores de coleção do seed (`arte-digital`, `musica`…) usados em `collections[]`.

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

## Eventos Socket.IO e reconciliação com o REST

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
- No detalhe, a quantidade escolhida é limitada a cada renderização pelo estoque e pelo limite da edição atual, então uma queda de estoque em tempo real ou a troca de edição nunca deixa uma quantidade inválida.
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
- `window.__kurio` (`mocks/control.ts`) é a superfície de controle para testes e demonstração. Ela só altera o backend simulado; o app vê o efeito pelo REST e pelos eventos. Os endpoints de controle (`/api/__mock/*`) ignoram a latência e as falhas do cenário, para que os testes sempre os alcancem.
- **Uma única `InterceptorSource`:** toda `InterceptorSource` se registra sob o mesmo símbolo global; uma segunda reaproveitaria a primeira em silêncio e nunca aplicaria os próprios interceptores. Por isso fetch, XHR e WebSocket vão na mesma fonte (o cast no `browser.ts` só une os genéricos de eventos de cada interceptor, como o `setupWorker` do próprio MSW faz).
- **Servidor Socket.IO depois da primeira pintura:** o binding e os parsers do Socket.IO só são registrados quando a página fica ociosa (`afterLoad`); o cliente espera `realtimeReady` antes de conectar.
- **Seed estável:** as datas de listagem partem de um "agora" fixo das fixtures, então a ordenação por recentes não muda entre execuções. O hash PBKDF2 da senha de demonstração vem pré-calculado (e conferido por `seed.test.ts`), para o primeiro boot não fazer derivação de chave.
- **Persistência tolerante:** se o `localStorage` estiver cheio ou indisponível, o estado em memória continua valendo; um snapshot corrompido ou de outra versão de schema é descartado e o seed é refeito.
- **Versão da cotação:** `quote.version` é uma impressão digital determinística de linhas, quantidades, preços, cupom válido, taxa e bloqueios; muda sempre que algum valor aceito pelo usuário mudaria.
- **Mensagens:** erros, problemas da cotação e motivos de recusa usam texto técnico em inglês; o que a UI mostra sai do dicionário pt-BR (ver Internacionalização).

## Sessão

- `POST /auth/login` devolve um token opaco (TTL de 8 h). O cliente guarda `{token, expiresAt, user}` em `localStorage` e recupera a sessão após refresh. Senhas nunca são guardadas no cliente.
- O guard de rota usa a sessão local. A validade real é conferida a cada chamada: um 401 `SESSION_EXPIRED` dispara `expireSession()` (limpa sessão e cache), avisa e redireciona para `/login?redirect=<rota atual>&reason=expired`.
- **Contexto do checkout:** o formulário é salvo em `sessionStorage` com o `userId` dono. Após expirar e entrar de novo, a mesma pessoa encontra o formulário preenchido; se outro usuário entrar, o rascunho é apagado no login (mesmo sem sessão anterior, caso da expiração).
- **Logout e troca de usuário:** `queryClient.clear()` e remoção de `['private', …]`, rascunho e chaves de idempotência apagados, socket reaberto com a nova identidade. A sessão local é descartada mesmo que o `POST /auth/logout` falhe na rede.

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
   - Trava por `ref` e botão desabilitado impedem duplo envio. A trava só é liberada depois de uma falha: depois do sucesso o pedido existe e a chave de idempotência já foi descartada, então um clique que chegasse antes de a revisão fechar e a rota mudar criaria um segundo pedido com chave nova.
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
- **Timeout HTTP:** é um abort disparado por timer, não o `timeout` nativo do XHR, para compor com o `AbortSignal` de quem chamou (cancelamento de query) e seguir o relógio da página (determinístico nos testes). Um cancelamento pelo chamador (query obsoleta) não é falha: o erro é repassado para o TanStack Query descartá-lo.
- **Backend pronto:** só as chamadas de rede esperam `backendReady` (imediato com uma API real, após o boot do MSW na demo); a UI e a imagem do LCP não ficam na fila do boot dos mocks.
- **Mutations:** as de carrinho substituem o cache com a resposta e invalidam a cotação. Favoritos usam atualização otimista com rollback (`onMutate`/`onError`) e revalidação em `onSettled`. Perfil e avatar atualizam também o usuário da sessão.

## Acessibilidade

- Link "Pular para o conteúdo", foco visível global (`:focus-visible`), `main` focável.
- Diálogos e gavetas (Radix) com foco preso e devolvido ao gatilho.
- `Field` associa label, `aria-invalid`, `aria-describedby` e mensagem com `role="alert"`; erros da API são mapeados para os campos.
- Live region global (`role="status"`) anuncia mutations e eventos em tempo real; um aviso visível aparece quando a conexão em tempo real cai. Para anunciar de novo o mesmo texto, `announce()` alterna um espaço no fim da mensagem, porque o leitor de tela só fala quando o DOM muda. Todo toast também é anunciado pela live region, então nada se perde se um toast disparar antes de o `<Toaster />` montar.
- Busca e gaveta de filtros carregam no primeiro uso; como não existe um gatilho Radix (o diálogo é carregado depois), o foco volta explicitamente para o botão que abriu.
- Estados não dependem só de cor: edições esgotadas são riscadas e têm texto "(esgotada)"; filtros usam `aria-pressed`; tabs usam `aria-selected`.
- `prefers-reduced-motion` neutraliza animações (inclusive o shimmer dos skeletons).
- Ajustes em relação ao layout: alvos de toque mínimos de 24 px (pontos do carrossel e ícones de compartilhar), títulos `h2` ocultos para manter a hierarquia, e cor de texto secundário `#b39463` (contraste AA sobre o fundo).

## Fidelidade ao Figma: decisões de UX e desvios

- **Fonte de verdade:** variáveis do Figma (`color/*`, `font/family`, estilos de texto) e a geometria dos nós (posição e tamanho) da cópia do arquivo. Cores em `src/index.css` mapeadas 1:1 (`color/ink` `#140d0a`, `color/surface-card` `#241612`, `color/surface-dark` `#38220f`, `color/primary` `#d28a4c`, `color/text-accent` `#e89b55`, `color/text-primary` `#f7f3ec`, `color/text-secondary` `#cfb28c`, `color/secondary` `#b39463`, `color/border` `#3f2319`, `color/border-soft` `#55321f`). A escala tipográfica do Figma virou utilitários (`text-micro` 9, `text-tiny` 10, `text-caption` 13, `text-md` 15, `text-title` 28, `text-display` 43/70); os demais tamanhos coincidem com os do Tailwind. Container de 1200 px de conteúdo, como nos frames desktop.
- **Comparação automatizada:** `pnpm figma:compare` renderiza cada tela e compara pixel a pixel com o PNG do frame em `figma/frames/` (saída em `figma/report/`). A preparação de cada frame fica em `figma/frames.json` e reproduz só os dados do desenho, sem mudar o app nem os mocks: o carrinho desktop usa Emerald ×2, Violet ×6 e Ivory ×9; o carrinho mobile usa Emerald ×1, Violet ×1, Ivory ×2 e Golden Beat ×2 (edição 1/50, cujos preços coincidem com os do frame); o login tem a senha digitada e o campo de senha em foco, como nos frames. A métrica continua sensível a antialiasing, à moldura arredondada dos frames mobile e a dados reais que diferem do desenho (contagens dos filtros, 6 páginas, artes do catálogo, descrição do Emerald Ape, data e hash do pedido, campos pré-preenchidos da Ana, segunda carteira cadastrada), por isso serve como guia de regressão, não como nota absoluta.
- **Geometria por elemento:** `pnpm build && pnpm figma:geometry` confere x, y, largura e altura (±2 px) e, onde declarado, tamanho e peso da fonte de 156 elementos-chave (cabeçalho, trilha, títulos, botões, campos, cards, chips, seletor de quantidade, linhas do resumo, rodapé, barra mobile) nos 15 frames, em 1440 e 414 px. As referências ficam versionadas em `figma/nodes/<frame>.json`. O plano Starter do Figma atingiu o limite de chamadas MCP no primeiro `get_metadata`, então os valores foram medidos nos PNGs 1x: `box` compara o retângulo do elemento no DOM; `ink` compara a caixa dos pixels visíveis, detectada com o mesmo limiar no PNG e na captura do elemento. Os elementos são localizados por papel, nome acessível ou `data-testid`. Quando um dado real muda a altura de um bloco (descrição do NFT), o elemento seguinte é medido relativo a ele (`relativeTo`); `ignore` só é usado nos eixos listados abaixo como desvio.
- **Desvios medidos que ficaram:** (1) altura dos glifos 2–3 px maior em alguns títulos (o Figma renderiza a Roboto Mono com outra métrica vertical); (2) largura do primeiro rótulo dos formulários de perfil, carteiras e pagamento, +7 px pelo asterisco de obrigatório; (3) botão central da barra mobile centralizado, 4 px à direita do Figma, cujo recorte é assimétrico; (4) a chip da edição selecionada no detalhe mobile fica em outra posição x porque o NFT real tem as edições 1/1, 1/10, 1/50 e Aberta (o frame repete "1/10"); (5) títulos de seção com borda inferior de largura total e a linha da edição no carrinho mobile (sobreposta pelo seletor) não comparam largura; (6) no frame de cadastro desktop o espaçamento dos botões sociais (16 px) difere do login (12 px); o app segue cada frame.
- **Fundo de login e cadastro desktop:** a maior parte dos ~25% de diferença vem do fundo, não do diálogo. O frame desenha atrás do diálogo uma variação da home (hero 14 px mais alto, grade começando em 437 px, contagens 33/12/65 nos filtros, cards com outras artes), diferente do próprio frame da home; o app mostra `/mercado`. A geometria do diálogo (posição, campos, botões, divisória de largura total, botão fechar em `primary`) confere com o frame a ±2 px.
- **Assets:** usadas as 4 artes exportadas (`Frame 136`, `NFT Artwork 04/05/10`), convertidas para AVIF/WebP em 160/320/480 px por `pnpm assets` (a saída fica versionada, então o build não precisa de ferramentas de imagem). O catálogo reaproveita as artes, como o próprio Figma faz. Fonte Roboto Mono auto-hospedada (`public/fonts`). Ícones Iconly (MIT, react-iconly 2.2.10) e marcas Simple Icons foram incorporados como SVGs locais, apenas nas variantes usadas, sem carregar o runtime das bibliotecas. Glifos utilitários usam geometria Lucide (ISC). Atribuições completas em [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).
- **Página Mercado:** o Figma não tem frame "Mercado"; a composição aparece atrás dos modais de login e cadastro desktop (hero, filtros Coleções/Faixa de preço/Rede e grade 3×3 de cards, sem "NFT em destaque", sem seções editoriais). `/mercado` reproduz essa composição reaproveitando os componentes do início (`HomePage` com `variant="market"`), e o "Mercado" do cabeçalho leva a ela. A paginação foi mantida (requisito funcional), embora o frame mostre só 9 cards. Os dois frames terminam logo abaixo da grade, dentro dos 1981 px, sem rodapé; por isso o rodapé não aparece em `/mercado` nem atrás de login e cadastro.
- **Login e cadastro:** diálogo sobre a composição do Mercado no desktop, alinhado ao topo como no frame; tela cheia no mobile, com o título e o link de troca ("Novo na Kurio? Crie uma conta") do frame mobile. Os rótulos dos campos ficam visualmente ocultos (o design só mostra placeholders), mas continuam associados aos campos para leitores de tela. O botão de cadastro usa "Criar perfil" no mobile e "Criar conta" no desktop. O diálogo mobile permite rolagem interna para manter campos e ações acessíveis em telas baixas. Login social desabilitado e rotulado.
- **Checkout:** os campos de endereço e tipo de carteira vêm da carteira cadastrada selecionada (somente leitura). No desktop, "Usar outra carteira?" alterna para a carteira secundária, e "Carteira e rede" lista os provedores (WalletConnect, MetaMask, Coinbase Wallet); WalletConnect conecta qualquer carteira, os demais só a do próprio tipo. O cupom fica atrás do link "Tem um código promocional? Aplique aqui". No mobile, como no frame, aparecem os cards "Carteira conectada" (Principal/Reserva) com "Trocar carteira" e a lista de provedores; os dados do colecionador vêm pré-preenchidos num bloco recolhível que abre sozinho se houver erro. No mobile, a lista de itens, o cupom e o detalhamento de valores ficam ocultos, preservando o total e os alertas de preço e estoque antes da compra. "Confirmar compra" abre uma revisão antes do envio, exigida pelo enunciado.
- **Perfil:** dados e senha têm botões separados ("Salvar" e "Alterar senha") para que erros de um não bloqueiem o outro.
- **Carteiras:** o formulário principal serve para cadastrar e editar; "Adicionar" existe na carteira secundária.
- **Mobile:** barra inferior de 95 px com o recorte circular atrás do botão central (máscara CSS), ícones preenchidos em `text-secondary` e o ativo em `highlight`: Início, Lista de interesse, busca (o FAB central do Figma não tinha função definida), Carrinho e Perfil. Os frames mobile usam margem lateral de 28 px no carrinho, pagamento, detalhe e login, e 24 px na home; a barra superior tem botão voltar de 36 px e título de 20 px. No carrinho mobile cada linha mostra o total da linha, como o frame; a lixeira (ausente no desenho) fica na última linha do card, ao lado do preço. O frame de pagamento mobile não tem o botão "Conectar carteira" nem o bloco "Dados do colecionador"; ambos ficam porque o pedido exige carteira conectada e dados válidos, e por isso o "Total" e o "Confirmar compra" ficam no fluxo da página em vez de presos ao rodapé. O botão fechar do login mobile também fica (saída do diálogo por teclado e leitor de tela).
- **Larguras sem frame (320–1279 px):** os frames são só 1440 e 414. De 768 a 1023 px: hero compacto, barra de busca e botão "Filtros" do mobile, detalhe em uma coluna e tabela do carrinho com as colunas do desktop. A partir de 1024 px valem as composições de duas colunas, com trilhas fluidas (`minmax(0,…)` ou frações dos valores do frame) que chegam aos px do Figma em 1440. Ajustes para que nada corte nem quebre onde o frame mais próximo mantém uma linha: o resumo do carrinho fica abaixo dos itens até 1279 px (lado a lado o nome do NFT seria truncado); o resumo do checkout nunca fica abaixo de 400 px; no rodapé, de 1024 a 1279 px, a coluna da newsletter tem 280 px (o placeholder cabe inteiro), os títulos das três colunas e o slogan usam 13 px (uma linha cada, como em 1440), e a última coluna inferior tem no mínimo 232 px com a chip de carteiras sem quebra. Abaixo de 390 px a linha do carrinho mobile empilha nome, preço e seletor (não há largura para seletor e edição lado a lado), o hero usa título de 16 px e mostra o texto inteiro, e o título do detalhe joga a chip de avaliação para a linha seguinte. Em 320 px os nomes dos cards da home e o rótulo "Desconto do lançamento" quebram em duas linhas, porque não cabem em 132 px e 272 px nem com fonte menor; o placeholder do cupom termina em reticências. `tests/e2e/layout.spec.ts` verifica em 768, 900, 1024, 1100, 1280 e 1440 px a ausência de rolagem horizontal, a compra do detalhe sem sobrepor os metadados, o preço do detalhe numa linha, os valores do resumo na linha de base dos rótulos, e os nomes do carrinho, a chip de carteiras e o placeholder da newsletter sem corte nem quebra. O teste de responsividade cobre ainda 320 e 390 px; 320 px representa o reflow de 1280 px a 400% de zoom (WCAG 1.4.10).
- **Resumo de valores:** o frame mostra o desconto zerado como "(-) 00.00", sem "ETH", e casas decimais diferentes por linha (26.83 / 0.016 / 26.846); é texto provisório do design. Todas as linhas do resumo (carrinho, checkout e recibo) usam "ETH" e o mesmo número de casas, o mínimo que mostra todos os valores exatamente (`decimalsFor` + `formatEth` em `src/lib/eth.ts`): desconto zero aparece como "(-) 0.000 ETH" quando a taxa tem três casas. Rótulos e valores ficam na mesma linha de base, e não há divisória acima do total, como no frame.
- **Seletor de quantidade:** um único `QuantityStepper` com os botões em pílula do Figma (33×49,5 px no detalhe desktop, 18×26 px no carrinho e no mobile). A pílula pequena tem área de toque ampliada para 26×26 px (WCAG 2.5.8). No carrinho mobile o mesmo componente vira círculo de 24 px, como nesse frame, e no detalhe mobile a pílula tem 20×30 px. O botão de diminuir fica desabilitado (opacidade 40%) com quantidade 1; o frame desenha os dois botões ativos.
- **Recibo:** a data segue o formato do frame ("29 Jul, 2026") com o mês abreviado em português ("25 Nov, 2026").
- **Alvos de toque:** os pontos do carrossel têm 24 px de área clicável (o desenho tem 8 px com 13 px entre centros) para cumprir o critério de tamanho de alvo, e os inativos ficam com 40% de opacidade no mobile para indicar o slide atual (o frame desenha os três iguais).
- **Estados sem desenho:** esqueletos com o formato do card de cada breakpoint, vazio, erro, foco (`outline` em `--ring`), hover, desabilitado e esgotado usam só os tokens de `src/index.css`. Os rádios do pagamento mobile são desenhados com `border-input` e preenchimento `primary`, em vez do rádio nativo cinza. O gradiente do hero mobile virou o token `--gradient-hero` (utilitário `bg-hero`).
- **Confirmação:** o frame mostra o recibo sem cabeçalho nem rodapé e sem a linha "Subtotal"; o app mantém a página com cabeçalho e rodapé e a linha de subtotal, e alinha o cartão à posição do frame.
- **Telas sem frame mobile** (perfil, carteiras, confirmação) seguem os padrões dos frames mobile existentes.
- **Fora de escopo** (Criadores, Aprenda, editorial, suporte, atividade, ofertas, downloads, newsletter, "Esqueceu a senha?", avaliações): visíveis, porém inertes e marcados "em breve". A newsletter informa que nada foi enviado. "Ver no Etherscan" abre um diálogo que explica que a referência é simulada.

## Segurança

**Modelo de ameaça.** O site é estático (Vercel) e o backend é simulado no próprio navegador: não há servidor com dados de outras pessoas, e "usuários", senhas e pedidos existem só no `localStorage` de quem visita. Os riscos reais são os de qualquer SPA pública: injeção de script (XSS) lendo o token e o estado local, clickjacking, redirecionamento aberto após o login e vazamento de dados entre usuários no mesmo navegador.

**Cabeçalhos** (`vercel.json`, primeira rota `/(.*)` com `continue: true`, então valem para toda resposta: arquivos estáticos, páginas pré-renderizadas e fallback da SPA; o cache imutável de `assets/` e `fonts/` continua na rota seguinte):

- `Content-Security-Policy`:
  - `default-src 'self'`; `object-src 'none'`; `base-uri 'self'`; `form-action 'self'`; `frame-ancestors 'none'` (só funciona como cabeçalho, não em `<meta>`).
  - `script-src 'self'` mais três hashes `sha256`: o script que marca o HTML pré-renderizado como desatualizado, o carregador do bundle e o script de restauração de rolagem que o TanStack Router emite na renderização no servidor. Sem `'unsafe-inline'` nem `'unsafe-eval'`. Como `vercel.json` é estático, esses scripts são idênticos byte a byte em todas as páginas e builds: o que varia (rota, cache desidratado, nomes dos chunks) vai em atributo do `<html>` ou em blocos `<script type="application/json">`, que não executam. `scripts/csp.ts` define os scripts e `scripts/prerender.ts` faz o build falhar se a política não liberar algum script inline das páginas geradas, então os hashes não ficam defasados.
  - O Zod compila validadores com `new Function` e testa isso ao criar o primeiro schema. `src/lib/zod.ts` desliga o JIT (`jitless`) antes de qualquer schema; o Vite resolve todo `import 'zod'` para esse módulo (o alias casa exatamente `zod`, não `zod/v4`, que o próprio wrapper importa). Um `z.config()` no `main.tsx` não bastaria: o bundler avalia os chunks compartilhados que já criam schemas antes do código do módulo de entrada.
  - `style-src 'self' 'unsafe-inline'`: o CSS do Tailwind é arquivo próprio, mas o HTML pré-renderizado tem atributos `style` (Radix Slider), o `<style>` que oculta o HTML desatualizado, e Radix (trava de rolagem dos diálogos) e sonner injetam `<style>` em tempo de execução. Hashes não cobrem atributos nem estilos criados dinamicamente. Injeção de CSS tem impacto bem menor que a de script.
  - `img-src 'self' data: blob:` (avatares ficam como data URL); `font-src 'self'` (Roboto Mono local); `connect-src 'self'` (REST e Socket.IO são interceptados na página pelo MSW; nada sai para outra origem).
- `X-Frame-Options: DENY` (navegadores antigos), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` e `Permissions-Policy` negando recursos não usados (câmera, microfone, geolocalização, pagamento, USB, serial, HID, Bluetooth, MIDI, sensores, captura de tela).

**Ordem das rotas do `vercel.json`:** cabeçalhos (`/(.*)`, `continue: true`), cache imutável de `assets/` e `fonts/` (`continue: true`), reescritas de `/mercado` para `mercado.html` e de `/nft/<id>` para `nft/<id>.html` com `check: true` (só valem se o arquivo existir), `filesystem` e, por último, o fallback da SPA para `index.html`.

`vite preview` não lê `vercel.json`. `tests/e2e/security.spec.ts` aplica os mesmos cabeçalhos a cada documento e falha com qualquer violação de CSP (`securitypolicyviolation` ou console) no início, Mercado, detalhe, catálogo filtrado, login, carrinho e checkout com evento em tempo real; ele também confirma que um script inline injetado não executa. `scripts/csp.test.ts` confere os cabeçalhos e as rotas em `vercel.json`.

**Correções aplicadas:**

- **Redirecionamento após login** (`lib/redirect.ts`): só caminhos que resolvem para a mesma origem. Barras invertidas, espaços e caracteres de controle são rejeitados, porque o navegador trata `\` como `/` e descarta tabulações, transformando `/\evil` ou `/<tab>/evil` em `//evil` (outro host).
- **Rascunho do checkout entre usuários** (`lib/auth-flow.ts`): o login apaga o rascunho e as chaves de idempotência quando o dono do rascunho é outro usuário, inclusive depois de uma sessão expirada (antes, só era apagado se ainda houvesse sessão anterior).

**Riscos aceitos:**

- **Cenário pela URL** (`?scenario=` persiste): é requisito documentado do desafio. Um link pode deixar o backend simulado em modo de falha naquele navegador; o efeito é só sobre dados simulados locais, o painel mostra o cenário ativo e "Restaurar dados do cenário"/`default` desfaz.
- **Token em `localStorage`**: aceitável para a demo, cujo "token" vale só para o backend simulado do próprio navegador. Com uma API real, a recomendação é sessão em cookie `HttpOnly; Secure; SameSite=Lax` (o JS nunca vê o token), proteção CSRF nas mutations e a CSP acima, que reduz o risco de XSS mas não substitui o cookie.

**Dependências:** `pnpm audit` não reporta vulnerabilidades conhecidas.

## Performance (Lighthouse)

Medianas de 3 execuções por página e perfil em [lighthouse/reports/summary.md](./lighthouse/reports/summary.md). Configuração em `lighthouse/lighthouserc.cjs`; relatórios HTML/JSON em `lighthouse/reports/<perfil>/`.

Mediana atual: **100 em Performance, Accessibility, Best Practices e SEO** no início, no Mercado e no detalhe, em mobile e desktop (LCP mobile 1,6 s no início, 1,5 s no Mercado e 1,4 s no detalhe; CLS e TBT zero).

**Como:** o LCP é uma imagem que depende de dados. Enquanto a página dependia do JS para existir, a cadeia HTML → ~300 kB de JS → boot do backend simulado → renderização → imagem deixava o LCP em ~3,6 s no 4G lento simulado.

- **Pré-renderização em build (SSG).** `pnpm build` também compila `src/entry-prerender.tsx` para Node. `scripts/prerender.ts` gera o HTML do início (`dist/index.html`), do Mercado (`dist/mercado.html`) e de cada NFT (`dist/nft/<id>.html`) com o router e os componentes reais. Os dados vêm do seed padrão do backend simulado, consultado pelas funções de domínio e validado pelos mesmos contratos Zod. O cache do TanStack Query vai desidratado no HTML num bloco JSON não executável (`<script type="application/json" id="kurio-state">`), por causa da CSP (ver Segurança).
- **Assumir o HTML sem trocar o que aparece.** O cliente hidrata o cache com os dados marcados como velhos, resolve a rota (`router.load()`) e só então monta com `createRoot` dentro de `startTransition`. A primeira renderização é idêntica ao HTML, e as queries revalidam em segundo plano contra o backend deste navegador. Um teste E2E garante deslocamento de layout ~0 nessa troca.
- **JS fora do caminho do LCP.** Nas páginas pré-renderizadas, o script de entrada e os `modulepreload` são injetados por um carregador inline assim que o navegador reporta o LCP da imagem (`PerformanceObserver`), com teto de 1,5 s, na primeira interação (`pointerdown`, `keydown`, `touchstart`, `focusin`) ou na hora, quando o HTML está marcado como desatualizado. A página já está completa e visível; links funcionam como navegação normal até o app assumir. Na primeira renderização, `RevealPrerender` volta a mostrar o `#root` e marca o documento com `data-app-ready` (é o sinal que os testes esperam). Os dados variáveis de cada página vão em blocos JSON não executáveis, por isso os scripts executáveis são idênticos em todas as páginas. O marcador de posição do preload da arte no template é um token de texto (`%kurio:lcp-preload%`), não um comentário HTML.
- **Depois do carregamento.** `afterLoad` espera o `load`, mais 2 s de folga para a primeira pintura com dados ter acontecido em aparelhos lentos, e um `requestIdleCallback` (teto de 1,5 s). Conexão Socket.IO, toasts e painel de cenários esperam essa promessa, então nunca disputam banda ou CPU com a primeira pintura com dados. Os toasts carregam o `sonner` na primeira notificação.
- **Mocks em paralelo.** Na demo, o backend simulado entra por import dinâmico, que o navegador só descobriria depois de executar o chunk de entrada; o plugin `kurio:preload-mocks` do `vite.config.ts` adiciona `modulepreload` desse chunk e das dependências no HTML, e os dois baixam em paralelo.
- **Sem animação no LCP.** O carrossel do hero só faz crossfade depois que o visitante escolhe um destaque; no mobile, a arte do hero pede o mesmo arquivo do primeiro card do catálogo (a imagem pré-carregada). A ordenação usa `select` nativo: mesmo visual do frame, acessível e sem runtime de popover no caminho crítico do início.
- **Outras URLs.** O fallback de SPA (carrinho, checkout, conta) e o início com filtros na URL recebem esse HTML marcado como desatualizado antes da primeira pintura: o conteúdo pré-renderizado fica oculto e o app carrega na hora, então o catálogo padrão nunca aparece no lugar do pedido.
- **Demais otimizações:**
  - latência padrão de 20 ms (o cenário `slow` mantém 2,5 s);
  - preload responsivo da arte LCP de cada página;
  - imagens AVIF;
  - fonte local com preload só do peso 400;
  - interceptação em página (sem service worker);
  - Socket.IO, toasts, painel de cenários e diálogos carregados depois da primeira pintura;
  - remoção de `tough-cookie` do bundle de mocks: o MSW mantém um cookie jar para que `Set-Cookie` simulados cheguem às próximas requisições, mas esta API não usa cookies (a sessão vai em `Authorization: Bearer`) e a biblioteca real traz a lista pública de sufixos inteira para o caminho crítico da demo. `src/mocks/shims/tough-cookie.ts` (alias no `vite.config.ts`) mantém as chamadas do MSW funcionando como um jar sempre vazio.
- **Detalhes do SSG:** o link de compartilhar do detalhe é absoluto no navegador e relativo no HTML gerado no build (não há `window` ali). O script de pré-renderização encerra o processo explicitamente no fim, porque o cache do TanStack Query mantém timers de coleta ativos. Trocas de rota fazem crossfade com a View Transitions API (`defaultViewTransition`, só quando o caminho muda; filtros, ordenação e paginação atualizam no lugar).
- **Limitação:** o HTML estático reflete o seed padrão. Num navegador com dados simulados alterados (preços mudados por cenário, por exemplo), os valores pré-renderizados aparecem por um instante até a revalidação em segundo plano.

A auditoria usa o mesmo build publicado, com imagens, fontes e funcionalidades completas.

## Testes

- **Playwright** roda contra um build de produção com páginas pré-renderizadas e `VITE_HTTP_TIMEOUT_MS=4000`, para o cenário de timeout ser rápido; os mocks continuam ligados. O número de workers é fixo (4 local, 2 no CI) porque os cenários de tempo real e de timeout são sensíveis a paralelismo pesado.
- **Relógio falso** (`page.clock`) onde o tempo é o assunto do teste: as latências do cenário `jitter` (80 ms a 1,8 s) são liberadas avançando o relógio; a liquidação dos pedidos (2,5 s após a criação) e o timeout HTTP (`fastForward` de 10,5 s, acima dos 4 s do build de E2E e dos 10 s padrão) são pulados em vez de esperados; o TTL de 8 h da sessão é ultrapassado de uma vez. No rollback de favoritos, o relógio só é pausado para observar o estado otimista e depois retomado, porque um timer agendado depois de um `runFor()` fixo nunca dispararia.
- **Seletores** usam os textos pt-BR da interface, como o usuário os vê; títulos de teste, mensagens de asserção e nomes de baselines são em inglês. As baselines visuais (`home`, `detail`, `cart`, `payment`) e os frames do Figma (`desktop-home`, `mobile-cart`…) foram renomeados com `git mv`, sem regerar as imagens.
- **Código sem comentários:** o porquê das decisões vive neste documento. `pnpm lint` roda `scripts/check-no-comments.ts`, que usa o scanner do TypeScript (`typescript/unstable/ast/scanner`, sem pular trivia) para achar comentários em `.ts`/`.tsx`/`.mjs`/`.cjs` sem confundir `//` dentro de strings, URLs, regex, templates ou texto JSX, além de `/* */` em CSS e `<!--` em HTML. Ignora `src/routeTree.gen.ts` (gerado), `node_modules`, `dist*` e relatórios.

## Requisitos do desafio: onde estão e qual teste prova

Cada item do enunciado ([junglegaming/frontend-challenge](https://github.com/junglegaming/frontend-challenge#desafio-frontend--marketplace-de-nfts)), onde é atendido e o que o verifica. Os specs ficam em `tests/e2e/`, os testes unitários ao lado do código.

| Requisito | Onde | Verificação |
|---|---|---|
| Stack obrigatória com uso efetivo | `package.json`; Router em `src/routes`, Query em `src/queries`, Axios em `src/lib/http.ts`, Socket.IO em `src/realtime`, Tailwind em `src/index.css`, shadcn/ui em `src/components/ui`, MSW em `src/mocks` | todos os specs E2E passam por essas camadas; `lighthouse/` |
| Início: destaques, catálogo, busca, filtros, ordenação, navegação ao NFT | `src/features/catalog`, `src/routes/index.tsx`, `src/routes/mercado.tsx` | `catalog.spec.ts`, `marketplace.spec.ts` |
| Estado na URL, filtros combináveis, paginação reinicia, histórico | `validateSearch` das rotas `src/routes/index.tsx` e `src/routes/mercado.tsx` com o esquema de `src/features/catalog/search.ts` | `catalog.spec.ts` (filtros combinados, histórico, paginação reinicia) |
| Resultado vazio, falha e respostas fora de ordem | chaves de query por parâmetros + `AbortSignal`, cenários `empty-catalog`, `http-500`, `flaky-catalog`, `jitter` | `catalog.spec.ts` (busca vazia, fora de ordem), `loading.spec.ts` |
| Detalhe: acesso direto, inexistente, edição esgotada, limite de quantidade | `src/features/nft/DetailPage.tsx` | `nft-detail.spec.ts`, `prerender.spec.ts` |
| Favoritos persistentes com atualização otimista e rollback | `src/queries/favorites.ts` | `favorites.spec.ts` |
| Carrinho: quantidades, remoção, cupom, refresh, itens do visitante ao autenticar | `src/features/cart`, `src/mocks/domain/cart.ts` | `cart.spec.ts` |
| ETH como string decimal com precisão | `src/lib/eth.ts`, contratos Zod | `src/lib/eth.test.ts` |
| Pagamento: validação, revisão, carteira e rede, conexão, recusa e desconexão | `src/features/checkout/CheckoutPage.tsx`, `ReviewDialog.tsx` | `wallet.spec.ts`, `purchase.spec.ts`, `auth.spec.ts` (dados mantidos após expirar) |
| Revalidação de cotação e nova confirmação | quote com versão, 409 `QUOTE_STALE` / `AVAILABILITY_CONFLICT` | `realtime.spec.ts` (cotação desatualizada, preço alterado no envio, edição esgotada no envio) |
| Sem pedido duplicado (cliques repetidos, timeout) e idempotência | `Idempotency-Key` por payload, trava do envio | `purchase-failures.spec.ts` |
| Pedido pendente, confirmado e recusado, recuperação após refresh ou reconexão | `src/features/checkout/OrderPage.tsx`, `order.updated` | `purchase-failures.spec.ts`, `realtime.spec.ts` (desconexão com pedido pendente) |
| Recibo só para pedido confirmado, snapshot imutável, remove só o comprado | `src/mocks/domain/orders.ts` | `purchase.spec.ts`, `purchase-failures.spec.ts` (pagamento recusado mantém o carrinho) |
| Cadastro, login, logout, sessão recuperável, expiração na navegação e no checkout | `src/lib/session-store.ts`, `src/lib/auth-flow.ts`, `requireAuth` | `auth.spec.ts`, `src/lib/auth-flow.test.ts`, `src/lib/redirect.test.ts` |
| Logout e troca de usuário limpam cache privado e subscriptions | cache em `['private', userId]`, socket recriado por sessão | `auth.spec.ts` (troca de usuário), `realtime.spec.ts` (eventos da sessão anterior não chegam ao próximo usuário) |
| Perfil, avatar, senha e carteiras com erros da API; senhas sem texto claro | `src/features/account`, PBKDF2 em `src/mocks/db/state.ts` | `account.spec.ts` |
| Contratos tipados entre transporte, estado e UI | `src/contracts` (Zod) validando cada resposta em `src/api` | `pnpm typecheck`, `src/lib/api-error.test.ts` |
| Rotas inexistentes e acesso direto a qualquer tela | `defaultNotFoundComponent` em `src/router.tsx` (`src/components/layout/NotFound.tsx`), rotas do `vercel.json` | `nft-detail.spec.ts` (rota inexistente), `marketplace.spec.ts` (acesso direto e refresh) |
| Contratos REST e erros (validação, sessão, permissão, inexistente, conflito, transitório) | seção "Contratos REST" acima | `src/lib/api-error.test.ts`, specs de fluxo |
| MSW na camada de rede, cenários configuráveis e reproduzíveis, reset | `src/mocks`, painel de cenários, `window.__kurio` | `loading.spec.ts`, `purchase-failures.spec.ts`, `src/mocks/db/seed.test.ts` |
| Socket.IO via `@mswjs/socket.io-binding` e `socket.io-client` | `src/mocks/socket.ts`, `src/realtime/RealtimeProvider.tsx` | `realtime.spec.ts` |
| Eventos com identidade e versão, duplicatas e antigos ignorados, reconciliação | `src/realtime/ledger.ts` | `src/realtime/ledger.test.ts`, `realtime.spec.ts` (eventos duplicados ou antigos) |
| Cenário carrinho → mudança de preço → aviso → checkout bloqueado | `CartPage.tsx`, `CheckoutPage.tsx` | `realtime.spec.ts` (mudança de preço no carrinho, cotação desatualizada) |
| Fidelidade ao Figma, desktop, tablet e mobile | seção "Fidelidade ao Figma" acima | `visual.spec.ts`, `layout.spec.ts`, `responsive.spec.ts` (320, 390, 768, 1440), `pnpm figma:compare`, `pnpm figma:geometry` |
| Skeletons com shimmer, sem deslocamento, movimento reduzido | `src/components/ui/skeleton.tsx`, `src/index.css` | `loading.spec.ts` (skeletons, movimento reduzido), CLS 0 no Lighthouse |
| Teclado, foco, diálogos, labels, erros associados, feedback acessível | `src/components/layout/LiveRegion.tsx`, shadcn/Radix | `a11y.spec.ts` (axe, foco, diálogo, erros), live region em `realtime.spec.ts` |
| Testes isolados, relógio e eventos controlados, relatório HTML e traces | `playwright.config.ts`, `tests/e2e/fixtures.ts` | `playwright-report/` versionado; traces em `test-results/` nas falhas |
| Lighthouse: 3 execuções, mediana, HTML/JSON, LCP/CLS/TBT | `lighthouse/` | `lighthouse/reports/summary.md` (100 em todas as categorias) |
| Deploy público com mocks, tempo real, acesso direto e refresh | `vercel.json`, `scripts/prerender.ts` | `PLAYWRIGHT_BASE_URL=<url> pnpm test:e2e`, `security.spec.ts` |
| README e ARCHITECTURE com setup, cenários, contratos, cache, sessão, desvios | `README.md`, este documento | — |

## Limitações conhecidas

- Os dados simulados são por navegador (`localStorage`); não há sincronização entre dispositivos.
- Tempo real entre abas não é propagado (cada aba tem o próprio servidor simulado).
- Uploads de avatar ficam como data URL (até 1 MB) no armazenamento local.
- A regressão visual depende do renderizador do Chromium; baselines geradas em macOS podem precisar de `pnpm test:e2e:update` em outro sistema.
