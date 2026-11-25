/**
 * Toast notifications without putting the toast library on the first-paint path: the module is
 * fetched on the first notification (by then the lazily mounted <Toaster /> is usually loaded too).
 * Every message is also announced through the live region by the callers, so nothing is lost if a
 * toast fires before the Toaster mounts.
 */
const load = () => import('sonner').then((module) => module.toast)

export const notify = {
  success: (message: string) => void load().then((toast) => toast.success(message)),
  error: (message: string) => void load().then((toast) => toast.error(message)),
  info: (message: string) => void load().then((toast) => toast.info(message)),
}
