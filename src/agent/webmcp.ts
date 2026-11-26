import type { QueryClient } from '@tanstack/react-query'
import { z, type ZodType } from 'zod'
import * as cartApi from '@/api/cart'
import { addCartItemInput } from '@/contracts/cart'
import { catalogQuery } from '@/contracts/nft'
import i18n from '@/i18n'
import { errorMessage, isApiError } from '@/lib/api-error'
import { safeRedirect } from '@/lib/redirect'
import { getSession, scopeOf } from '@/lib/session-store'
import { catalogQueryOptions, nftQueryOptions } from '@/queries/catalog'
import { keys } from '@/queries/keys'
import { announce } from '@/realtime/announcer'

type Navigate = (href: string) => Promise<unknown>

const text = (value: unknown): WebMcpToolResult => ({ content: [{ type: 'text', text: JSON.stringify(value) }] })

function tool<T>(name: string, description: string, schema: ZodType<T>, run: (input: T) => Promise<unknown>, readOnly = false): WebMcpTool {
  return {
    name,
    description,
    inputSchema: z.toJSONSchema(schema, { io: 'input' }) as Record<string, unknown>,
    annotations: { readOnlyHint: readOnly },
    execute: async (raw) => {
      const parsed = schema.safeParse(raw ?? {})
      if (!parsed.success) return { ...text({ error: 'INVALID_INPUT', issues: parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`) }), isError: true }
      try {
        return text(await run(parsed.data))
      } catch (error) {
        return { ...text({ error: isApiError(error) ? error.code : 'UNKNOWN', message: errorMessage(error) }), isError: true }
      }
    },
  }
}

export function createWebMcpTools(queryClient: QueryClient, navigate: Navigate): WebMcpTool[] {
  const scope = () => scopeOf(getSession())

  return [
    tool(
      'search_nfts',
      'Search the Kurio NFT catalog. Prices are ETH decimal strings. Returns one page of results (9 per page) with ids for get_nft.',
      catalogQuery,
      async (query) => {
        const page = await queryClient.fetchQuery(catalogQueryOptions(query))
        return {
          page: page.page,
          totalPages: page.totalPages,
          total: page.total,
          items: page.items.map(({ id, name, collection, network, price, totalAvailable }) => ({ id, name, collection, network, price, totalAvailable })),
        }
      },
      true,
    ),
    tool(
      'get_nft',
      'Read one NFT: description, editions with price, availability and per-order limit. Use an edition id with add_to_cart.',
      z.object({ nftId: z.string().min(1) }),
      async ({ nftId }) => {
        const nft = await queryClient.fetchQuery(nftQueryOptions(nftId))
        return {
          id: nft.id,
          name: nft.name,
          network: nft.network,
          url: `/nft/${nft.id}`,
          editions: nft.editions.map(({ id, label, price, available, maxPerOrder }) => ({ id, label, price, available, maxPerOrder })),
        }
      },
      true,
    ),
    tool(
      'add_to_cart',
      'Add an NFT edition to the cart of the current visitor or signed-in user. It does not buy anything: the user reviews and confirms the order in the checkout.',
      addCartItemInput,
      async (input) => {
        const cart = await cartApi.addCartItem(input)
        queryClient.setQueryData(keys.cart(scope()), cart)
        void queryClient.invalidateQueries({ queryKey: ['private', scope(), 'quote'] })
        const line = cart.lines.find((candidate) => candidate.nftId === input.nftId && candidate.editionId === input.editionId)
        if (line) announce(i18n.t('agent.addedToCart', { name: line.name, quantity: line.quantity }))
        return { itemCount: cart.itemCount, lines: cart.lines.map(({ id, nftId, editionId, name, quantity, unitPrice }) => ({ id, nftId, editionId, name, quantity, unitPrice })) }
      },
    ),
    tool(
      'get_cart',
      'Read the cart and its price quote from the API (subtotal, discount, network fee and total, in ETH) on the Ethereum network.',
      z.object({}),
      async () => {
        const cart = await cartApi.fetchCart()
        queryClient.setQueryData(keys.cart(scope()), cart)
        const quote = cart.lines.length ? await cartApi.fetchQuote({ network: 'ethereum' }) : null
        return {
          lines: cart.lines.map(({ nftId, editionId, name, quantity, unitPrice, available }) => ({ nftId, editionId, name, quantity, unitPrice, available })),
          couponCode: cart.couponCode,
          quote: quote && { subtotal: quote.subtotal, discount: quote.discount, networkFee: quote.networkFee, total: quote.total, purchasable: quote.purchasable },
        }
      },
      true,
    ),
    tool(
      'open_page',
      'Open a page of this site in the current tab, for example /cart, /checkout or /nft/emerald-ape-042. Only internal paths are accepted.',
      z.object({ path: z.string().startsWith('/') }),
      async ({ path }) => {
        const href = safeRedirect(path)
        await navigate(href)
        return { opened: href }
      },
    ),
  ]
}

export function registerWebMcpTools(queryClient: QueryClient, navigate: Navigate) {
  const context = navigator.modelContext
  if (!context) return
  for (const definition of createWebMcpTools(queryClient, navigate)) context.registerTool(definition)
}
