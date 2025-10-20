'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert/Alert'
import {
  Target,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  DollarSign,
  Calendar,
  Settings,
  Plus,
  Edit3,
  CheckCircle,
  Clock,
  Zap,
  BarChart3,
  X,
  Save,
  RefreshCw
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { budgetTracker, BudgetLimit } from '@/lib/services/budget-tracker'

interface CategorySpendingLimitsProps {
  userId: string
  className?: string
}

interface CategoryLimit extends BudgetLimit {
  currentSpending: number
  percentageUsed: number
  remainingAmount: number
  daysRemaining: number
  dailyAllowance: number
  projectedSpending: number
  status: 'safe' | 'warning' | 'danger' | 'exceeded'
  trend: 'improving' | 'stable' | 'worsening'
  recentSpending: number // Last 7 days
}

export default function CategorySpendingLimits({ userId, className }: CategorySpendingLimitsProps) {
  const [categoryLimits, setCategoryLimits] = useState<CategoryLimit[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [flashingCategories, setFlashingCategories] = useState<Set<string>>(new Set())
  const [showLimitForm, setShowLimitForm] = useState(false)
  const [showDetailsView, setShowDetailsView] = useState(false)
  const [showManageView, setShowManageView] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [editingLimit, setEditingLimit] = useState<CategoryLimit | null>(null)

  const supabase = createClient()

  const calculateCategoryLimits = async () => {
    try {
      setIsLoading(true)

      // Get budget limits from the service
      const budgetLimits = await budgetTracker.getBudgetLimits(userId)

      // For each category, calculate current spending and metrics
      const enhancedLimitsRaw = await Promise.all(
        budgetLimits.map(async (limit) => {
          // Get current month transactions for this category
          const { data: transactions, error } = await supabase
            .from('transactions')
            .select('amount, date')
            .eq('user_id', userId)
            .eq('category', limit.category)
            .gte('date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
            .lte('date', new Date().toISOString())

          if (error) {
            console.error('Error fetching transactions for category:', error)
            return null
          }

          // Calculate current spending (absolute values for expenses)
          const currentSpending = transactions?.reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0

          // Calculate recent spending (last 7 days)
          const sevenDaysAgo = new Date()
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
          const recentSpending = transactions
            ?.filter(t => new Date(t.date) >= sevenDaysAgo)
            .reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0

          // Calculate metrics
          const percentageUsed = (currentSpending / limit.monthly_limit) * 100
          const remainingAmount = Math.max(0, limit.monthly_limit - currentSpending)

          // Days remaining in month
          const now = new Date()
          const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
          const daysRemaining = Math.ceil((endOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

          const dailyAllowance = daysRemaining > 0 ? remainingAmount / daysRemaining : 0
          const currentDailyRate = recentSpending / 7
          const projectedSpending = currentSpending + (currentDailyRate * daysRemaining)

          // Determine status
          let status: CategoryLimit['status'] = 'safe'
          if (currentSpending > limit.monthly_limit) {
            status = 'exceeded'
          } else if (percentageUsed >= 90) {
            status = 'danger'
          } else if (percentageUsed >= 75) {
            status = 'warning'
          }

          // Determine trend
          let trend: CategoryLimit['trend'] = 'stable'
          if (projectedSpending > limit.monthly_limit * 1.1) {
            trend = 'worsening'
          } else if (currentDailyRate < dailyAllowance * 0.8) {
            trend = 'improving'
          }

          return {
            ...limit,
            currentSpending,
            percentageUsed,
            remainingAmount,
            daysRemaining,
            dailyAllowance,
            projectedSpending,
            status,
            trend,
            recentSpending
          }
        })
      )

      // Filter out null results and check for categories crossing thresholds
      const validLimits = enhancedLimitsRaw.filter(Boolean) as CategoryLimit[]

      // Flash categories that have crossed warning thresholds
      const newFlashing = new Set<string>()
      validLimits.forEach(limit => {
        if (limit.status === 'danger' || limit.status === 'exceeded') {
          newFlashing.add(limit.category)
        }
      })

      setFlashingCategories(newFlashing)
      setTimeout(() => setFlashingCategories(new Set()), 3000)

      setCategoryLimits(validLimits)
      setLastUpdate(new Date())
    } catch (error) {
      console.error('Error calculating category limits:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleViewDetails = (category: string) => {
    setSelectedCategory(category)
    setShowDetailsView(true)
  }

  const handleAdjustLimit = (category: string) => {
    const limit = categoryLimits.find(l => l.category === category)
    if (limit) {
      setEditingLimit(limit)
      setShowLimitForm(true)
    }
  }

  const handleAddLimit = () => {
    setEditingLimit(null)
    setSelectedCategory(null)
    setShowLimitForm(true)
  }

  const handleManage = () => {
    setShowManageView(true)
  }

  const updateBudgetLimit = async (category: string, newLimit: number) => {
    try {
      const { error } = await supabase
        .from('budget_limits')
        .update({ monthly_limit: newLimit })
        .eq('user_id', userId)
        .eq('category', category)
        .eq('is_active', true)

      if (error) {
        console.error('Error updating budget limit:', error)
        alert('Failed to update budget limit. Please try again.')
      } else {
        calculateCategoryLimits() // Refresh data
        alert(`Budget limit for ${category} updated to $${newLimit}`)
      }
    } catch (error) {
      console.error('Error updating budget limit:', error)
      alert('Failed to update budget limit. Please try again.')
    }
  }

  const createBudgetLimit = async (category: string, monthlyLimit: number) => {
    try {
      const { error } = await supabase
        .from('budget_limits')
        .insert({
          user_id: userId,
          category: category,
          monthly_limit: monthlyLimit,
          current_spending: 0,
          percentage_used: 0,
          warning_threshold: 80,
          is_active: true
        })

      if (error) {
        console.error('Error creating budget limit:', error)
        alert('Failed to create budget limit. Please try again.')
      } else {
        calculateCategoryLimits() // Refresh data
        alert(`Budget limit for ${category} created: $${monthlyLimit}/month`)
      }
    } catch (error) {
      console.error('Error creating budget limit:', error)
      alert('Failed to create budget limit. Please try again.')
    }
  }

  useEffect(() => {
    if (!userId) return

    calculateCategoryLimits()

    // Set up real-time subscription for transaction changes
    const channel = supabase
      .channel('category-spending-updates')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${userId}` },
        () => {
          console.log('Transaction change detected - updating category limits')
          calculateCategoryLimits()
        })
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'budget_limits', filter: `user_id=eq.${userId}` },
        () => {
          console.log('Budget limit change detected - updating limits')
          calculateCategoryLimits()
        })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  const getStatusColor = (status: CategoryLimit['status']) => {
    switch (status) {
      case 'safe': return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
      case 'warning': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700'
      case 'danger': return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700'
      case 'exceeded': return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
      default: return 'text-black dark:text-black bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-600'
    }
  }

  const getStatusIcon = (status: CategoryLimit['status']) => {
    switch (status) {
      case 'safe': return <CheckCircle className="h-4 w-4" />
      case 'warning': return <Clock className="h-4 w-4" />
      case 'danger': return <AlertTriangle className="h-4 w-4" />
      case 'exceeded': return <AlertTriangle className="h-4 w-4" />
      default: return <Target className="h-4 w-4" />
    }
  }

  const getTrendIcon = (trend: CategoryLimit['trend']) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'worsening': return <TrendingDown className="h-4 w-4 text-red-600" />
      default: return <BarChart3 className="h-4 w-4 text-blue-600" />
    }
  }

  const getProgressColor = (status: CategoryLimit['status']) => {
    switch (status) {
      case 'safe': return 'bg-green-500'
      case 'warning': return 'bg-yellow-500'
      case 'danger': return 'bg-orange-500'
      case 'exceeded': return 'bg-red-500'
      default: return 'bg-blue-500'
    }
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
        <h3 className="text-lg font-semibold flex items-center gap-2 text-black">
          <Target className="h-5 w-5 text-blue-500" />
          Category Spending Limits
          <div className="flex items-center gap-1">
            <Zap className="h-4 w-4 text-orange-500" />
            <span className="text-xs text-black">Live</span>
          </div>
        </h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleManage} className="text-black border-input hover:bg-gray-100">
            <Settings className="h-4 w-4 mr-1 text-black" />
            Manage
          </Button>
          <Button variant="outline" size="sm" onClick={handleAddLimit} className="text-black border-input hover:bg-gray-100">
            <Plus className="h-4 w-4 mr-1 text-black" />
            Add Limit
          </Button>
        </div>
      </div>

      {categoryLimits.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Target className="h-12 w-12 text-black mx-auto mb-4" />
            <h4 className="text-lg font-medium text-black mb-2">No Category Limits Set</h4>
            <p className="text-black dark:text-gray-300 mb-4">
              Set spending limits for categories to track your budget progress.
            </p>
            <Button onClick={handleAddLimit}>
              <Plus className="h-4 w-4 mr-1" />
              Create Your First Limit
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {categoryLimits.map(limit => (
            <Card
              key={limit.category}
              className={`transition-all duration-300 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 ${
                flashingCategories.has(limit.category) ? 'animate-pulse ring-2 ring-orange-300 dark:ring-orange-500' : ''
              } ${limit.status === 'exceeded' ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20' : ''}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="capitalize">{limit.category}</span>
                    {getTrendIcon(limit.trend)}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs border ${getStatusColor(limit.status)}`}>
                      {getStatusIcon(limit.status)}
                      <span className="capitalize">{limit.status}</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleAdjustLimit(limit.category)}>
                      <Edit3 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Progress Visualization */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>${limit.currentSpending.toFixed(2)} spent</span>
                    <span>${limit.monthly_limit.toFixed(2)} limit</span>
                  </div>
                  <Progress
                    value={Math.min(100, limit.percentageUsed)}
                    className="h-3"
                  />
                  <div className="flex justify-between text-xs text-black dark:text-gray-300 mt-1">
                    <span>{limit.percentageUsed.toFixed(1)}% used</span>
                    <span>${limit.remainingAmount.toFixed(2)} remaining</span>
                  </div>
                </div>

                {/* Status Alert */}
                {limit.status !== 'safe' && (
                  <Alert variant={limit.status === 'exceeded' ? 'destructive' : 'default' as any}>
                    {getStatusIcon(limit.status)}
                    <AlertDescription className="text-sm">
                      {limit.status === 'exceeded' &&
                        `⚠️ You've exceeded your ${limit.category} budget by $${(limit.currentSpending - limit.monthly_limit).toFixed(2)}`
                      }
                      {limit.status === 'danger' &&
                        `🚨 Only $${limit.remainingAmount.toFixed(2)} left in your ${limit.category} budget`
                      }
                      {limit.status === 'warning' &&
                        `⚡ You've used ${limit.percentageUsed.toFixed(1)}% of your ${limit.category} budget`
                      }
                    </AlertDescription>
                  </Alert>
                )}

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-black dark:text-gray-300">Daily Allowance:</span>
                      <span className="font-medium">${limit.dailyAllowance.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black dark:text-gray-300">Current Rate:</span>
                      <span className={`font-medium ${
                        (limit.recentSpending / 7) > limit.dailyAllowance ? 'text-red-600' : 'text-green-600'
                      }`}>
                        ${(limit.recentSpending / 7).toFixed(2)}/day
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-black dark:text-gray-300">Days Left:</span>
                      <span className="font-medium flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {limit.daysRemaining}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black dark:text-gray-300">Projected:</span>
                      <span className={`font-medium ${
                        limit.projectedSpending > limit.monthly_limit ? 'text-red-600' : 'text-green-600'
                      }`}>
                        ${limit.projectedSpending.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-black">Last 7 days:</span>
                    <span className="font-medium text-red-600">
                      -${limit.recentSpending.toFixed(2)}
                    </span>
                  </div>
                  <Progress
                    value={(limit.recentSpending / (limit.dailyAllowance * 7)) * 100}
                    className="h-2"
                  />
                </div>

                {/* Quick Actions */}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 text-black border-input hover:bg-gray-100" onClick={() => handleViewDetails(limit.category)}>
                    <BarChart3 className="h-4 w-4 mr-1" />
                    View Details
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 text-black border-input hover:bg-gray-100" onClick={() => handleAdjustLimit(limit.category)}>
                    <Settings className="h-4 w-4 mr-1" />
                    Adjust Limit
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="text-xs text-black text-center">
        Last updated: {lastUpdate.toLocaleTimeString()} • Updates with new transactions
      </p>

      {/* Budget Limit Form Popup - Combined Add/Edit */}
      {showLimitForm && (
        <BudgetLimitForm
          userId={userId}
          editingLimit={editingLimit}
          onSuccess={() => {
            setShowLimitForm(false)
            setEditingLimit(null)
            calculateCategoryLimits()
          }}
          onCancel={() => {
            setShowLimitForm(false)
            setEditingLimit(null)
          }}
        />
      )}

      {/* Category Details View Popup */}
      {showDetailsView && selectedCategory && (
        <CategoryDetailsView
          category={selectedCategory}
          limit={categoryLimits.find(l => l.category === selectedCategory)}
          onClose={() => {
            setShowDetailsView(false)
            setSelectedCategory(null)
          }}
        />
      )}

      {/* Manage Limits View Popup */}
      {showManageView && (
        <ManageLimitsView
          userId={userId}
          limits={categoryLimits}
          onSuccess={() => {
            setShowManageView(false)
            calculateCategoryLimits()
          }}
          onClose={() => setShowManageView(false)}
        />
      )}
    </div>
  )
}

// Budget Limit Form Component (Combined Add/Edit)
interface BudgetLimitFormProps {
  userId: string
  editingLimit?: CategoryLimit | null
  onSuccess: () => void
  onCancel: () => void
}

function BudgetLimitForm({ userId, editingLimit, onSuccess, onCancel }: BudgetLimitFormProps) {
  const [formData, setFormData] = useState({
    category: editingLimit?.category || '',
    monthlyLimit: editingLimit?.monthly_limit?.toString() || '',
    warningThreshold: editingLimit?.warning_threshold?.toString() || '80'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.category || !formData.monthlyLimit) {
      setError('Category and monthly limit are required')
      return
    }

    if (isNaN(Number(formData.monthlyLimit)) || Number(formData.monthlyLimit) <= 0) {
      setError('Please enter a valid monthly limit amount')
      return
    }

    setLoading(true)

    try {
      if (editingLimit) {
        // Update existing limit
        const { error } = await supabase
          .from('budget_limits')
          .update({
            monthly_limit: Number(formData.monthlyLimit),
            warning_threshold: Number(formData.warningThreshold)
          })
          .eq('user_id', userId)
          .eq('category', editingLimit.category)
          .eq('is_active', true)

        if (error) throw error
      } else {
        // Create new limit
        const { error } = await supabase
          .from('budget_limits')
          .insert({
            user_id: userId,
            category: formData.category,
            monthly_limit: Number(formData.monthlyLimit),
            current_spending: 0,
            percentage_used: 0,
            warning_threshold: Number(formData.warningThreshold),
            is_active: true
          })

        if (error) throw error
      }

      onSuccess()
    } catch (error) {
      console.error('Error saving budget limit:', error)
      setError('Failed to save budget limit. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-black">
            <Target className="h-5 w-5" />
            {editingLimit ? 'Edit Budget Limit' : 'Add Budget Limit'}
          </h2>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div>
            <label className="block text-sm font-medium mb-1 text-black">Category</label>
            <input
              type="text"
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              disabled={!!editingLimit}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-black rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-600"
              placeholder="e.g., Food and Dining, Transportation"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-black">Monthly Limit</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-black dark:text-black" />
              <input
                type="number"
                step="0.01"
                value={formData.monthlyLimit}
                onChange={(e) => setFormData(prev => ({ ...prev, monthlyLimit: e.target.value }))}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-black rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-black">Warning Threshold (%)</label>
            <input
              type="number"
              min="1"
              max="100"
              value={formData.warningThreshold}
              onChange={(e) => setFormData(prev => ({ ...prev, warningThreshold: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-black rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="80"
            />
            <p className="text-xs text-black dark:text-gray-300 mt-1">Alert when spending reaches this percentage</p>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1 text-black border-input hover:bg-gray-100">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              {editingLimit ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Category Details View Component
interface CategoryDetailsViewProps {
  category: string
  limit?: CategoryLimit
  onClose: () => void
}

function CategoryDetailsView({ category, limit, onClose }: CategoryDetailsViewProps) {
  if (!limit) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-black">
            <BarChart3 className="h-5 w-5" />
            {category} Details
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4 space-y-4">
          {/* Overview */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-black dark:text-gray-300">Current Spending</p>
                <p className="text-xl font-bold text-red-600">${limit.currentSpending.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-black dark:text-gray-300">Monthly Limit</p>
                <p className="text-xl font-bold text-blue-600">${limit.monthly_limit.toFixed(2)}</p>
              </div>
            </div>

            <div className="mt-3">
              <Progress value={Math.min(100, limit.percentageUsed)} className="h-3" />
              <div className="flex justify-between text-xs text-black dark:text-gray-300 mt-1">
                <span>{limit.percentageUsed.toFixed(1)}% used</span>
                <span>${limit.remainingAmount.toFixed(2)} remaining</span>
              </div>
            </div>
          </div>

          {/* Detailed Metrics */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-black dark:text-gray-300">Daily Allowance:</span>
                <span className="font-medium">${limit.dailyAllowance.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-black dark:text-gray-300">Current Daily Rate:</span>
                <span className={`font-medium ${
                  (limit.recentSpending / 7) > limit.dailyAllowance ? 'text-red-600' : 'text-green-600'
                }`}>
                  ${(limit.recentSpending / 7).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-black dark:text-gray-300">Recent Spending (7d):</span>
                <span className="font-medium">${limit.recentSpending.toFixed(2)}</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-black dark:text-gray-300">Days Remaining:</span>
                <span className="font-medium">{limit.daysRemaining}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-black dark:text-gray-300">Projected Total:</span>
                <span className={`font-medium ${
                  limit.projectedSpending > limit.monthly_limit ? 'text-red-600' : 'text-green-600'
                }`}>
                  ${limit.projectedSpending.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-black dark:text-gray-300">Trend:</span>
                <span className={`font-medium capitalize ${
                  limit.trend === 'improving' ? 'text-green-600' :
                  limit.trend === 'worsening' ? 'text-red-600' : 'text-blue-600'
                }`}>
                  {limit.trend}
                </span>
              </div>
            </div>
          </div>

          {/* Status Alert */}
          {limit.status !== 'safe' && (
            <Alert variant={limit.status === 'exceeded' ? 'destructive' : 'default' as any}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {limit.status === 'exceeded' &&
                  `Budget exceeded by $${(limit.currentSpending - limit.monthly_limit).toFixed(2)}`
                }
                {limit.status === 'danger' &&
                  `Only $${limit.remainingAmount.toFixed(2)} remaining in budget`
                }
                {limit.status === 'warning' &&
                  `${limit.percentageUsed.toFixed(1)}% of budget used`
                }
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button variant="outline" onClick={onClose} className="flex-1 text-black border-input hover:bg-gray-100">
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Manage Limits View Component
interface ManageLimitsViewProps {
  userId: string
  limits: CategoryLimit[]
  onSuccess: () => void
  onClose: () => void
}

function ManageLimitsView({ userId, limits, onSuccess, onClose }: ManageLimitsViewProps) {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleToggleActive = async (limitId: string, isActive: boolean) => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('budget_limits')
        .update({ is_active: !isActive })
        .eq('id', limitId)

      if (error) throw error
      onSuccess()
    } catch (error) {
      console.error('Error toggling limit:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (limitId: string, category: string) => {
    if (confirm(`Are you sure you want to delete the budget limit for ${category}?`)) {
      setLoading(true)
      try {
        const { error } = await supabase
          .from('budget_limits')
          .delete()
          .eq('id', limitId)

        if (error) throw error
        onSuccess()
      } catch (error) {
        console.error('Error deleting limit:', error)
      } finally {
        setLoading(false)
      }
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-black">
            <Settings className="h-5 w-5" />
            Manage Budget Limits
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4 overflow-y-auto max-h-96">
          {limits.length === 0 ? (
            <div className="text-center py-8">
              <Target className="h-12 w-12 text-black dark:text-black mx-auto mb-4" />
              <p className="text-black dark:text-gray-300">No budget limits created yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {limits.map(limit => (
                <div key={limit.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700/50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium capitalize text-black">{limit.category}</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        limit.status === 'safe' ? 'bg-green-100 text-green-700' :
                        limit.status === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                        limit.status === 'danger' ? 'bg-orange-100 text-orange-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {limit.status}
                      </span>
                    </div>
                    <div className="text-sm text-black dark:text-gray-300">
                      ${limit.currentSpending.toFixed(2)} / ${limit.monthly_limit.toFixed(2)}
                      ({limit.percentageUsed.toFixed(1)}%)
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(limit.id, true)}
                      disabled={loading}
                      className="text-green-700 border-green-300 hover:bg-green-50"
                    >
                      Active
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(limit.id, limit.category)}
                      disabled={loading}
                      className="text-red-700 border-red-300 hover:bg-red-50"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2 p-4 border-t">
          <Button variant="outline" onClick={onClose} className="flex-1 text-black border-input hover:bg-gray-100">
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}