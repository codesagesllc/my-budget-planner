'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert/Alert'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  AlertTriangle,
  Target,
  Activity,
  Zap,
  Calendar,
  BarChart3
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { budgetTracker, CashFlowData } from '@/lib/services/budget-tracker'

interface CashFlowMeterProps {
  userId: string
  className?: string
}

interface CashFlowMetrics {
  current: CashFlowData
  velocity: number // Rate of change
  burnRateChange: number // Change in daily burn rate
  projectedEndOfMonth: number
  healthScore: number // 0-100 score
  criticalAlerts: string[]
  recommendations: string[]
}

export default function CashFlowMeter({ userId, className }: CashFlowMeterProps) {
  const [cashFlowMetrics, setCashFlowMetrics] = useState<CashFlowMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [isFlashing, setIsFlashing] = useState(false)

  const supabase = createClient()

  const calculateAdvancedMetrics = async () => {
    try {
      setIsLoading(true)

      const currentCashFlow = await budgetTracker.calculateCashFlow(userId)

      // Calculate velocity and burn rate changes (simplified for demo)
      const velocity = currentCashFlow.remainingBalance / (currentCashFlow.totalIncome || 1)
      const burnRateChange = 0 // Would need historical data to calculate properly

      // Project end of month balance
      const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
      const daysRemaining = daysInMonth - new Date().getDate()
      const projectedEndOfMonth = currentCashFlow.remainingBalance - (currentCashFlow.dailyBurnRate * daysRemaining)

      // Calculate health score (0-100)
      let healthScore = 100
      const balanceRatio = currentCashFlow.remainingBalance / currentCashFlow.totalIncome
      if (balanceRatio < 0) healthScore = 0
      else if (balanceRatio < 0.1) healthScore = 20
      else if (balanceRatio < 0.2) healthScore = 50
      else if (balanceRatio < 0.3) healthScore = 75

      // Generate alerts and recommendations
      const criticalAlerts: string[] = []
      const recommendations: string[] = []

      if (currentCashFlow.remainingBalance < 0) {
        criticalAlerts.push('⚠️ NEGATIVE BALANCE: You have overspent this month!')
      }
      if (currentCashFlow.daysUntilEmpty < 7 && currentCashFlow.daysUntilEmpty > 0) {
        criticalAlerts.push(`🚨 CASH FLOW ALERT: Only ${currentCashFlow.daysUntilEmpty} days of spending left!`)
      }
      if (projectedEndOfMonth < 0) {
        criticalAlerts.push(`📉 PROJECTION ALERT: You'll be $${Math.abs(projectedEndOfMonth).toFixed(2)} over budget by month end`)
      }

      if (currentCashFlow.dailyBurnRate > currentCashFlow.remainingBalance / 10) {
        recommendations.push('💡 Consider reducing daily spending by 20% to improve cash flow')
      }
      if (currentCashFlow.trend === 'declining') {
        recommendations.push('📊 Review recent transactions to identify spending patterns')
      }
      if (healthScore < 50) {
        recommendations.push('🎯 Set up automated savings to build a buffer')
      }

      // Flash alert for critical situations
      if (criticalAlerts.length > 0) {
        setIsFlashing(true)
        setTimeout(() => setIsFlashing(false), 2000)
      }

      setCashFlowMetrics({
        current: currentCashFlow,
        velocity,
        burnRateChange,
        projectedEndOfMonth,
        healthScore,
        criticalAlerts,
        recommendations
      })

      setLastUpdate(new Date())
    } catch (error) {
      console.error('Error calculating cash flow metrics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!userId) return

    calculateAdvancedMetrics()

    // Set up real-time subscription
    const channel = supabase
      .channel('cash-flow-updates')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${userId}` },
        () => {
          console.log('Transaction change detected - updating cash flow')
          calculateAdvancedMetrics()
        })
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'income_sources', filter: `user_id=eq.${userId}` },
        () => {
          console.log('Income source change detected - updating cash flow')
          calculateAdvancedMetrics()
        })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  const getHealthColor = (score: number) => {
    if (score >= 75) return 'text-green-600 bg-green-50'
    if (score >= 50) return 'text-yellow-600 bg-yellow-50'
    if (score >= 25) return 'text-orange-600 bg-orange-50'
    return 'text-red-600 bg-red-50'
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="h-5 w-5 text-green-600" />
      case 'declining': return <TrendingDown className="h-5 w-5 text-red-600" />
      default: return <Activity className="h-5 w-5 text-blue-600" />
    }
  }

  const getHealthIcon = (score: number) => {
    if (score >= 75) return <Target className="h-4 w-4 text-green-600" />
    if (score >= 50) return <BarChart3 className="h-4 w-4 text-yellow-600" />
    return <AlertTriangle className="h-4 w-4 text-red-600" />
  }

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-48 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    )
  }

  if (!cashFlowMetrics) {
    return (
      <Card className={className}>
        <CardContent className="text-center py-8">
          <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Unable to load cash flow data</p>
        </CardContent>
      </Card>
    )
  }

  const { current, healthScore, projectedEndOfMonth, criticalAlerts, recommendations } = cashFlowMetrics

  return (
    <div className={`space-y-4 ${className}`}>
      <Card className={`transition-all duration-300 ${isFlashing ? 'animate-pulse ring-2 ring-red-300' : ''}`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getTrendIcon(current.trend)}
              <span>Cash Flow Meter</span>
              <div className="flex items-center gap-1">
                <Zap className="h-4 w-4 text-orange-500" />
                <span className="text-xs text-gray-500">Live</span>
              </div>
            </div>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${getHealthColor(healthScore)}`}>
              {getHealthIcon(healthScore)}
              Health: {healthScore}/100
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Critical Alerts */}
          {criticalAlerts.length > 0 && (
            <div className="space-y-2">
              {criticalAlerts.map((alert, index) => (
                <Alert key={index} variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    {alert}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          )}

          {/* Main Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600 mb-1">Monthly Income</p>
                <p className="text-lg font-semibold text-green-600">
                  ${current.totalIncome.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Spending</p>
                <p className="text-lg font-semibold text-red-600">
                  ${current.totalSpending.toFixed(2)}
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600 mb-1">Current Balance</p>
                <p className={`text-lg font-semibold ${current.remainingBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${current.remainingBalance.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Daily Burn Rate</p>
                <p className="text-lg font-semibold text-orange-600">
                  ${current.dailyBurnRate.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Progress Visualization */}
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Cash Flow Health</span>
                <span className="font-medium">{healthScore}%</span>
              </div>
              <Progress value={healthScore} className="h-3" />
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Budget Utilization</span>
                <span className="font-medium">
                  {((current.totalSpending / current.totalIncome) * 100).toFixed(1)}%
                </span>
              </div>
              <Progress
                value={Math.min(100, (current.totalSpending / current.totalIncome) * 100)}
                className="h-3"
              />
            </div>
          </div>

          {/* Projections */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Month-End Projection
            </h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-600">Projected Balance:</p>
                <p className={`font-semibold ${projectedEndOfMonth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${projectedEndOfMonth.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Days Until Empty:</p>
                <p className="font-semibold text-orange-600">
                  {current.daysUntilEmpty === Infinity ? '∞' : current.daysUntilEmpty}
                </p>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-3 space-y-2">
              <h4 className="font-medium text-sm text-blue-800">💡 Recommendations</h4>
              <ul className="text-xs text-blue-700 space-y-1">
                {recommendations.map((rec, index) => (
                  <li key={index}>• {rec}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Velocity Indicators */}
          <div className="flex justify-between items-center text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3" />
              <span>Last updated: {lastUpdate.toLocaleTimeString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <Activity className="h-3 w-3" />
              <span>Real-time tracking</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}