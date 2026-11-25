import { useAnnouncement } from '@/realtime/announcer'
import { useRealtimeStatus } from '@/realtime/status'

/** Global polite live region plus a visible banner when the realtime link is down. */
export function LiveRegion() {
  const message = useAnnouncement()
  const status = useRealtimeStatus()
  return (
    <>
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only" data-testid="live-region">
        {message}
      </div>
      {status === 'offline' && (
        <div role="status" data-testid="realtime-offline" className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-sm border border-primary bg-card px-4 py-2 text-xs md:bottom-4">
          Reconectando às atualizações em tempo real…
        </div>
      )}
    </>
  )
}
