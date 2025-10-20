'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertCircle,
  Loader2,
  RefreshCw,
  Calendar
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

interface RemainingBalanceData {
  totalMonthlyIncome: number
  totalSpending: number
  totalBillAmount: number
  paidBillsAmount: number
  unpaidBillsAmount: number
  remainingBalance: number
  percentages: {
    spending: number
    bills: number
    remaining: number
  }
  breakdown: {
    incomeSourcesCount: number
    transactionsCount: number
    nonBillTransactionsCount: number
    billsCount: number
    paidBillsCount: number
  }
  period: {
    month: number
    year: number
    startDate: string
    endDate: string
  }
}

interface RemainingBalanceCardProps {
  className?: string
}

export function RemainingBalanceCard({ className }: RemainingBalanceCardProps) {
  const [data, setData] = useState<RemainingBalanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const supabase = createClient()

  const fetchRemainingBalance = async (isRealtimeUpdate = false) => {
    try {
      // If this is a real-time update, show updating state instead of loading
      if (isRealtimeUpdate) {
        setIsUpdating(true)
      }

      const response = await fetch('/api/balance/remaining?period=month')
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch remaining balance')
      }

      setData(result.data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setLoading(false)
      setRefreshing(false)
      setIsUpdating(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchRemainingBalance()
  }

  useEffect(() => {
    fetchRemainingBalance()

    // Set up real-time subscriptions
    const channel = supabase
      .channel('remaining-balance-updates')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        (payload) => {
          console.log('Transaction change detected:', payload)
          // Refresh balance data when transactions change
          fetchRemainingBalance(true)
        })
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'bills' },
        (payload) => {
          console.log('Bill change detected:', payload)
          // Refresh balance data when bills change
          fetchRemainingBalance(true)
        })
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'bill_payments' },
        (payload) => {
          console.log('Bill payment change detected:', payload)
          // Refresh balance data when bill payments change
          fetchRemainingBalance(true)
        })
      .subscribe((status) => {
        console.log('Realtime subscription status:', status)
        setIsRealtimeConnected(status === 'SUBSCRIBED')
      })

    // Cleanup subscription on unmount
    return () => {
      console.log('Cleaning up realtime subscriptions')
      supabase.removeChannel(channel)
    }
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const getBalanceColor = (balance: number) => {
    if (balance > 0) return 'text-green-600 dark:text-green-400'
    if (balance < 0) return 'text-red-600 dark:text-red-400'
    return 'text-card-foreground'
  }

  const getBalanceIcon = (balance: number) => {
    if (balance > 0) return <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
    if (balance < 0) return <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
    return <DollarSign className="h-4 w-4 text-card-foreground" />
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-card-foreground">Remaining Balance</CardTitle>
          <DollarSign className="h-4 w-4 text-card-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-card-foreground">Remaining Balance</CardTitle>
          <AlertCircle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-sm text-red-600 mb-2">{error}</p>
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              disabled={refreshing}
              className="text-card-foreground border-input hover:bg-gray-100"
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return null
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center space-x-2">
          <CardTitle className="text-sm font-medium text-card-foreground">Remaining Balance</CardTitle>
          <div className="flex items-center space-x-1">
            {isRealtimeConnected && (
              <div className={`w-2 h-2 rounded-full ${isUpdating ? 'bg-orange-500 animate-pulse' : 'bg-green-500'}`} title={isUpdating ? 'Updating...' : 'Real-time updates active'} />
            )}
            <Button
              onClick={handleRefresh}
              variant="ghost"
              size="sm"
              disabled={refreshing || isUpdating}
              className="h-6 w-6 p-0 text-card-foreground hover:text-card-foreground hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <RefreshCw className={`h-3 w-3 ${refreshing || isUpdating ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        {getBalanceIcon(data.remainingBalance)}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Main Balance Display */}
          <div>
            <div className={`text-2xl font-bold ${getBalanceColor(data.remainingBalance)}`}>
              {formatCurrency(data.remainingBalance)}
            </div>
            <p className="text-xs text-card-foreground">
              After bills and spending
            </p>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full flex">
                {/* Spending portion */}
                <div
                  className="bg-blue-500"
                  style={{ width: `${Math.min(data.percentages.spending, 100)}%` }}
                />
                {/* Bills portion */}
                <div
                  className="bg-red-500"
                  style={{ width: `${Math.min(data.percentages.bills, 100)}%` }}
                />
                {/* Remaining portion */}
                {data.percentages.remaining > 0 && (
                  <div
                    className="bg-green-500"
                    style={{ width: `${Math.min(data.percentages.remaining, 100)}%` }}
                  />
                )}
              </div>
            </div>

            {/* Legend */}
            <div className="flex justify-between text-xs text-card-foreground">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                <span>Spending</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-red-500 rounded-full" />
                <span>Bills</span>
              </div>
              {data.percentages.remaining > 0 && (
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span>Remaining</span>
                </div>
              )}
            </div>
          </div>

          {/* Breakdown */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>Monthly Income:</span>
              <span className="font-medium">{formatCurrency(data.totalMonthlyIncome)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>Spending:</span>
              <span className="text-blue-600">-{formatCurrency(data.totalSpending)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>Unpaid Bills:</span>
              <span className="text-red-600">-{formatCurrency(data.unpaidBillsAmount)}</span>
            </div>
            {data.paidBillsAmount > 0 && (
              <div className="flex justify-between text-xs">
                <span>Paid Bills:</span>
                <span className="text-green-600">{formatCurrency(data.paidBillsAmount)} ✓</span>
              </div>
            )}
          </div>

          {/* Status Messages */}
          {data.remainingBalance < 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-2">
              <div className="flex items-center space-x-1">
                <AlertCircle className="h-3 w-3 text-red-500" />
                <span className="text-xs text-red-700 font-medium">
                  Over budget by {formatCurrency(Math.abs(data.remainingBalance))}
                </span>
              </div>
            </div>
          )}

          {/* Period Info */}
          <div className="flex items-center justify-between pt-2 border-t text-xs text-card-foreground">
            <div className="flex items-center space-x-1">
              <Calendar className="h-3 w-3" />
              <span>
                {new Date(data.period.year, data.period.month - 1).toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric'
                })}
              </span>
            </div>
            <span>
              {data.breakdown.billsCount} bills • {data.breakdown.nonBillTransactionsCount} transactions
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}