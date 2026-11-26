const SETTLE_MS = 2000

export const afterLoad = new Promise<void>((resolve) => {
  if (typeof window === 'undefined') return resolve()
  const whenIdle = () => ('requestIdleCallback' in window ? window.requestIdleCallback(() => resolve(), { timeout: 1500 }) : resolve())
  const idle = () => setTimeout(whenIdle, SETTLE_MS)
  if (document.readyState === 'complete') idle()
  else window.addEventListener('load', idle, { once: true })
})
