// components/ui/usage-meter.tsx
'use client'

import { cn } from '@/lib/utils'
import { AlertCircle, CheckCircle, TrendingUp } from 'lucide-react'

interface UsageMeterProps {
  used: number
  limit: number | boolean
  label: string
  className?: string
  showNumbers?: boolean
  compact?: boolean
}

export function UsageMeter({
  used,
  limit,
  label,
  className,
  showNumbers = true,
  compact = false,
}: UsageMeterProps) {
  // Handle boolean limits (feature on/off)
  if (typeof limit === 'boolean') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        {limit ? (
          <CheckCircle className="h-4 w-4 text-green-500" />
        ) : (
          <AlertCircle className="h-4 w-4 text-black dark:text-white" />
        )}
        <span className="text-sm text-black dark:text-white">{label}</span>
      </div>
    )
  }
  
  // Handle unlimited (-1)
  if (limit === -1) {
    return (
      <div className={cn('space-y-1', className)}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{label}</span>
          <div className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-green-500" />
            <span className="text-sm text-green-600 font-medium">Unlimited</span>
          </div>
        </div>
      </div>
    )
  }
  
  // Calculate percentage
  const percentage = Math.min(100, (used / limit) * 100)
  const remaining = Math.max(0, limit - used)
  const isNearLimit = percentage >= 80
  const isAtLimit = percentage >= 100
  
  // Determine color based on usage
  const getColor = () => {
    if (isAtLimit) return 'bg-red-500'
    if (isNearLimit) return 'bg-orange-500'
    if (percentage >= 50) return 'bg-yellow-500'
    return 'bg-green-500'
  }
  
  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className="flex-1">
          <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className={cn('h-full transition-all duration-300', getColor())}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
        {showNumbers && (
          <span className="text-xs text-black dark:text-white whitespace-nowrap">
            {used}/{limit}
          </span>
        )}
      </div>
    )
  }
  
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        {showNumbers && (
          <span className="text-sm text-black dark:text-white">
            {used} / {limit} used
          </span>
        )}
      </div>
      
      <div className="relative">
        <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full transition-all duration-300',
              getColor()
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
      
      {isNearLimit && !isAtLimit && (
        <p className="text-xs text-orange-600 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {remaining} remaining this month
        </p>
      )}
      
      {isAtLimit && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Limit reached - Upgrade to continue
        </p>
      )}
    </div>
  )
}