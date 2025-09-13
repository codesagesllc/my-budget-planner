'use client'

import { useState, useEffect } from 'react'
import { Brain, Zap, TrendingUp, AlertCircle, ChevronRight } from 'lucide-react'
import { AI_LIMITS } from '@/lib/ai/services/ai-service'
import type { SubscriptionTier } from '@/lib/ai/services/ai-service'
import { useRouter } from 'next/navigation'

interface AIUsageStatsProps {
  userId: string
  tier?: SubscriptionTier
}

interface UsageData {
  monthly_insights: number
  bill_parsing: number
  income_detection: number
  debt_strategies: number
}

export default function AIUsageStats({ userId, tier = 'free_trial' }: AIUsageStatsProps) {
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchUsageStats()
  }, [userId])

  const fetchUsageStats = async () => {
    try {
      const response = await fetch(`/api/insights/generate?userId=${userId}`)
      if (response.ok) {
        const data = await response.json()
        setUsage(data.usage)
      }
    } catch (error) {
      console.error('Error fetching usage stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const getUsagePercentage = (used: number, limit: number): number => {
    if (limit === -1) return 0 // Unlimited
    return Math.min(100, (used / limit) * 100)
  }

  const getUsageColor = (percentage: number): string => {
    if (percentage >= 90) return 'text-red-600 bg-red-100'
    if (percentage >= 70) return 'text-yellow-600 bg-yellow-100'
    return 'text-green-600 bg-green-100'
  }

  const getProgressBarColor = (percentage: number): string => {
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 70) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 border border-blue-200 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!usage) return null

  const limits = AI_LIMITS[tier]
  const isUnlimited = tier === 'premium'

  const usageItems = [
    {
      name: 'Financial Insights',
      icon: Brain,
      used: usage.monthly_insights || 0,
      limit: limits.monthly_insights,
      color: 'purple',
    },
    {
      name: 'Bill Parsing',
      icon: Zap,
      used: usage.bill_parsing || 0,
      limit: limits.bill_parsing,
      color: 'blue',
    },
    {
      name: 'Income Detection',
      icon: TrendingUp,
      used: usage.income_detection || 0,
      limit: limits.income_detection,
      color: 'green',
    },
    {
      name: 'Debt Strategies',
      icon: AlertCircle,
      used: usage.debt_strategies || 0,
      limit: limits.debt_strategies,
      color: 'orange',
    },
  ]

  return (
    <div className="bg-white rounded-xl p-6 border border-blue-200">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Brain className="h-6 w-6 text-purple-600 mr-3" />
          <h3 className="text-lg font-semibold text-blue-900">AI Usage This Month</h3>
        </div>
        {!isUnlimited && (
          <span className={`text-xs px-2 py-1 rounded-full ${
            tier === 'basic' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
          }`}>
            {tier === 'basic' ? 'Basic' : 'Free Trial'}
          </span>
        )}
        {isUnlimited && (
          <span className="text-xs px-2 py-1 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white">
            Premium - Unlimited
          </span>
        )}
      </div>

      <div className="space-y-4">
        {usageItems.map((item) => {
          const Icon = item.icon
          const percentage = getUsagePercentage(item.used, item.limit)
          const isNearLimit = percentage >= 80 && item.limit !== -1
          
          return (
            <div key={item.name} className="relative">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <Icon className={`h-4 w-4 mr-2 text-${item.color}-600`} />
                  <span className="text-sm font-medium text-gray-700">{item.name}</span>
                </div>
                <div className="flex items-center">
                  {item.limit === -1 ? (
                    <span className="text-xs text-purple-600 font-medium">Unlimited</span>
                  ) : (
                    <>
                      <span className="text-sm font-medium text-gray-900">
                        {item.used}/{item.limit}
                      </span>
                      {isNearLimit && (
                        <AlertCircle className="h-3 w-3 ml-2 text-yellow-500" />
                      )}
                    </>
                  )}
                </div>
              </div>
              
              {item.limit !== -1 && (
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${getProgressBarColor(percentage)}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              )}
              
              {isNearLimit && (
                <p className="text-xs text-yellow-600 mt-1">
                  {100 - percentage < 20 ? 'Almost at limit' : 'Approaching limit'}
                </p>
              )}
            </div>
          )
        })}
      </div>

      {!isUnlimited && (
        <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-900">
                {tier === 'free_trial' ? 'Unlock More AI Features' : 'Need More AI Power?'}
              </p>
              <p className="text-xs text-blue-700 mt-1">
                {tier === 'free_trial' 
                  ? 'Upgrade to Basic for 4x more AI features or Premium for unlimited access'
                  : 'Upgrade to Premium for unlimited AI features with priority processing'
                }
              </p>
            </div>
            <button
              onClick={() => router.push('/pricing')}
              className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              Upgrade
              <ChevronRight className="h-4 w-4 ml-1" />
            </button>
          </div>
        </div>
      )}

      {/* AI Performance Metrics */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="p-3 bg-purple-50 rounded-lg">
          <p className="text-xs text-purple-600 font-medium">Avg Response Time</p>
          <p className="text-lg font-bold text-purple-900">
            {isUnlimited ? '< 1s' : '2-3s'}
          </p>
          <p className="text-xs text-purple-500 mt-1">
            {isUnlimited ? 'Priority queue' : 'Batch processing'}
          </p>
        </div>
        
        <div className="p-3 bg-green-50 rounded-lg">
          <p className="text-xs text-green-600 font-medium">Cache Hit Rate</p>
          <p className="text-lg font-bold text-green-900">52%</p>
          <p className="text-xs text-green-500 mt-1">
            Saving on repeat queries
          </p>
        </div>
      </div>

      {/* Tips for optimization */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <p className="text-xs font-semibold text-blue-900 mb-1">💡 Pro Tip</p>
        <p className="text-xs text-blue-700">
          AI responses are cached for 24 hours. Running the same analysis twice won't count against your limit!
        </p>
      </div>
    </div>
  )
}
