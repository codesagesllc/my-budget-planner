'use client'

import { useState, useEffect } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert/Alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  DollarSign,
  Target,
  CreditCard,
  X,
  Bell,
  BellOff,
  Zap
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { budgetTracker, BudgetAlert, CashFlowData, SavingsGoal, DebtPayoff } from '@/lib/services/budget-tracker'

interface RealTimeAlertsProps {
  userId: string
  className?: string
}

export default function RealTimeAlerts({ userId, className }: RealTimeAlertsProps) {
  const [alerts, setAlerts] = useState<BudgetAlert[]>([])
  const [cashFlow, setCashFlow] = useState<CashFlowData | null>(null)
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([])
  const [debtPayoffs, setDebtPayoffs] = useState<DebtPayoff[]>([])
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set())
  const [isAlertsEnabled, setIsAlertsEnabled] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  const supabase = createClient()

  const refreshData = async () => {
    try {
      setIsLoading(true)

      // Fetch budget limits and generate alerts
      const budgetLimits = await budgetTracker.getBudgetLimits(userId)
      const newAlerts = budgetTracker.generateBudgetAlerts(budgetLimits)
      setAlerts(newAlerts)

      // Fetch cash flow data
      const cashFlowData = await budgetTracker.calculateCashFlow(userId)
      setCashFlow(cashFlowData)

      // Fetch savings goals
      const goals = await budgetTracker.getSavingsGoals(userId)
      setSavingsGoals(goals)

      // Fetch debt payoffs
      const debts = await budgetTracker.getDebtPayoffs(userId)
      setDebtPayoffs(debts)

      setLastUpdate(new Date())
    } catch (error) {
      console.error('Error refreshing alerts data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!userId) return

    // Initial data load
    refreshData()

    // Set up real-time subscriptions
    const channel = supabase
      .channel('budget-alerts-updates')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${userId}` },
        () => {
          console.log('Transaction change detected - refreshing budget alerts')
          refreshData()
        })
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'budget_limits', filter: `user_id=eq.${userId}` },
        () => {
          console.log('Budget limit change detected - refreshing alerts')
          refreshData()
        })
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'savings_goals', filter: `user_id=eq.${userId}` },
        () => {
          console.log('Savings goal change detected - refreshing progress')
          refreshData()
        })
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'debts', filter: `user_id=eq.${userId}` },
        () => {
          console.log('Debt change detected - refreshing payoff tracker')
          refreshData()
        })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  const dismissAlert = (alertId: string) => {
    setDismissedAlerts(prev => new Set([...prev, alertId]))
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'exceeded': return <AlertTriangle className="h-4 w-4" />
      case 'critical': return <AlertTriangle className="h-4 w-4" />
      case 'warning': return <Bell className="h-4 w-4" />
      default: return <Bell className="h-4 w-4" />
    }
  }

  const getAlertVariant = (type: string) => {
    switch (type) {
      case 'exceeded': return 'destructive'
      case 'critical': return 'warning'
      case 'warning': return 'info'
      default: return 'default'
    }
  }

  const getCashFlowColor = (trend: string) => {
    switch (trend) {
      case 'improving': return 'text-green-600'
      case 'declining': return 'text-red-600'
      default: return 'text-blue-600'
    }
  }

  const getCashFlowIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="h-4 w-4" />
      case 'declining': return <TrendingDown className="h-4 w-4" />
      default: return <DollarSign className="h-4 w-4" />
    }
  }

  const visibleAlerts = alerts.filter(alert => !dismissedAlerts.has(alert.id))

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-16 bg-gray-200 rounded-lg mb-4"></div>
          <div className="h-32 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Alert Toggle */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Zap className="h-5 w-5 text-orange-500" />
          Real-Time Alerts
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsAlertsEnabled(!isAlertsEnabled)}
          className="text-sm"
        >
          {isAlertsEnabled ? (
            <>
              <Bell className="h-4 w-4 mr-1" />
              Enabled
            </>
          ) : (
            <>
              <BellOff className="h-4 w-4 mr-1" />
              Disabled
            </>
          )}
        </Button>
      </div>

      {/* Budget Alerts */}
      {isAlertsEnabled && visibleAlerts.length > 0 && (
        <div className="space-y-2">
          {visibleAlerts.map(alert => (
            <Alert key={alert.id} variant={getAlertVariant(alert.type) as any}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {getAlertIcon(alert.type)}
                  <AlertDescription className="text-sm">
                    {alert.message}
                  </AlertDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => dismissAlert(alert.id)}
                  className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </Alert>
          ))}
        </div>
      )}

      {/* Cash Flow Meter */}
      {cashFlow && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              {getCashFlowIcon(cashFlow.trend)}
              <span className={getCashFlowColor(cashFlow.trend)}>
                Cash Flow Meter
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Income</p>
                <p className="font-semibold text-green-600">
                  ${cashFlow.totalIncome.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Spending</p>
                <p className="font-semibold text-red-600">
                  ${cashFlow.totalSpending.toFixed(2)}
                </p>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Remaining Balance</span>
                <span className={`font-semibold ${cashFlow.remainingBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${cashFlow.remainingBalance.toFixed(2)}
                </span>
              </div>
              <Progress
                value={Math.max(0, Math.min(100, (cashFlow.remainingBalance / cashFlow.totalIncome) * 100))}
                className="h-2"
              />
            </div>

            <div className="text-xs text-gray-600">
              <p>Daily burn rate: ${cashFlow.dailyBurnRate.toFixed(2)}</p>
              {cashFlow.daysUntilEmpty < Infinity && (
                <p>Days until empty: {cashFlow.daysUntilEmpty}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Savings Goals Progress */}
      {savingsGoals.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-600" />
              Savings Goals
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {savingsGoals.map(goal => (
              <div key={goal.id} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{goal.name}</span>
                  <span className={`text-xs ${goal.on_track ? 'text-green-600' : 'text-orange-600'}`}>
                    {goal.on_track ? 'On track' : 'Behind'}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-gray-600">
                  <span>${goal.current_amount.toFixed(2)} / ${goal.target_amount.toFixed(2)}</span>
                  <span>{goal.progress_percentage.toFixed(1)}%</span>
                </div>
                <Progress value={goal.progress_percentage} className="h-2" />
                <p className="text-xs text-gray-600">
                  Need ${goal.monthly_required.toFixed(2)}/month to reach goal
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Debt Payoff Tracker */}
      {debtPayoffs.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-red-600" />
              Debt Payoff Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {debtPayoffs.map(debt => (
              <div key={debt.id} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{debt.creditor_name}</span>
                  <span className="text-xs text-gray-600">
                    {debt.months_remaining} months left
                  </span>
                </div>
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Paid: ${(debt.original_amount - debt.current_balance).toFixed(2)}</span>
                  <span>Remaining: ${debt.current_balance.toFixed(2)}</span>
                </div>
                <Progress value={debt.progress_percentage} className="h-2" />
                <p className="text-xs text-gray-600">
                  {debt.progress_percentage.toFixed(1)}% paid off
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Last Updated */}
      <p className="text-xs text-gray-500 text-center">
        Last updated: {lastUpdate.toLocaleTimeString()}
      </p>
    </div>
  )
}