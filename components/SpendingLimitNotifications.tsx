'use client'

import { useState, useEffect } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert/Alert'
import {
  AlertTriangle,
  Target,
  TrendingUp,
  X,
  Bell
} from 'lucide-react'
import { budgetTracker } from '@/lib/services/budget-tracker'

interface SpendingLimitNotificationsProps {
  userId: string
  className?: string
}

interface SpendingAlert {
  id: string
  category: string
  percentage: number
  currentSpending: number
  limit: number
  status: 'warning' | 'danger' | 'exceeded'
  message: string
}

export default function SpendingLimitNotifications({ userId, className }: SpendingLimitNotificationsProps) {
  const [alerts, setAlerts] = useState<SpendingAlert[]>([])
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)

  const checkSpendingLimits = async () => {
    try {
      setIsLoading(true)
      const budgetLimits = await budgetTracker.getBudgetLimits(userId)

      const newAlerts: SpendingAlert[] = []

      budgetLimits.forEach(limit => {
        const percentage = limit.percentage_used || 0

        if (percentage >= 100) {
          newAlerts.push({
            id: `${limit.category}-exceeded`,
            category: limit.category,
            percentage,
            currentSpending: limit.current_spending || 0,
            limit: limit.monthly_limit,
            status: 'exceeded',
            message: `You've exceeded your ${limit.category} budget by $${((limit.current_spending || 0) - limit.monthly_limit).toFixed(2)}`
          })
        } else if (percentage >= 90) {
          newAlerts.push({
            id: `${limit.category}-danger`,
            category: limit.category,
            percentage,
            currentSpending: limit.current_spending || 0,
            limit: limit.monthly_limit,
            status: 'danger',
            message: `You're ${percentage.toFixed(1)}% through your ${limit.category} budget. Only $${(limit.monthly_limit - (limit.current_spending || 0)).toFixed(2)} remaining.`
          })
        } else if (percentage >= 75) {
          newAlerts.push({
            id: `${limit.category}-warning`,
            category: limit.category,
            percentage,
            currentSpending: limit.current_spending || 0,
            limit: limit.monthly_limit,
            status: 'warning',
            message: `You've used ${percentage.toFixed(1)}% of your ${limit.category} budget this month.`
          })
        }
      })

      setAlerts(newAlerts)
    } catch (error) {
      console.error('Error checking spending limits:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (userId) {
      checkSpendingLimits()

      // Check every 5 minutes for updates
      const interval = setInterval(checkSpendingLimits, 5 * 60 * 1000)
      return () => clearInterval(interval)
    }
  }, [userId])

  const dismissAlert = (alertId: string) => {
    setDismissedAlerts(prev => new Set([...prev, alertId]))
  }

  const visibleAlerts = alerts.filter(alert => !dismissedAlerts.has(alert.id))

  if (isLoading) {
    return null
  }

  // Show info message if no spending limits are set up yet
  if (visibleAlerts.length === 0) {
    return (
      <div className={`${className}`}>
        <div className="flex items-center gap-2 mb-3">
          <Bell className="h-5 w-5 text-blue-500" />
          <h4 className="font-medium text-gray-900">Budget Alerts</h4>
        </div>
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
          <div className="flex items-start gap-3">
            <Target className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm text-blue-800 font-medium mb-1">
                No budget limits set up yet
              </p>
              <p className="text-sm text-blue-700">
                Create spending limits in the Budget Limits tab to get real-time alerts when you're approaching your monthly budgets.
              </p>
              <button
                onClick={() => {
                  // Navigate to budget limits tab
                  const dashboard = document.querySelector('button[data-tab="budgets"]') as HTMLButtonElement
                  if (dashboard) dashboard.click()
                }}
                className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Set up budget limits →
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const getAlertVariant = (status: SpendingAlert['status']) => {
    switch (status) {
      case 'exceeded': return 'destructive'
      case 'danger': return 'destructive'
      case 'warning': return 'default'
      default: return 'default'
    }
  }

  const getAlertIcon = (status: SpendingAlert['status']) => {
    switch (status) {
      case 'exceeded': return <AlertTriangle className="h-4 w-4" />
      case 'danger': return <AlertTriangle className="h-4 w-4" />
      case 'warning': return <Bell className="h-4 w-4" />
      default: return <Target className="h-4 w-4" />
    }
  }

  const getAlertColors = (status: SpendingAlert['status']) => {
    switch (status) {
      case 'exceeded': return 'border-red-200 bg-red-50'
      case 'danger': return 'border-orange-200 bg-orange-50'
      case 'warning': return 'border-yellow-200 bg-yellow-50'
      default: return 'border-blue-200 bg-blue-50'
    }
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-2">
        <Bell className="h-5 w-5 text-orange-500" />
        <h4 className="font-medium text-gray-900">Budget Alerts</h4>
      </div>

      {visibleAlerts.map(alert => (
        <div
          key={alert.id}
          className={`rounded-lg border p-4 ${getAlertColors(alert.status)} transition-all duration-300`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              {getAlertIcon(alert.status)}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-gray-900 capitalize">
                    {alert.category}
                  </span>
                  <span className={`text-sm px-2 py-1 rounded-full ${
                    alert.status === 'exceeded' ? 'bg-red-100 text-red-700' :
                    alert.status === 'danger' ? 'bg-orange-100 text-orange-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {alert.percentage.toFixed(1)}%
                  </span>
                </div>
                <p className="text-sm text-gray-700">
                  {alert.message}
                </p>
                <div className="mt-2 flex items-center gap-4 text-xs text-gray-600">
                  <span>Spent: ${alert.currentSpending.toFixed(2)}</span>
                  <span>Budget: ${alert.limit.toFixed(2)}</span>
                  <button
                    onClick={() => window.location.hash = '#budgets'}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    View Details →
                  </button>
                </div>
              </div>
            </div>
            <button
              onClick={() => dismissAlert(alert.id)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}

      {visibleAlerts.length > 0 && (
        <div className="text-center">
          <button
            onClick={() => setDismissedAlerts(new Set(alerts.map(a => a.id)))}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Dismiss all alerts
          </button>
        </div>
      )}
    </div>
  )
}