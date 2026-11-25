import { Link, type ErrorComponentProps } from '@tanstack/react-router'
import { Button, buttonVariants } from '@/components/ui/button'
import { errorMessage } from '@/lib/api-error'

export function RouteError({ error, reset }: ErrorComponentProps) {
  return (
    <section role="alert" className="mx-auto flex max-w-page flex-col items-center gap-4 px-5 py-24 text-center">
      <h1 className="text-2xl font-bold">Não foi possível carregar esta página</h1>
      <p className="max-w-md text-muted-foreground">{errorMessage(error)}</p>
      <div className="flex gap-3">
        <Button onClick={reset}>Tentar novamente</Button>
        <Link to="/" className={buttonVariants({ variant: 'outline' })}>Voltar ao início</Link>
      </div>
    </section>
  )
}
