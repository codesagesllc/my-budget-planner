import { ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'

interface AlertProps {
  children: ReactNode
  variant?: 'success' | 'error' | 'warning' | 'info'
  className?: string
}

export function Alert({ children, variant = 'info', className }: AlertProps) {
  return (
    <div
      className={cn(
        'mb-4 p-3 rounded-md text-sm',
        {
          'bg-green-50 text-green-600': variant === 'success',
          'bg-red-50 text-red-600': variant === 'error',
          'bg-yellow-50 text-yellow-600': variant === 'warning',
          'bg-blue-50 text-blue-600': variant === 'info',
        },
        className
      )}
    >
      {children}
    </div>
  )
}
