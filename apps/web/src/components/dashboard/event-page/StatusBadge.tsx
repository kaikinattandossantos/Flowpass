type StatusBadgeVariant = 'success' | 'warning' | 'neutral' | 'danger'

const VARIANT_CLASSES: Record<StatusBadgeVariant, string> = {
  success: 'bg-green-50 text-green-700 ring-green-100',
  warning: 'bg-amber-50 text-amber-700 ring-amber-100',
  neutral: 'bg-gray-50 text-gray-600 ring-gray-100',
  danger: 'bg-red-50 text-red-700 ring-red-100'
}

interface StatusBadgeProps {
  label: string
  variant?: StatusBadgeVariant
  dot?: boolean
}

export function StatusBadge({ label, variant = 'neutral', dot = false }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${VARIANT_CLASSES[variant]}`}
    >
      {dot && (
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            variant === 'success'
              ? 'bg-green-500'
              : variant === 'danger'
                ? 'bg-red-500'
                : variant === 'warning'
                  ? 'bg-amber-500'
                  : 'bg-gray-400'
          }`}
        />
      )}
      {label}
    </span>
  )
}
