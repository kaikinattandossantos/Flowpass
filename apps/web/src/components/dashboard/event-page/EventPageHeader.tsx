import type { ReactNode } from 'react'

interface EventPageHeaderProps {
  title: string
  description: string
  action?: ReactNode
}

export function EventPageHeader({ title, description, action }: EventPageHeaderProps) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-[#0B1F3A]">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-600">{description}</p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
