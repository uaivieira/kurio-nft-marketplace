const load = () => import('sonner').then((module) => module.toast)

export const notify = {
  success: (message: string) => void load().then((toast) => toast.success(message)),
  error: (message: string) => void load().then((toast) => toast.error(message)),
  info: (message: string) => void load().then((toast) => toast.info(message)),
}
