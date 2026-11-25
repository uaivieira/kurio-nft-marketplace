/** Grace period after `load` so the first data-driven paint (the LCP) has happened on slow devices. */
const SETTLE_MS = 2000

/**
 * Resolves after the page has loaded, settled and gone idle. Non-critical work (realtime
 * connection, toasts, the demo panel) waits for it, so it never competes with the first
 * data-driven paint for bandwidth or CPU.
 */
export const afterLoad = new Promise<void>((resolve) => {
  if (typeof window === 'undefined') return resolve()
  const whenIdle = () => ('requestIdleCallback' in window ? window.requestIdleCallback(() => resolve(), { timeout: 1500 }) : resolve())
  const idle = () => setTimeout(whenIdle, SETTLE_MS)
  if (document.readyState === 'complete') idle()
  else window.addEventListener('load', idle, { once: true })
})
