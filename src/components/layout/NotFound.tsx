import { Link } from '@tanstack/react-router'
import { buttonVariants } from '@/components/ui/button'

export function NotFound({ title = 'Página não encontrada', message = 'O endereço que você abriu não existe ou foi movido.' }: { title?: string; message?: string }) {
  return (
    <section className="mx-auto flex max-w-page flex-col items-center gap-4 px-5 py-24 text-center" aria-labelledby="not-found-title">
      <p className="text-5xl font-bold text-primary" aria-hidden="true">404</p>
      <h1 id="not-found-title" className="text-2xl font-bold">{title}</h1>
      <p className="max-w-md text-muted-foreground">{message}</p>
      <Link to="/" className={buttonVariants()}>Voltar ao início</Link>
    </section>
  )
}
