let resolveReady: () => void = () => {}
export const backendReady = new Promise<void>((resolve) => {
  resolveReady = resolve
})
export const markBackendReady = () => resolveReady()

let resolveRealtime: () => void = () => {}
export const realtimeReady = new Promise<void>((resolve) => {
  resolveRealtime = resolve
})
export const markRealtimeReady = () => resolveRealtime()
