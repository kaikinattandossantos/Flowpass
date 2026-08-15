import type { ReactNode } from 'react'

interface ResourceCardProps {
  children: ReactNode
}

export function ResourceCard({ children }: ResourceCardProps) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      {children}
    </div>
  )
}
