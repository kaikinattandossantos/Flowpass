import type { ReactNode } from 'react'
import { EventBreadcrumb } from '@/components/dashboard/EventBreadcrumb'
import { EventPageHeader } from './EventPageHeader'
import { PageSkeleton } from './PageSkeleton'

interface EventPageLayoutProps {
  title: string
  description: string
  action?: ReactNode
  loading?: boolean
  children: ReactNode
}

export function EventPageLayout({
  title,
  description,
  action,
  loading = false,
  children
}: EventPageLayoutProps) {
  return (
    <div className="mx-auto max-w-5xl">
      <EventBreadcrumb />
      {loading ? (
        <PageSkeleton />
      ) : (
        <>
          <EventPageHeader title={title} description={description} action={action} />
          {children}
        </>
      )}
    </div>
  )
}
