import { Link } from '@tanstack/react-router'

interface Crumb {
  label: string
  to?: '/' | '/cart'
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Trilha de navegação" className="hidden pt-5 text-sm font-bold md:block">
      <ol className="flex flex-wrap gap-1">
        {items.map((item, index) => {
          const last = index === items.length - 1
          return (
            <li key={item.label} className="flex gap-1">
              {item.to && !last ? <Link to={item.to} className="hover:text-highlight">{item.label}</Link> : <span aria-current={last ? 'page' : undefined}>{item.label}</span>}
              {!last && <span aria-hidden="true">/</span>}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
