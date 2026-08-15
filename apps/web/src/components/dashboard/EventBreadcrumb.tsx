'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { buildEventBreadcrumbs, type BreadcrumbItem } from '@/lib/event-navigation'
import { useEventNav } from './EventNavContext'

interface EventBreadcrumbProps {
  extra?: BreadcrumbItem[]
}

export function EventBreadcrumb({ extra = [] }: EventBreadcrumbProps) {
  const pathname = usePathname()
  const { eventId, event } = useEventNav()

  if (!eventId) return null

  const items = buildEventBreadcrumbs(pathname, eventId, event?.name ?? null, extra)

  return (
    <nav aria-label="Breadcrumb" className="mb-4 text-sm text-gray-500">
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-2">
              {index > 0 && <span className="text-gray-300">/</span>}
              {item.href && !isLast ? (
                <Link href={item.href} className="transition hover:text-[#00C896]">
                  {item.label}
                </Link>
              ) : (
                <span className={isLast ? 'font-medium text-[#0B1F3A]' : undefined}>
                  {item.label}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
