import { nftUpdatedEvent } from '@/contracts/events'
import { db, eventId, persist, publish } from '../db/state'
import { MockHttpError } from '../http'

interface EditionPatch {
  price?: string
  available?: number
}

export function updateEdition(nftId: string, editionId: string, patch: EditionPatch) {
  const nft = db.nfts[nftId]
  const edition = nft?.editions.find((candidate) => candidate.id === editionId)
  if (!nft || !edition) throw new MockHttpError('NOT_FOUND', 'NFT or edition not found.', undefined, { reason: 'nftOrEdition' })
  if (patch.price !== undefined) edition.price = patch.price
  if (patch.available !== undefined) edition.available = Math.max(0, patch.available)
  nft.version += 1
  persist()

  const inStock = nft.editions.filter((candidate) => candidate.available > 0)
  const pool = inStock.length ? inStock : nft.editions
  const price = pool.map((candidate) => candidate.price).reduce((min, value) => (Number(value) < Number(min) ? value : min))

  const event = nftUpdatedEvent.parse({
    eventId: eventId(),
    type: 'nft.updated',
    resource: { kind: 'nft', id: nft.id },
    version: nft.version,
    occurredAt: new Date().toISOString(),
    data: {
      nftId: nft.id,
      price,
      totalAvailable: nft.editions.reduce((sum, candidate) => sum + candidate.available, 0),
      editions: nft.editions.map((candidate) => ({ id: candidate.id, price: candidate.price, available: candidate.available })),
    },
  })
  publish(event)
  return event
}
