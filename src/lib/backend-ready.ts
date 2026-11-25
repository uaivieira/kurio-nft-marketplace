/**
 * Resolves once the network layer can serve requests (immediately with a real backend,
 * after the simulated backend starts in the demo). The UI renders right away; only network
 * calls wait on this, so the shell and LCP image do not queue behind the mock boot.
 */
let resolveReady: () => void = () => {}
export const backendReady = new Promise<void>((resolve) => {
  resolveReady = resolve
})
export const markBackendReady = () => resolveReady()

let resolveRealtime: () => void = () => {}
/** Resolves when the realtime endpoint accepts connections (the simulated one registers after first paint). */
export const realtimeReady = new Promise<void>((resolve) => {
  resolveRealtime = resolve
})
export const markRealtimeReady = () => resolveRealtime()
