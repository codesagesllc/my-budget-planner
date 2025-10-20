'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  TrendingUp,
  TrendingDown,
  Clock,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Target,
  Award,
  Loader2,
  RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PaymentPattern {
  billId: string
  billName: string
  category: string
  amount: number
  totalPayments: number
  onTimePayments: number
  latePayments: number
  onTimePercentage: number
  averageDaysLate: number
  lastPaymentDate: string | null
  nextDueDate: string
  riskLevel: 'low' | 'medium' | 'high'
  trend: 'improving' | 'stable' | 'declining'
  billingCycle: string
}

interface PaymentTrackingData {
  overallOnTimeRate: number
  totalBillsPaid: number
  mostReliableBills: PaymentPattern[]
  difficultBills: PaymentPattern[]
  recentTrend: 'improving' | 'stable' | 'declining'
  monthlyStats: {
    month: string
    onTimeRate: number
    totalPaid: number
  }[]
}

interface PaymentTrackingCardProps {
  className?: string
}

export function PaymentTrackingCard({ className }: PaymentTrackingCardProps) {
  const [data, setData] = useState<PaymentTrackingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchPaymentTracking = async () => {
    try {
      const response = await fetch('/api/bills/payment-tracking')
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch payment tracking data')
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
    await fetchPaymentTracking()
  }

  useEffect(() => {
    fetchPaymentTracking()
  }, [])

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'text-green-600 bg-green-50 border-green-200'
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'high': return 'text-red-600 bg-red-50 border-red-200'
      default: return 'text-black dark:text-white bg-gray-50 border-gray-200'
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'declining': return <TrendingDown className="h-4 w-4 text-red-600" />
      default: return <Clock className="h-4 w-4 text-black dark:text-white" />
    }
  }

  const formatPercentage = (value: number) => {
    return `${Math.round(value)}%`
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Payment Tracking</CardTitle>
          <Target className="h-4 w-4 text-black dark:text-white" />
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
          <CardTitle className="text-sm font-medium">Payment Tracking</CardTitle>
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
          <CardTitle className="text-sm font-medium">Payment Tracking</CardTitle>
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
          {getTrendIcon(data.recentTrend)}
          <Target className="h-4 w-4 text-black dark:text-white" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Overall Performance */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-black dark:text-white">On-Time Rate</span>
              <div className="flex items-center space-x-2">
                {data.overallOnTimeRate >= 80 ? (
                  <Award className="h-4 w-4 text-green-600" />
                ) : data.overallOnTimeRate >= 60 ? (
                  <Clock className="h-4 w-4 text-yellow-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                )}
                <span className={`font-bold text-lg ${
                  data.overallOnTimeRate >= 80 ? 'text-green-600' :
                  data.overallOnTimeRate >= 60 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {formatPercentage(data.overallOnTimeRate)}
                </span>
              </div>
            </div>
            <div className="text-xs text-black dark:text-white mb-3">
              {data.totalBillsPaid} bills tracked • Trend: {data.recentTrend}
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  data.overallOnTimeRate >= 80 ? 'bg-green-500' :
                  data.overallOnTimeRate >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(data.overallOnTimeRate, 100)}%` }}
              />
            </div>
          </div>

          {/* Most Reliable Bills */}
          {data.mostReliableBills.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                Most Reliable ({data.mostReliableBills.length})
              </h4>
              <div className="space-y-1">
                {data.mostReliableBills.slice(0, 3).map((bill) => (
                  <div key={bill.billId} className="flex justify-between items-center text-xs">
                    <span className="text-gray-700 truncate flex-1">{bill.billName}</span>
                    <span className="text-green-600 font-medium ml-2">
                      {formatPercentage(bill.onTimePercentage)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Difficult Bills */}
          {data.difficultBills.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                <AlertTriangle className="h-4 w-4 text-red-500 mr-1" />
                Need Attention ({data.difficultBills.length})
              </h4>
              <div className="space-y-2">
                {data.difficultBills.slice(0, 3).map((bill) => (
                  <div key={bill.billId} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-900 truncate flex-1">{bill.billName}</span>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs rounded-full border ${getRiskColor(bill.riskLevel)}`}>
                          {bill.riskLevel}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-black dark:text-white">
                      <span>{formatPercentage(bill.onTimePercentage)} on-time</span>
                      {bill.averageDaysLate > 0 && (
                        <span>Avg {Math.round(bill.averageDaysLate)}d late</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t text-xs">
            <div>
              <span className="text-black dark:text-white block">This Month</span>
              <span className="font-medium">
                {data.monthlyStats[0]?.onTimeRate ? formatPercentage(data.monthlyStats[0].onTimeRate) : 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-black dark:text-white block">Improvement</span>
              <span className={`font-medium ${
                data.recentTrend === 'improving' ? 'text-green-600' :
                data.recentTrend === 'declining' ? 'text-red-600' : 'text-black dark:text-white'
              }`}>
                {data.recentTrend}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}