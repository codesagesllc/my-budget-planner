'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert/Alert'
import {
  CreditCard,
  TrendingDown,
  Calendar,
  DollarSign,
  Plus,
  CheckCircle,
  Clock,
  Zap,
  AlertTriangle,
  Trophy,
  Target,
  Activity,
  Percent
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { budgetTracker, DebtPayoff } from '@/lib/services/budget-tracker'

interface DebtPayoffTrackerProps {
  userId: string
  className?: string
}

interface EnhancedDebtPayoff extends DebtPayoff {
  dailyInterestAccrual: number
  extraPaymentImpact: number // Months saved with extra $100/month
  payoffVelocity: number // Current payment rate vs minimum
  status: 'on-track' | 'slow' | 'accelerated' | 'completed' | 'behind'
  recentPayments: number // Last 30 days
  interestPaidThisMonth: number
  principalPaidThisMonth: number
  snowballRank: number // Priority for debt snowball
  avalancheRank: number // Priority for debt avalanche
}

export default function DebtPayoffTracker({ userId, className }: DebtPayoffTrackerProps) {
  const [debtPayoffs, setDebtPayoffs] = useState<EnhancedDebtPayoff[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [flashingDebts, setFlashingDebts] = useState<Set<string>>(new Set())
  const [strategy, setStrategy] = useState<'snowball' | 'avalanche'>('avalanche')

  const supabase = createClient()

  const calculateEnhancedDebts = async () => {
    try {
      setIsLoading(true)

      const debts = await budgetTracker.getDebtPayoffs(userId)

      const enhancedDebts: EnhancedDebtPayoff[] = debts.map((debt, index) => {
        // Calculate daily interest accrual
        const dailyInterestAccrual = (debt.current_balance * (debt.interest_rate / 100)) / 365

        // Calculate impact of extra payments
        const baseMonths = debt.months_remaining
        const extraPaymentMonths = debt.minimum_payment > 0
          ? Math.ceil(debt.current_balance / (debt.minimum_payment + 100))
          : baseMonths
        const extraPaymentImpact = Math.max(0, baseMonths - extraPaymentMonths)

        // Calculate payoff velocity
        const payoffVelocity = debt.minimum_payment > 0
          ? (debt.current_balance / debt.months_remaining) / debt.minimum_payment
          : 1

        // Mock recent payments and interest data (would come from payment history)
        const recentPayments = Math.random() * debt.minimum_payment * 2
        const interestPaidThisMonth = dailyInterestAccrual * 30
        const principalPaidThisMonth = Math.max(0, recentPayments - interestPaidThisMonth)

        // Determine status
        let status: EnhancedDebtPayoff['status'] = 'on-track'
        if (debt.progress_percentage >= 100) {
          status = 'completed'
        } else if (payoffVelocity > 1.5) {
          status = 'accelerated'
        } else if (payoffVelocity < 0.8) {
          status = 'behind'
        } else if (payoffVelocity < 1.0) {
          status = 'slow'
        }

        return {
          ...debt,
          dailyInterestAccrual,
          extraPaymentImpact,
          payoffVelocity,
          status,
          recentPayments,
          interestPaidThisMonth,
          principalPaidThisMonth,
          snowballRank: index + 1, // Based on balance (smallest first)
          avalancheRank: index + 1 // Based on interest rate (highest first)
        }
      })

      // Sort for snowball (smallest balance first) and avalanche (highest rate first)
      const snowballSorted = [...enhancedDebts].sort((a, b) => a.current_balance - b.current_balance)
      const avalancheSorted = [...enhancedDebts].sort((a, b) => b.interest_rate - a.interest_rate)

      // Assign ranks
      snowballSorted.forEach((debt, index) => {
        debt.snowballRank = index + 1
      })
      avalancheSorted.forEach((debt, index) => {
        debt.avalancheRank = index + 1
      })

      // Check for significant progress (for flashing effect)
      const newFlashing = new Set<string>()
      enhancedDebts.forEach(debt => {
        if (debt.status === 'completed' || debt.status === 'accelerated') {
          newFlashing.add(debt.id)
        }
      })

      setFlashingDebts(newFlashing)
      setTimeout(() => setFlashingDebts(new Set()), 3000)

      setDebtPayoffs(enhancedDebts)
      setLastUpdate(new Date())
    } catch (error) {
      console.error('Error calculating debt payoffs:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!userId) return

    calculateEnhancedDebts()

    // Set up real-time subscription for debt-related changes
    const channel = supabase
      .channel('debt-payoff-updates')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'debts', filter: `user_id=eq.${userId}` },
        () => {
          console.log('Debt change detected - updating tracker')
          calculateEnhancedDebts()
        })
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'debt_payments', filter: `user_id=eq.${userId}` },
        () => {
          console.log('Debt payment detected - updating progress')
          calculateEnhancedDebts()
        })
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${userId}` },
        (payload) => {
          // Check if this is a debt payment
          if (payload.new && (payload.new as any).category?.includes('debt')) {
            console.log('Debt payment transaction detected')
            calculateEnhancedDebts()
          }
        })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  const getStatusColor = (status: EnhancedDebtPayoff['status']) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50 border-green-200'
      case 'accelerated': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'on-track': return 'text-emerald-600 bg-emerald-50 border-emerald-200'
      case 'slow': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'behind': return 'text-red-600 bg-red-50 border-red-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getStatusIcon = (status: EnhancedDebtPayoff['status']) => {
    switch (status) {
      case 'completed': return <Trophy className="h-4 w-4" />
      case 'accelerated': return <TrendingDown className="h-4 w-4" />
      case 'on-track': return <Target className="h-4 w-4" />
      case 'slow': return <Clock className="h-4 w-4" />
      case 'behind': return <AlertTriangle className="h-4 w-4" />
      default: return <CreditCard className="h-4 w-4" />
    }
  }

  const getStatusMessage = (debt: EnhancedDebtPayoff) => {
    switch (debt.status) {
      case 'completed':
        return `🎉 Congratulations! Your ${debt.creditor_name} is fully paid off!`
      case 'accelerated':
        return `Excellent progress! You're paying off debt ${((debt.payoffVelocity || 1) * 100 - 100).toFixed(0)}% faster than minimum.`
      case 'on-track':
        return `Good progress on ${debt.creditor_name}. Stay consistent with payments.`
      case 'slow':
        return `Consider increasing payments to accelerate payoff and save on interest.`
      case 'behind':
        return `⚠️ Payments are behind schedule. Consider adjusting your debt strategy.`
      default:
        return `Focus on consistent payments to eliminate this debt.`
    }
  }

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'bg-red-100 text-red-700 border-red-200'
    if (rank === 2) return 'bg-orange-100 text-orange-700 border-orange-200'
    if (rank === 3) return 'bg-yellow-100 text-yellow-700 border-yellow-200'
    return 'bg-gray-100 text-gray-600 border-gray-200'
  }

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="animate-pulse space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-red-500" />
          Debt Payoff Tracker
        </h3>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-sm">
            <span className="text-gray-600">Strategy:</span>
            <Button
              variant={strategy === 'snowball' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setStrategy('snowball')}
            >
              Snowball
            </Button>
            <Button
              variant={strategy === 'avalanche' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setStrategy('avalanche')}
            >
              Avalanche
            </Button>
          </div>
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add Debt
          </Button>
        </div>
      </div>

      {debtPayoffs.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-600 mb-2">No Debts to Track</h4>
            <p className="text-gray-500 mb-4">
              Add your debts to track payoff progress and get optimization recommendations.
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-1" />
              Add Your First Debt
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {debtPayoffs
            .sort((a, b) => strategy === 'snowball' ? a.snowballRank - b.snowballRank : a.avalancheRank - b.avalancheRank)
            .map(debt => (
            <Card
              key={debt.id}
              className={`transition-all duration-300 ${
                flashingDebts.has(debt.id) ? 'animate-pulse ring-2 ring-green-300' : ''
              } ${debt.status === 'completed' ? 'border-green-300 bg-green-50' : ''}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    {debt.status === 'completed' ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <CreditCard className="h-5 w-5" />
                    )}
                    {debt.creditor_name}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <div className={`px-2 py-1 rounded-full text-xs border ${getRankColor(strategy === 'snowball' ? debt.snowballRank : debt.avalancheRank)}`}>
                      Priority #{strategy === 'snowball' ? debt.snowballRank : debt.avalancheRank}
                    </div>
                    <div className="flex items-center gap-1">
                      <Zap className="h-3 w-3 text-orange-500" />
                      <span className="text-xs text-gray-500">Live</span>
                    </div>
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs border ${getStatusColor(debt.status)}`}>
                      {getStatusIcon(debt.status)}
                      <span className="capitalize">{debt.status.replace('-', ' ')}</span>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Progress Visualization */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Paid: ${((debt.original_amount || 0) - (debt.current_balance || 0)).toFixed(2)}</span>
                    <span>Remaining: ${(debt.current_balance || 0).toFixed(2)}</span>
                  </div>
                  <Progress
                    value={Math.min(100, debt.progress_percentage || 0)}
                    className="h-4"
                  />
                  <div className="flex justify-between text-xs text-gray-600 mt-1">
                    <span>{(debt.progress_percentage || 0).toFixed(1)}% paid off</span>
                    <span>Total: ${(debt.original_amount || 0).toFixed(2)}</span>
                  </div>
                </div>

                {/* Status Message */}
                <Alert variant={debt.status === 'behind' ? 'destructive' : 'default' as any}>
                  {getStatusIcon(debt.status)}
                  <AlertDescription className="text-sm">
                    {getStatusMessage(debt)}
                  </AlertDescription>
                </Alert>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Interest Rate:</span>
                      <span className="font-medium flex items-center gap-1">
                        <Percent className="h-3 w-3" />
                        {(debt.interest_rate || 0).toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Min Payment:</span>
                      <span className="font-medium">${(debt.minimum_payment || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payoff Date:</span>
                      <span className="font-medium">
                        {new Date(debt.payoff_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Daily Interest:</span>
                      <span className="font-medium text-red-600">
                        ${(debt.dailyInterestAccrual || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Months Left:</span>
                      <span className="font-medium flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {debt.months_remaining}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Recent Payments:</span>
                      <span className="font-medium text-green-600">
                        ${(debt.recentPayments || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Interest vs Principal Breakdown */}
                <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                  <h4 className="font-medium text-sm">This Month's Breakdown</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-600">Interest Paid:</p>
                      <p className="font-semibold text-red-600">
                        ${(debt.interestPaidThisMonth || 0).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Principal Paid:</p>
                      <p className="font-semibold text-green-600">
                        ${(debt.principalPaidThisMonth || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <Progress
                    value={(debt.principalPaidThisMonth / (debt.principalPaidThisMonth + debt.interestPaidThisMonth)) * 100}
                    className="h-2"
                  />
                </div>

                {/* Extra Payment Impact */}
                {debt.status !== 'completed' && debt.extraPaymentImpact > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-700">
                      <TrendingDown className="h-4 w-4 inline mr-1" />
                      <strong>Extra Payment Impact:</strong> Adding $100/month would save {debt.extraPaymentImpact} months!
                    </p>
                  </div>
                )}

                {/* Quick Actions */}
                {debt.status !== 'completed' && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <DollarSign className="h-4 w-4 mr-1" />
                      Make Payment
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Activity className="h-4 w-4 mr-1" />
                      View Strategy
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {/* Strategy Summary */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="text-center">
                <h4 className="font-semibold text-blue-800 mb-2">
                  {strategy === 'snowball' ? '❄️ Snowball Strategy' : '🏔️ Avalanche Strategy'}
                </h4>
                <p className="text-sm text-blue-700">
                  {strategy === 'snowball'
                    ? 'Focus on smallest balances first for psychological wins'
                    : 'Focus on highest interest rates first to minimize total interest paid'}
                </p>
                <div className="mt-3 text-xs text-blue-600">
                  Total Monthly Interest: ${debtPayoffs.reduce((sum, debt) => sum + (debt.dailyInterestAccrual || 0) * 30, 0).toFixed(2)}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <p className="text-xs text-gray-500 text-center">
        Last updated: {lastUpdate.toLocaleTimeString()} • Updates as payments are made
      </p>
    </div>
  )
}