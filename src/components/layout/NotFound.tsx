import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { buttonVariants } from '@/components/ui/button'

export function NotFound({ title, message }: { title?: string; message?: string }) {
  const { t } = useTranslation()
  return (
    <section className="mx-auto flex max-w-page flex-col items-center gap-4 px-5 py-24 text-center" aria-labelledby="not-found-title">
      <p className="text-5xl font-bold text-primary" aria-hidden="true">404</p>
      <h1 id="not-found-title" className="text-2xl font-bold">{title ?? t('layout.notFound.title')}</h1>
      <p className="max-w-md text-muted-foreground">{message ?? t('layout.notFound.message')}</p>
      <Link to="/" className={buttonVariants()}>{t('layout.notFound.backHome')}</Link>
    </section>
  )
}
