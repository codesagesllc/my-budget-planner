'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert/Alert'
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  DollarSign,
  Settings,
  Plus,
  Edit,
  Target,
  Clock,
  Activity
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { budgetTracker, BudgetLimit } from '@/lib/services/budget-tracker'

interface CategoryBudgetTrackerProps {
  userId: string
  className?: string
}

interface CategorySpending {
  category: string
  currentSpending: number
  budgetLimit: number
  percentageUsed: number
  warningThreshold: number
  daysInMonth: number
  daysRemaining: number
  projectedSpending: number
  dailyAverage: number
  status: 'safe' | 'warning' | 'critical' | 'exceeded'
  trend: 'under' | 'on-track' | 'over'
}

export default function CategoryBudgetTracker({ userId, className }: CategoryBudgetTrackerProps) {
  const [categorySpending, setCategorySpending] = useState<CategorySpending[]>([])
  const [budgetLimits, setBudgetLimits] = useState<BudgetLimit[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [flashingCategories, setFlashingCategories] = useState<Set<string>>(new Set())

  const supabase = createClient()

  const calculateCategoryMetrics = async () => {
    try {
      setIsLoading(true)

      const limits = await budgetTracker.getBudgetLimits(userId)
      setBudgetLimits(limits)

      const now = new Date()
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
      const daysRemaining = daysInMonth - now.getDate()

      const categoryMetrics: CategorySpending[] = limits.map(limit => {
        const percentageUsed = limit.percentage_used
        const dailyAverage = limit.current_spending / now.getDate()
        const projectedSpending = dailyAverage * daysInMonth
        const projectedPercentage = (projectedSpending / limit.monthly_limit) * 100

        let status: CategorySpending['status'] = 'safe'
        let trend: CategorySpending['trend'] = 'on-track'

        // Determine status
        if (percentageUsed >= 100) {
          status = 'exceeded'
        } else if (percentageUsed >= 90) {
          status = 'critical'
        } else if (percentageUsed >= (limit.warning_threshold || 80)) {
          status = 'warning'
        }

        // Determine trend based on projected spending
        if (projectedPercentage > 110) {
          trend = 'over'
        } else if (projectedPercentage < 90) {
          trend = 'under'
        }

        return {
          category: limit.category,
          currentSpending: limit.current_spending,
          budgetLimit: limit.monthly_limit,
          percentageUsed,
          warningThreshold: limit.warning_threshold || 80,
          daysInMonth,
          daysRemaining,
          projectedSpending,
          dailyAverage,
          status,
          trend
        }
      })

      // Check for categories that just crossed thresholds (for flashing effect)
      const newFlashing = new Set<string>()
      categoryMetrics.forEach(metric => {
        if (metric.status === 'warning' || metric.status === 'critical') {
          newFlashing.add(metric.category)
        }
      })

      setFlashingCategories(newFlashing)
      setTimeout(() => setFlashingCategories(new Set()), 3000) // Flash for 3 seconds

      setCategorySpending(categoryMetrics)
      setLastUpdate(new Date())
    } catch (error) {
      console.error('Error calculating category metrics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!userId) return

    calculateCategoryMetrics()

    // Set up real-time subscription for transaction changes
    const channel = supabase
      .channel('category-budget-updates')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${userId}` },
        (payload) => {
          console.log('Transaction change detected - updating category budgets')
          calculateCategoryMetrics()
        })
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'budget_limits', filter: `user_id=eq.${userId}` },
        () => {
          console.log('Budget limit change detected - refreshing categories')
          calculateCategoryMetrics()
        })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  const getStatusColor = (status: CategorySpending['status']) => {
    switch (status) {
      case 'exceeded': return 'text-red-600 bg-red-50 border-red-200'
      case 'critical': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      default: return 'text-green-600 bg-green-50 border-green-200'
    }
  }

  const getProgressColor = (status: CategorySpending['status']) => {
    switch (status) {
      case 'exceeded': return 'bg-red-500'
      case 'critical': return 'bg-orange-500'
      case 'warning': return 'bg-yellow-500'
      default: return 'bg-green-500'
    }
  }

  const getTrendIcon = (trend: CategorySpending['trend']) => {
    switch (trend) {
      case 'over': return <TrendingUp className="h-4 w-4 text-red-500" />
      case 'under': return <TrendingDown className="h-4 w-4 text-green-500" />
      default: return <Activity className="h-4 w-4 text-blue-500" />
    }
  }

  const getStatusMessage = (metric: CategorySpending) => {
    if (metric.status === 'exceeded') {
      return `Budget exceeded! You've spent $${metric.currentSpending.toFixed(2)} of your $${metric.budgetLimit.toFixed(2)} ${metric.category} budget.`
    }
    if (metric.status === 'critical') {
      return `Critical: ${metric.percentageUsed.toFixed(1)}% of ${metric.category} budget used. Only $${(metric.budgetLimit - metric.currentSpending).toFixed(2)} remaining.`
    }
    if (metric.status === 'warning') {
      return `Warning: ${metric.percentageUsed.toFixed(1)}% of ${metric.category} budget used. $${(metric.budgetLimit - metric.currentSpending).toFixed(2)} remaining for ${metric.daysRemaining} days.`
    }
    return `${metric.category} budget is on track. ${metric.percentageUsed.toFixed(1)}% used with ${metric.daysRemaining} days remaining.`
  }

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Target className="h-5 w-5 text-blue-500" />
          Category Budget Tracking
        </h3>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-1" />
          Manage Budgets
        </Button>
      </div>

      {categorySpending.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <DollarSign className="h-12 w-12 text-black dark:text-white mx-auto mb-4" />
            <h4 className="text-lg font-medium text-black dark:text-white mb-2">No Budget Limits Set</h4>
            <p className="text-black dark:text-white mb-4">
              Set category budget limits to track your spending and get real-time alerts.
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-1" />
              Set Up Budgets
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {categorySpending.map(metric => (
            <Card
              key={metric.category}
              className={`transition-all duration-300 ${
                flashingCategories.has(metric.category) ? 'animate-pulse ring-2 ring-orange-300' : ''
              } ${metric.status !== 'safe' ? 'border-l-4' : ''} ${
                metric.status === 'exceeded' ? 'border-l-red-500' :
                metric.status === 'critical' ? 'border-l-orange-500' :
                metric.status === 'warning' ? 'border-l-yellow-500' : ''
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    {metric.category}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {getTrendIcon(metric.trend)}
                    <span className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(metric.status)}`}>
                      {metric.percentageUsed.toFixed(1)}% used
                    </span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Progress Bar */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>${metric.currentSpending.toFixed(2)} spent</span>
                    <span>${metric.budgetLimit.toFixed(2)} budget</span>
                  </div>
                  <Progress
                    value={Math.min(100, metric.percentageUsed)}
                    className="h-3"
                  />
                </div>

                {/* Status Alert */}
                {metric.status !== 'safe' && (
                  <Alert variant={metric.status === 'exceeded' ? 'destructive' : 'warning' as any}>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      {getStatusMessage(metric)}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-black dark:text-white">Daily Average:</span>
                      <span className="font-medium">${metric.dailyAverage.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black dark:text-white">Projected Total:</span>
                      <span className={`font-medium ${
                        metric.projectedSpending > metric.budgetLimit ? 'text-red-600' : 'text-gray-900'
                      }`}>
                        ${metric.projectedSpending.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-black dark:text-white">Days Remaining:</span>
                      <span className="font-medium flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {metric.daysRemaining}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black dark:text-white">Daily Budget Left:</span>
                      <span className="font-medium">
                        ${metric.daysRemaining > 0 ? ((metric.budgetLimit - metric.currentSpending) / metric.daysRemaining).toFixed(2) : '0.00'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Trend Insights */}
                {metric.trend === 'over' && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-700">
                      <TrendingUp className="h-4 w-4 inline mr-1" />
                      <strong>Spending too fast!</strong> At current rate, you'll exceed budget by ${(metric.projectedSpending - metric.budgetLimit).toFixed(2)}.
                    </p>
                  </div>
                )}

                {metric.trend === 'under' && metric.daysRemaining > 5 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm text-green-700">
                      <TrendingDown className="h-4 w-4 inline mr-1" />
                      <strong>Great job!</strong> You're on track to save ${(metric.budgetLimit - metric.projectedSpending).toFixed(2)} this month.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="text-xs text-black dark:text-white text-center">
        Last updated: {lastUpdate.toLocaleTimeString()} • Updates in real-time
      </p>
    </div>
  )
}