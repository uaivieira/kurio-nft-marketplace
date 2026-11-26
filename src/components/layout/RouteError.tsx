import { Link, type ErrorComponentProps } from '@tanstack/react-router'
import { Button, buttonVariants } from '@/components/ui/button'
import { useTranslation } from 'react-i18next'
import { errorMessage } from '@/lib/api-error'

export function RouteError({ error, reset }: ErrorComponentProps) {
  const { t } = useTranslation()
  return (
    <section role="alert" className="mx-auto flex max-w-page flex-col items-center gap-4 px-5 py-24 text-center">
      <h1 className="text-2xl font-bold">{t('layout.routeError.title')}</h1>
      <p className="max-w-md text-muted-foreground">{errorMessage(error)}</p>
      <div className="flex gap-3">
        <Button onClick={reset}>{t('common.tryAgain')}</Button>
        <Link to="/" className={buttonVariants({ variant: 'outline' })}>{t('layout.notFound.backHome')}</Link>
      </div>
    </section>
  )
}
