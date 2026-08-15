'use client'

import { useEffect, useRef, useState } from 'react'

export interface ActionMenuItem {
  label: string
  onClick: () => void
  tone?: 'default' | 'danger'
  hidden?: boolean
}

interface ActionMenuProps {
  items: ActionMenuItem[]
  align?: 'left' | 'right'
}

export function ActionMenu({ items, align = 'right' }: ActionMenuProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const visibleItems = items.filter((item) => !item.hidden)

  useEffect(() => {
    if (!open) return

    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  if (visibleItems.length === 0) return null

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label="Mais ações"
        onClick={() => setOpen((value) => !value)}
        className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
      >
        •••
      </button>
      {open && (
        <div
          className={`absolute top-full z-20 mt-1 min-w-[180px] rounded-lg border border-gray-100 bg-white py-1 shadow-lg ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {visibleItems.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                setOpen(false)
                item.onClick()
              }}
              className={`block w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                item.tone === 'danger' ? 'text-red-600' : 'text-gray-700'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
