import type { RealtimeEvent } from '@/contracts/events'

const MAX_SEEN = 500

export type Verdict = 'apply' | 'duplicate' | 'stale'

/**
 * Decides whether an incoming event may change state. Delivery is at-least-once and
 * unordered, so the client drops events it already handled (same eventId) and events
 * whose version is not newer than the latest version seen for that resource.
 */
export class EventLedger {
  private readonly seen = new Set<string>()
  private readonly versions = new Map<string, number>()

  judge(event: RealtimeEvent): Verdict {
    if (this.seen.has(event.eventId)) return 'duplicate'
    this.seen.add(event.eventId)
    if (this.seen.size > MAX_SEEN) this.seen.delete(this.seen.values().next().value as string)

    const key = `${event.resource.kind}:${event.resource.id}`
    const latest = this.versions.get(key) ?? -1
    if (event.version <= latest) return 'stale'
    this.versions.set(key, event.version)
    return 'apply'
  }

  /** REST is authoritative: after a refetch, versions at or below it can never apply. */
  observe(kind: string, id: string, version: number) {
    const key = `${kind}:${id}`
    if (version > (this.versions.get(key) ?? -1)) this.versions.set(key, version)
  }

  clear() {
    this.seen.clear()
    this.versions.clear()
  }
}
