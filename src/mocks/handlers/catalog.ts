import { http } from 'msw'
import { fromQueryString } from '@/contracts/catalog-params'
import { db, persist } from '../db/state'
import { getNftDetail, queryCatalog } from '../domain/catalog'
import { MockHttpError, requireUser, route } from '../http'

export const catalogHandlers = [
  http.get('/api/nfts', route({ tag: 'catalog' }, (ctx) => queryCatalog(fromQueryString(ctx.url.searchParams)))),

  http.get('/api/nfts/:id', route<{ id: string }>({}, (ctx) => getNftDetail(ctx.params.id))),

  http.get('/api/favorites', route({ auth: true }, (ctx) => ({ nftIds: db.favorites[requireUser(ctx).id] ?? [] }))),

  http.put('/api/favorites/:nftId', route<{ nftId: string }>({ auth: true, tag: 'favorites-write' }, (ctx) => {
    const user = requireUser(ctx)
    if (!db.nfts[ctx.params.nftId]) throw new MockHttpError('NOT_FOUND', 'NFT not found.', undefined, { reason: 'nft' })
    const list = (db.favorites[user.id] ??= [])
    if (!list.includes(ctx.params.nftId)) list.push(ctx.params.nftId)
    persist()
    return { nftIds: list }
  })),

  http.delete('/api/favorites/:nftId', route<{ nftId: string }>({ auth: true, tag: 'favorites-write' }, (ctx) => {
    const user = requireUser(ctx)
    db.favorites[user.id] = (db.favorites[user.id] ?? []).filter((id) => id !== ctx.params.nftId)
    persist()
    return { nftIds: db.favorites[user.id] }
  })),
]
