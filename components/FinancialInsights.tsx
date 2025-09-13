'use client'

import { useState, useEffect } from 'react'
import { Brain, TrendingUp, PiggyBank, AlertCircle, Loader2, DollarSign, Activity, Zap, Lightbulb } from 'lucide-react'
import type { Transaction, Bill } from '@/types/financial'
import { parseCategories } from '@/types/financial'

interface FinancialInsightsProps {
  transactions: Transaction[]
  bills: Bill[]
  userId: string
}

interface AIInsight {
  type: 'warning' | 'success' | 'info' | 'tip'
  title: string
  description: string
  metric?: string
  value?: number
  trend?: 'up' | 'down' | 'stable'
}

export default function FinancialInsights({ transactions, bills, userId }: FinancialInsightsProps) {
  const [insights, setInsights] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([])
  const [savingsGoal, setSavingsGoal] = useState({
    amount: '',
    deadline: '',
    description: '',
  })

  // Calculate spending by category
  const calculateCategorySpending = () => {
    const categoryTotals: Record<string, number> = {}
    
    transactions.forEach(transaction => {
      if (transaction.transaction_type === 'expense' || transaction.amount < 0) {
        const category = transaction.category || 'Uncategorized'
        categoryTotals[category] = (categoryTotals[category] || 0) + Math.abs(transaction.amount)
      }
    })
    
    return categoryTotals
  }

  // Calculate monthly spending trends
  const calculateMonthlyTrends = () => {
    const monthlyTotals: Record<string, { income: number; expenses: number }> = {}
    
    transactions.forEach(transaction => {
      const date = new Date(transaction.date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      
      if (!monthlyTotals[monthKey]) {
        monthlyTotals[monthKey] = { income: 0, expenses: 0 }
      }
      
      if (transaction.transaction_type === 'income' || transaction.amount > 0) {
        monthlyTotals[monthKey].income += Math.abs(transaction.amount)
      } else {
        monthlyTotals[monthKey].expenses += Math.abs(transaction.amount)
      }
    })
    
    return monthlyTotals
  }

  // Calculate expense categories breakdown from bills
  const calculateCategoryBreakdown = () => {
    const categoryTotals: Record<string, number> = {}
    
    // Enhanced color palette
    const categoryColors: Record<string, string> = {
      'Housing': '#ef4444',
      'Rent': '#dc2626',
      'Mortgage': '#b91c1c',
      'Utilities': '#8b5cf6',
      'Food': '#f59e0b',
      'Food & Dining': '#f97316',
      'Groceries': '#fb923c',
      'Transportation': '#3b82f6',
      'Entertainment': '#10b981',
      'Streaming': '#059669',
      'Subscription': '#06b6d4',
      'Technology': '#0ea5e9',
      'AI Services': '#6366f1',
      'Insurance': '#ec4899',
      'Health': '#f43f5e',
      'Fitness': '#e11d48',
      'Medical': '#be123c',
      'Other': '#6b7280'
    }
    
    bills.forEach(bill => {
      if (!bill.is_active) return
      
      // Convert billing cycle to monthly amount
      const multipliers: Record<string, number> = {
        'monthly': 1,
        'biweekly': 2.16667,
        'weekly': 4.33333,
        'quarterly': 0.33333,
        'annual': 0.08333,
      }
      
      const monthlyAmount = bill.amount * (multipliers[bill.billing_cycle] || 1)
      
      if (bill.categories && Array.isArray(bill.categories) && bill.categories.length > 0) {
        const amountPerCategory = monthlyAmount / bill.categories.length
        bill.categories.forEach((category: any) => {
          const categoryName = String(category)
          categoryTotals[categoryName] = (categoryTotals[categoryName] || 0) + amountPerCategory
        })
      } else {
        categoryTotals['Other'] = (categoryTotals['Other'] || 0) + monthlyAmount
      }
    })
    
    // Convert to array and sort
    const sortedCategories = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6) // Top 6 categories
    
    return sortedCategories.map(([name, value]) => ({
      name,
      value,
      color: categoryColors[name] || '#6b7280'
    }))
  }

  const generateInsights = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/insights/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          transactions: transactions.slice(0, 50),
          bills,
          goal: savingsGoal.amount ? {
            amount: parseFloat(savingsGoal.amount),
            deadline: savingsGoal.deadline,
            description: savingsGoal.description,
          } : null,
        }),
      })

      if (!response.ok) throw new Error('Failed to generate insights')
      
      const data = await response.json()
      
      // Parse insights if it's a string
      let parsedInsights
      try {
        parsedInsights = typeof data.insights === 'string' 
          ? JSON.parse(data.insights) 
          : data.insights
      } catch (e) {
        parsedInsights = { insights: data.insights }
      }
      
      setInsights(parsedInsights)
      
      // Generate AI insights based on data
      generateAIInsightsFromData()
    } catch (error) {
      console.error('Error generating insights:', error)
      setInsights('Failed to generate insights. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const generateAIInsightsFromData = () => {
    const insights: AIInsight[] = []
    const categorySpending = calculateCategorySpending()
    const monthlyTrends = calculateMonthlyTrends()
    
    // Calculate average monthly expenses
    const monthlyExpenses = Object.values(monthlyTrends).map(m => m.expenses)
    const avgMonthlyExpenses = monthlyExpenses.reduce((a, b) => a + b, 0) / monthlyExpenses.length
    
    // Calculate average monthly income
    const monthlyIncome = Object.values(monthlyTrends).map(m => m.income)
    const avgMonthlyIncome = monthlyIncome.reduce((a, b) => a + b, 0) / monthlyIncome.length
    
    // Savings rate insight
    const savingsRate = ((avgMonthlyIncome - avgMonthlyExpenses) / avgMonthlyIncome) * 100
    if (savingsRate < 20) {
      insights.push({
        type: 'warning',
        title: 'Low Savings Rate',
        description: `You're saving ${savingsRate.toFixed(1)}% of income. Aim for at least 20%.`,
        metric: 'Savings Rate',
        value: savingsRate,
        trend: 'down'
      })
    } else {
      insights.push({
        type: 'success',
        title: 'Healthy Savings Rate',
        description: `Great! You're saving ${savingsRate.toFixed(1)}% of your income.`,
        metric: 'Savings Rate',
        value: savingsRate,
        trend: 'up'
      })
    }
    
    // Top spending category insight
    const topCategories = Object.entries(categorySpending).sort((a, b) => b[1] - a[1])
    if (topCategories.length > 0) {
      const [topCategory, topAmount] = topCategories[0]
      insights.push({
        type: 'info',
        title: 'Highest Spending Category',
        description: `${topCategory} accounts for $${topAmount.toFixed(2)} of your expenses.`,
        metric: topCategory,
        value: topAmount,
        trend: 'stable'
      })
    }
    
    // Bill optimization insight
    const totalBillAmount = bills.reduce((sum, bill) => {
      if (!bill.is_active) return sum
      const multipliers: Record<string, number> = {
        'monthly': 1,
        'biweekly': 2.16667,
        'weekly': 4.33333,
        'quarterly': 0.33333,
        'annual': 0.08333,
      }
      return sum + (bill.amount * (multipliers[bill.billing_cycle] || 1))
    }, 0)
    
    if (totalBillAmount > avgMonthlyIncome * 0.5) {
      insights.push({
        type: 'warning',
        title: 'High Fixed Costs',
        description: `Your bills are ${((totalBillAmount / avgMonthlyIncome) * 100).toFixed(1)}% of income. Consider reducing fixed expenses.`,
        metric: 'Fixed Costs',
        value: (totalBillAmount / avgMonthlyIncome) * 100,
        trend: 'up'
      })
    }
    
    setAiInsights(insights)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertCircle className="w-5 h-5 text-amber-500" />
      case 'success': return <Zap className="w-5 h-5 text-green-500" />
      case 'info': return <Activity className="w-5 h-5 text-blue-500" />
      case 'tip': return <Lightbulb className="w-5 h-5 text-purple-500" />
      default: return <Brain className="w-5 h-5 text-gray-500" />
    }
  }

  useEffect(() => {
    // Generate initial insights when component mounts
    if (transactions.length > 0 || bills.length > 0) {
      generateAIInsightsFromData()
    }
  }, [transactions, bills])

  const categorySpending = calculateCategorySpending()
  const topCategories = Object.entries(categorySpending)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
  
  const monthlyTrends = calculateMonthlyTrends()
  const sortedMonths = Object.entries(monthlyTrends)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-6) // Last 6 months

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-blue-900">AI Financial Insights</h2>
        <button
          onClick={generateInsights}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition-colors flex items-center gap-2"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              Analyzing...
            </>
          ) : (
            <>
              <Brain className="w-4 h-4" />
              Generate Insights
            </>
          )}
        </button>
      </div>

      {/* AI Insights Cards */}
      {aiInsights.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {aiInsights.map((insight, index) => (
            <div key={index} className="bg-white rounded-lg border p-4">
              <div className="flex items-start gap-3">
                {getInsightIcon(insight.type)}
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{insight.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                  {insight.metric && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-gray-500">{insight.metric}:</span>
                      <span className="text-sm font-semibold">
                        {typeof insight.value === 'number' 
                          ? insight.value > 100 
                            ? formatCurrency(insight.value)
                            : `${insight.value.toFixed(1)}%`
                          : insight.value}
                      </span>
                      {insight.trend && (
                        <span className={`text-xs ${
                          insight.trend === 'up' ? 'text-green-600' : 
                          insight.trend === 'down' ? 'text-red-600' : 
                          'text-gray-600'
                        }`}>
                          {insight.trend === 'up' ? '↑' : insight.trend === 'down' ? '↓' : '→'}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Spending Trends */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">Monthly Spending Trends</h3>
          <div className="space-y-3">
            {sortedMonths.length > 0 ? (
              sortedMonths.map(([month, data]) => {
                const date = new Date(month + '-01')
                const monthName = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
                const netFlow = data.income - data.expenses
                
                return (
                  <div key={month} className="flex items-center justify-between">
                    <span className="text-gray-600">{monthName}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-green-600 text-sm">+{formatCurrency(data.income)}</span>
                      <span className="text-red-600 text-sm">-{formatCurrency(data.expenses)}</span>
                      <span className={`font-medium ${netFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(netFlow)}
                      </span>
                    </div>
                  </div>
                )
              })
            ) : (
              // Show estimated monthly bills when no transaction data
              <div>
                <div className="text-sm text-gray-500 mb-3">Based on your bills:</div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Monthly Bills Total</span>
                    <span className="font-medium text-red-600">
                      -{formatCurrency(bills.reduce((sum, bill) => {
                        if (!bill.is_active) return sum
                        const multipliers: Record<string, number> = {
                          'monthly': 1,
                          'biweekly': 2.16667,
                          'weekly': 4.33333,
                          'quarterly': 0.33333,
                          'annual': 0.08333,
                        }
                        return sum + (bill.amount * (multipliers[bill.billing_cycle] || 1))
                      }, 0))}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    Add transactions to see detailed spending trends
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Top Spending Categories */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">Top Spending Categories</h3>
          <div className="space-y-3">
            {topCategories.length > 0 ? (
              topCategories.map(([category, amount]) => (
                <div key={category} className="flex items-center justify-between">
                  <span className="text-gray-600">{category}</span>
                  <span className="font-medium">{formatCurrency(amount)}</span>
                </div>
              ))
            ) : (
              // Use bills categories if no transaction data
              calculateCategoryBreakdown().slice(0, 5).map(cat => (
                <div key={cat.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="text-gray-600">{cat.name}</span>
                  </div>
                  <span className="font-medium">{formatCurrency(cat.value)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Bill Payment Schedule */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">Bill Payment Schedule</h3>
          <div className="space-y-2">
            {bills.filter(b => b.is_active).slice(0, 5).map(bill => (
              <div key={bill.id} className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{bill.name}</p>
                  <p className="text-xs text-gray-500">{bill.billing_cycle}</p>
                </div>
                <span className="font-medium text-gray-900">{formatCurrency(bill.amount)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Savings Goal */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">Set a Savings Goal</h3>
          <div className="space-y-3">
            <input
              type="number"
              placeholder="Goal amount ($)"
              value={savingsGoal.amount}
              onChange={(e) => setSavingsGoal({ ...savingsGoal, amount: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="date"
              value={savingsGoal.deadline}
              onChange={(e) => setSavingsGoal({ ...savingsGoal, deadline: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="What's this goal for?"
              value={savingsGoal.description}
              onChange={(e) => setSavingsGoal({ ...savingsGoal, description: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* AI Generated Insights Text */}
      {insights && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-blue-900">AI Analysis</h3>
          </div>
          <div className="space-y-4">
            {/* Main insights text */}
            <div className="prose prose-sm text-gray-700 whitespace-pre-wrap">
              {typeof insights === 'string' ? insights : insights.insights}
            </div>
            
            {/* Monthly Budget Breakdown */}
            {insights.monthlyBudget && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-blue-200">
                <div className="text-center">
                  <p className="text-xs text-blue-600">Income</p>
                  <p className="text-lg font-semibold text-blue-900">
                    {formatCurrency(insights.monthlyBudget.income || 0)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-blue-600">Bills</p>
                  <p className="text-lg font-semibold text-blue-900">
                    {formatCurrency(insights.monthlyBudget.bills || 0)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-blue-600">Spending</p>
                  <p className="text-lg font-semibold text-blue-900">
                    {formatCurrency(insights.monthlyBudget.spending || 0)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-blue-600">Save</p>
                  <p className="text-lg font-semibold text-green-600">
                    {formatCurrency(insights.monthlyBudget.recommended_savings || 0)}
                  </p>
                </div>
              </div>
            )}
            
            {/* Savings Plan */}
            {insights.savingsPlan && (
              <div className="bg-green-50 rounded-lg p-3 mt-3">
                <h4 className="text-sm font-semibold text-green-900 mb-2">Recommended Savings Plan</h4>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-xs text-green-600">Per Paycheck</p>
                    <p className="font-semibold text-green-800">
                      {formatCurrency(insights.savingsPlan.per_paycheck || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-green-600">Monthly Total</p>
                    <p className="font-semibold text-green-800">
                      {formatCurrency(insights.savingsPlan.monthly_total || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-green-600">% of Income</p>
                    <p className="font-semibold text-green-800">
                      {insights.savingsPlan.percentage || 0}%
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Action Tips */}
            {insights.tips && insights.tips.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">Action Items</h4>
                <ul className="space-y-1">
                  {insights.tips.map((tip: string, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-blue-600 mt-0.5">•</span>
                      <span className="text-sm text-gray-700">{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}