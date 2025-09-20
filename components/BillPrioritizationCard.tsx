'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Calendar,
  DollarSign,
  AlertTriangle,
  Clock,
  TrendingUp,
  CheckCircle,
  ArrowRight,
  Loader2,
  RefreshCw,
  Target,
  Zap
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils/helpers'

interface PrioritizedBill {
  id: string
  name: string
  amount: number
  dueDate: string
  category: string
  billingCycle: string
  isPaid: boolean
  isOverdue: boolean
  daysUntilDue: number
  priorityScore: number
  priorityReason: string
  priorityLevel: 'critical' | 'high' | 'medium' | 'low'
  canAfford: boolean
  currentPeriodStart: string
  currentPeriodEnd: string
}

interface BillPrioritizationData {
  availableBalance: number
  totalUpcoming: number
  totalAffordable: number
  prioritizedBills: PrioritizedBill[]
  paymentStrategy: {
    canAffordAll: boolean
    recommendedOrder: string[]
    totalCritical: number
    totalHigh: number
    shortfall: number
  }
  nextPaycheck: {
    estimatedDate: string
    estimatedAmount: number
  } | null
}

interface BillPrioritizationCardProps {
  className?: string
}

export function BillPrioritizationCard({ className }: BillPrioritizationCardProps) {
  const [data, setData] = useState<BillPrioritizationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchBillPrioritization = async () => {
    try {
      const response = await fetch('/api/bills/prioritization')
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch bill prioritization data')
      }

      setData(result.data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchBillPrioritization()
  }

  useEffect(() => {
    fetchBillPrioritization()
  }, [])

  const getPriorityColor = (level: string) => {
    switch (level) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200'
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getPriorityIcon = (level: string) => {
    switch (level) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-600" />
      case 'high': return <Zap className="h-4 w-4 text-orange-600" />
      case 'medium': return <Clock className="h-4 w-4 text-yellow-600" />
      case 'low': return <Target className="h-4 w-4 text-blue-600" />
      default: return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const formatDaysUntilDue = (days: number) => {
    if (days < 0) return `${Math.abs(days)}d overdue`
    if (days === 0) return 'Due today'
    if (days === 1) return 'Due tomorrow'
    return `${days}d left`
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Payment Priority</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
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
          <CardTitle className="text-sm font-medium">Payment Priority</CardTitle>
          <AlertTriangle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-sm text-red-600 mb-2">{error}</p>
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              disabled={refreshing}
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
          <CardTitle className="text-sm font-medium">Payment Priority</CardTitle>
          <Button
            onClick={handleRefresh}
            variant="ghost"
            size="sm"
            disabled={refreshing}
            className="h-6 w-6 p-0"
          >
            <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <div className="flex items-center space-x-1">
          {data.paymentStrategy.canAffordAll ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-red-600" />
          )}
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Balance Overview */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-muted-foreground">Available Balance</span>
              <span className={`font-bold text-lg ${
                data.availableBalance >= data.totalUpcoming ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(data.availableBalance)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-muted-foreground block">Upcoming Bills</span>
                <span className="font-medium">{formatCurrency(data.totalUpcoming)}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Can Afford</span>
                <span className="font-medium text-green-600">{formatCurrency(data.totalAffordable)}</span>
              </div>
            </div>

            {data.paymentStrategy.shortfall > 0 && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                <div className="flex items-center text-xs text-red-600">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Shortfall: {formatCurrency(data.paymentStrategy.shortfall)}
                </div>
              </div>
            )}
          </div>

          {/* Priority Bills List */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              Payment Order ({data.prioritizedBills.length} bills)
            </h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {data.prioritizedBills.slice(0, 8).map((bill, index) => (
                <div
                  key={bill.id}
                  className={`p-2 rounded-lg border ${
                    bill.canAfford ? 'bg-white' : 'bg-gray-50 border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2 flex-1">
                      <span className="text-xs font-medium text-gray-500 bg-gray-100 rounded-full w-5 h-5 flex items-center justify-center">
                        {index + 1}
                      </span>
                      <span className={`text-sm font-medium truncate ${
                        bill.isPaid ? 'text-green-700 line-through' : 'text-gray-900'
                      }`}>
                        {bill.name}
                      </span>
                      {bill.isPaid && (
                        <CheckCircle className="h-3 w-3 text-green-600" />
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs rounded-full border ${getPriorityColor(bill.priorityLevel)}`}>
                        {bill.priorityLevel}
                      </span>
                      <span className={`text-sm font-medium ${bill.canAfford ? 'text-gray-900' : 'text-red-600'}`}>
                        {formatCurrency(bill.amount)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-1">
                      {getPriorityIcon(bill.priorityLevel)}
                      <span className="text-muted-foreground">{bill.priorityReason}</span>
                    </div>
                    <div className={`${
                      bill.daysUntilDue < 0 ? 'text-red-600' :
                      bill.daysUntilDue <= 3 ? 'text-yellow-600' : 'text-gray-600'
                    }`}>
                      {formatDaysUntilDue(bill.daysUntilDue)}
                    </div>
                  </div>

                  {!bill.canAfford && (
                    <div className="mt-1 text-xs text-red-600">
                      ⚠️ Insufficient funds
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Strategy Summary */}
          <div className="border-t pt-3">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-muted-foreground block">Critical</span>
                <span className="font-medium text-red-600">{data.paymentStrategy.totalCritical}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">High Priority</span>
                <span className="font-medium text-orange-600">{data.paymentStrategy.totalHigh}</span>
              </div>
            </div>

            {data.nextPaycheck && (
              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                <div className="text-xs text-blue-600">
                  💰 Next paycheck: {formatCurrency(data.nextPaycheck.estimatedAmount)} on {new Date(data.nextPaycheck.estimatedDate).toLocaleDateString()}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}