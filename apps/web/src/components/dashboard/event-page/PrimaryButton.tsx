import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
}

export function PrimaryButton({ children, className = '', type = 'button', ...props }: PrimaryButtonProps) {
  return (
    <button
      type={type}
      className={`rounded-lg bg-[#00C896] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#00a876] disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
