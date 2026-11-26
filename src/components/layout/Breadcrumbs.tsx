import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

interface Crumb {
  label: string
  to?: '/' | '/mercado' | '/cart'
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const { t } = useTranslation()
  return (
    <nav aria-label={t('layout.breadcrumbs.label')} className="hidden pt-8 text-md leading-4 font-bold md:block">
      <ol className="flex flex-wrap gap-[1ch]">
        {items.map((item, index) => {
          const last = index === items.length - 1
          return (
            <li key={item.label} className="flex gap-[1ch]">
              {item.to && !last ? <Link to={item.to} className="hover:text-highlight">{item.label}</Link> : <span aria-current={last ? 'page' : undefined}>{item.label}</span>}
              {!last && <span aria-hidden="true">/</span>}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
