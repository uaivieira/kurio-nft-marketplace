import { nftUpdatedEvent } from '@/contracts/events'
import { db, eventId, persist, resetDb } from './db/state'
import { updateEdition } from './domain/inventory'
import { resolveOrder } from './domain/orders'
import { isScenarioId, resetScenarioCounters, runtime, setScenario, SCENARIOS, type ScenarioId } from './scenarios'

export interface KurioControl {
  scenarios: typeof SCENARIOS
  getScenario: () => ScenarioId
  setScenario: (id: string) => void
  reset: () => Promise<void>
  updateEdition: (nftId: string, editionId: string, patch: { price?: string; available?: number }) => void
  emitDuplicate: () => Promise<boolean>
  emitStale: (nftId: string) => Promise<void>
  dropSockets: () => Promise<void>
  setSocketOnline: (online: boolean) => Promise<void>
  connectedSockets: () => Promise<number>
  resolveOrder: (orderId: string, outcome: 'confirmed' | 'rejected') => void
  pendingOrderIds: () => string[]
  expireSessions: () => void
}

const socket = () => import('./socket')

export function createControl(): KurioControl {
  return {
    scenarios: SCENARIOS,
    getScenario: () => runtime.scenario,
    setScenario: (id) => {
      if (!isScenarioId(id)) throw new Error(`Unknown scenario "${id}"`)
      setScenario(id)
    },
    reset: async () => {
      await resetDb()
      resetScenarioCounters()
    },
    updateEdition: (nftId, editionId, patch) => {
      updateEdition(nftId, editionId, patch)
    },
    emitDuplicate: async () => {
      const { broadcast, lastEvent } = await socket()
      const event = lastEvent('nft.updated')
      if (!event) return false
      broadcast(event)
      return true
    },
    emitStale: async (nftId) => {
      const { broadcast } = await socket()
      const nft = db.nfts[nftId]
      if (!nft) throw new Error(`Unknown NFT "${nftId}"`)
      broadcast(
        nftUpdatedEvent.parse({
          eventId: eventId(),
          type: 'nft.updated',
          resource: { kind: 'nft', id: nftId },
          version: Math.max(0, nft.version - 1),
          occurredAt: new Date(Date.now() - 60_000).toISOString(),
          data: {
            nftId,
            price: '9.99',
            totalAvailable: 0,
            editions: nft.editions.map((edition) => ({ id: edition.id, price: '9.99', available: 0 })),
          },
        }),
      )
    },
    dropSockets: async () => (await socket()).dropSockets(),
    setSocketOnline: async (online) => (await socket()).setSocketOnline(online),
    connectedSockets: async () => (await socket()).connectedSocketCount(),
    resolveOrder: (orderId, outcome) => resolveOrder(orderId, outcome),
    pendingOrderIds: () => Object.values(db.orders).filter((order) => order.status === 'pending').map((order) => order.id),
    expireSessions: () => {
      for (const token of Object.keys(db.sessions)) delete db.sessions[token]
      persist()
    },
  }
}
