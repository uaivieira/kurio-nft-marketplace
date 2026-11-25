import { describe, expect, it } from 'vitest'
import type { RealtimeEvent } from '@/contracts/events'
import { EventLedger } from './ledger'

const nft = (eventId: string, version: number): RealtimeEvent => ({
  eventId,
  type: 'nft.updated',
  resource: { kind: 'nft', id: 'a' },
  version,
  occurredAt: new Date().toISOString(),
  data: { nftId: 'a', price: '1.00', totalAvailable: 1, editions: [] },
})

describe('EventLedger', () => {
  it('applies newer versions once', () => {
    const ledger = new EventLedger()
    expect(ledger.judge(nft('e1', 2))).toBe('apply')
    expect(ledger.judge(nft('e1', 2))).toBe('duplicate')
    expect(ledger.judge(nft('e2', 3))).toBe('apply')
  })

  it('drops older versions even with new event ids', () => {
    const ledger = new EventLedger()
    ledger.judge(nft('e1', 5))
    expect(ledger.judge(nft('e2', 4))).toBe('stale')
    expect(ledger.judge(nft('e3', 5))).toBe('stale')
  })

  it('treats a REST refetch as authoritative', () => {
    const ledger = new EventLedger()
    ledger.observe('nft', 'a', 7)
    expect(ledger.judge(nft('e1', 6))).toBe('stale')
    expect(ledger.judge(nft('e2', 8))).toBe('apply')
  })
})
