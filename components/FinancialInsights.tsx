'use client'

import { useState, useEffect } from 'react'
import { Brain, TrendingUp, PiggyBank, AlertCircle, Loader2, DollarSign, Activity, Zap, Lightbulb } from 'lucide-react'
import type { Transaction, Bill } from '@/types/financial'
import { parseCategories } from '@/types/financial'
import AIAnalysisCard from '@/components/AIAnalysisCard'

interface FinancialInsightsProps {
  transactions: Transaction[]
  bills: Bill[]
  incomeSources: any[]
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

export default function FinancialInsights({ transactions, bills, incomeSources, userId }: FinancialInsightsProps) {
  const [insights, setInsights] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([])

  // Calculate spending by category (both transactions and bills)
  const calculateCategorySpending = () => {
    const categoryTotals: Record<string, number> = {}

    // Process transactions
    transactions.forEach(transaction => {
      if ((transaction.transaction_type === 'expense' || transaction.amount < 0) && !transaction.exclude_from_spending) {
        const amount = Math.abs(transaction.amount)

        // Handle multiple categories
        if (transaction.categories && Array.isArray(transaction.categories) && transaction.categories.length > 0) {
          const amountPerCategory = amount / transaction.categories.length
          transaction.categories.forEach(category => {
            categoryTotals[category] = (categoryTotals[category] || 0) + amountPerCategory
          })
        } else {
          const category = transaction.category || 'Uncategorized'
          categoryTotals[category] = (categoryTotals[category] || 0) + amount
        }
      }
    })

    // Process bills (convert to monthly amounts)
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
        categoryTotals['Uncategorized'] = (categoryTotals['Uncategorized'] || 0) + monthlyAmount
      }
    })

    return categoryTotals
  }

  // Calculate spending by merchant (using transaction description as merchant name)
  const calculateMerchantSpending = () => {
    const merchantTotals: Record<string, { total: number; count: number }> = {}

    transactions.forEach(transaction => {
      if (transaction.transaction_type === 'expense' || transaction.amount < 0) {
        // Clean up merchant name from transaction description
        const merchantName = cleanMerchantName(transaction.description)
        const amount = Math.abs(transaction.amount)

        if (!merchantTotals[merchantName]) {
          merchantTotals[merchantName] = { total: 0, count: 0 }
        }

        merchantTotals[merchantName].total += amount
        merchantTotals[merchantName].count += 1
      }
    })

    return merchantTotals
  }

  // Clean merchant name from transaction description
  const cleanMerchantName = (description: string): string => {
    const cleaned = description
      .toLowerCase()
      .replace(/\b(payment|autopay|recurring|monthly|debit|card|purchase|pos|transaction)\b/g, '')
      .replace(/\b\d{4,}\b/g, '') // Remove long numbers
      .replace(/[^\w\s]/g, ' ') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim()
      .split(' ')
      .filter(word => word.length > 2) // Remove short words
      .slice(0, 3) // Take first 3 meaningful words
      .join(' ')
      .trim()

    return cleaned ? toTitleCase(cleaned) : 'Unknown Merchant'
  }

  // Convert string to Title Case
  const toTitleCase = (str: string): string => {
    return str
      .split(' ')
      .map(word => {
        if (word.length === 0) return word
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      })
      .join(' ')
  }

  // Calculate monthly income from income sources
  const calculateMonthlyIncome = () => {
    return incomeSources.reduce((total, source) => {
      if (!source.is_active) return total

      const multipliers: Record<string, number> = {
        'weekly': 4.33333,
        'biweekly': 2.16667,
        'monthly': 1,
        'quarterly': 0.33333,
        'annual': 0.08333,
        'one-time': 0 // Don't include one-time in monthly calculations
      }

      const monthlyAmount = source.amount * (multipliers[source.frequency] || 0)
      return total + monthlyAmount
    }, 0)
  }

  // Calculate monthly spending trends with proper income sources integration
  const calculateMonthlyTrends = () => {
    const monthlyTotals: Record<string, { income: number; expenses: number; isEstimate?: boolean }> = {}

    // Process actual expense transactions only (don't use transactions for income)
    transactions.forEach(transaction => {
      if (transaction.transaction_type === 'expense' || transaction.amount < 0) {
        const date = new Date(transaction.date)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

        if (!monthlyTotals[monthKey]) {
          monthlyTotals[monthKey] = { income: 0, expenses: 0, isEstimate: false }
        }

        monthlyTotals[monthKey].expenses += Math.abs(transaction.amount)
      }
    })

    // Calculate monthly income from income sources
    const monthlyIncomeFromSources = calculateMonthlyIncome()

    // Calculate monthly bills total
    const monthlyBillsTotal = bills.reduce((sum, bill) => {
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

    // Calculate historical average expenses (from transactions only)
    const historicalExpenses = Object.values(monthlyTotals)
    const avgTransactionExpenses = historicalExpenses.length > 0
      ? historicalExpenses.reduce((sum, data) => sum + data.expenses, 0) / historicalExpenses.length
      : 0

    // Add income from sources to all months (historical and future)
    Object.keys(monthlyTotals).forEach(monthKey => {
      monthlyTotals[monthKey].income = monthlyIncomeFromSources
    })

    // Get current date and ensure we show the correct current month
    const today = new Date()
    const currentYear = today.getFullYear()
    const currentMonth = today.getMonth() + 1 // September = 9
    const currentMonthKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}`

    // Add current month if it doesn't exist
    if (!monthlyTotals[currentMonthKey]) {
      monthlyTotals[currentMonthKey] = {
        income: monthlyIncomeFromSources,
        expenses: avgTransactionExpenses + monthlyBillsTotal,
        isEstimate: true
      }
    } else {
      // Current month exists with partial data - estimate remaining days
      const daysInMonth = new Date(currentYear, currentMonth, 0).getDate()
      const daysPassed = today.getDate()
      const remainingDays = Math.max(0, daysInMonth - daysPassed)

      if (remainingDays > 0) {
        const dailyAvgExpenses = avgTransactionExpenses / 30
        monthlyTotals[currentMonthKey].expenses += dailyAvgExpenses * remainingDays
        monthlyTotals[currentMonthKey].isEstimate = true
      }

      // Always add bills to current month
      monthlyTotals[currentMonthKey].expenses += monthlyBillsTotal
      monthlyTotals[currentMonthKey].income = monthlyIncomeFromSources
    }

    // Add next 2 months estimates
    for (let i = 1; i <= 2; i++) {
      const futureDate = new Date(currentYear, currentMonth - 1 + i, 1)
      const futureMonthKey = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, '0')}`

      monthlyTotals[futureMonthKey] = {
        income: monthlyIncomeFromSources,
        expenses: avgTransactionExpenses + monthlyBillsTotal,
        isEstimate: true
      }
    }

    return monthlyTotals
  }

  // Calculate expense categories breakdown from bills and transactions
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

    // Process bills (convert to monthly amounts)
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

    // Process transactions
    transactions.forEach(transaction => {
      if ((transaction.transaction_type === 'expense' || transaction.amount < 0) && !transaction.exclude_from_spending) {
        const amount = Math.abs(transaction.amount)

        // Handle multiple categories
        if (transaction.categories && Array.isArray(transaction.categories) && transaction.categories.length > 0) {
          const amountPerCategory = amount / transaction.categories.length
          transaction.categories.forEach(category => {
            categoryTotals[category] = (categoryTotals[category] || 0) + amountPerCategory
          })
        } else {
          const category = transaction.category || 'Other'
          categoryTotals[category] = (categoryTotals[category] || 0) + amount
        }
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
          incomeSources,
        }),
      })

      if (!response.ok) throw new Error('Failed to generate insights')
      
      const data = await response.json()

      // The AI service returns insights as a string that may contain JSON
      let processedInsights
      if (typeof data.insights === 'string') {
        // Try to parse as JSON first in case it's structured
        try {
          const parsed = JSON.parse(data.insights)
          // If it's an array, take the first element
          if (Array.isArray(parsed)) {
            processedInsights = parsed[0]
          } else {
            processedInsights = parsed
          }
        } catch (e) {
          // It's plain text insights from AI, keep as string
          processedInsights = data.insights
        }
      } else {
        // It's already an object
        processedInsights = data.insights
        // If it's an array, take the first element
        if (Array.isArray(processedInsights)) {
          processedInsights = processedInsights[0]
        }
      }

      setInsights(processedInsights)
      
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
    const monthlyIncomeFromSources = calculateMonthlyIncome()

    // Calculate average monthly expenses (exclude estimated future months for accuracy)
    const historicalExpenses = Object.entries(monthlyTrends)
      .filter(([_, data]) => !data.isEstimate)
      .map(([_, data]) => data.expenses)

    const avgMonthlyExpenses = historicalExpenses.length > 0
      ? historicalExpenses.reduce((a, b) => a + b, 0) / historicalExpenses.length
      : Object.values(monthlyTrends).reduce((sum, data) => sum + data.expenses, 0) / Object.values(monthlyTrends).length

    // Use income from sources instead of transaction-based income
    const monthlyIncome = monthlyIncomeFromSources

    // Savings rate insight
    if (monthlyIncome > 0) {
      const savingsRate = ((monthlyIncome - avgMonthlyExpenses) / monthlyIncome) * 100
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
    } else {
      insights.push({
        type: 'warning',
        title: 'No Income Sources',
        description: 'Add your income sources to get better financial insights and tracking.',
        metric: 'Income Sources',
        value: incomeSources.length,
        trend: 'down'
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
    
    if (monthlyIncome > 0 && totalBillAmount > monthlyIncome * 0.5) {
      insights.push({
        type: 'warning',
        title: 'High Fixed Costs',
        description: `Your bills are ${((totalBillAmount / monthlyIncome) * 100).toFixed(1)}% of income. Consider reducing fixed expenses.`,
        metric: 'Fixed Costs',
        value: (totalBillAmount / monthlyIncome) * 100,
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
      default: return <Brain className="w-5 h-5 text-card-foreground" />
    }
  }

  useEffect(() => {
    // Generate initial insights when component mounts
    if (transactions.length > 0 || bills.length > 0 || incomeSources.length > 0) {
      generateAIInsightsFromData()
    }
  }, [transactions, bills, incomeSources])

  const categorySpending = calculateCategorySpending()
  const topCategories = Object.entries(categorySpending)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8) // Show top 8 categories instead of 5

  const merchantSpending = calculateMerchantSpending()
  const topMerchants = Object.entries(merchantSpending)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 5)
    .map(([merchant, data]) => ({
      name: merchant,
      total: data.total,
      count: data.count,
      average: data.total / data.count
    }))

  const monthlyTrends = calculateMonthlyTrends()
  const sortedMonths = Object.entries(monthlyTrends)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-8) // Show more months to include current + 2 future months

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-black">AI Financial Insights</h2>
        <button
          onClick={generateInsights}
          disabled={loading}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 disabled:bg-primary/50 transition-colors flex items-center gap-2"
          title="💡 Generate AI-powered financial insights based on your spending patterns, bills, and savings goals. Get personalized recommendations for budgeting, saving strategies, and actionable tips to improve your financial health."
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
            <div key={index} className="bg-card rounded-lg border border-input p-4">
              <div className="flex items-start gap-3">
                {getInsightIcon(insight.type)}
                <div className="flex-1">
                  <h4 className="font-semibold text-card-foreground">{insight.title}</h4>
                  <p className="text-sm text-card-foreground mt-1">{insight.description}</p>
                  {insight.metric && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-card-foreground">{insight.metric}:</span>
                      <span className="text-sm font-semibold text-card-foreground">
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
                          'text-card-foreground'
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Spending Trends */}
        <div className="bg-card rounded-lg border border-input p-6">
          <h3 className="text-lg font-semibold text-card-foreground mb-4">Monthly Spending Trends</h3>
          <div className="space-y-3">
            {sortedMonths.length > 0 ? (
              sortedMonths.map(([month, data]) => {
                const date = new Date(month + '-01')
                const currentDate = new Date()
                const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
                const monthName = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
                const netFlow = data.income - data.expenses
                const isCurrentOrFuture = month >= currentMonth
                const isEstimate = data.isEstimate

                return (
                  <div key={month} className={`flex items-center justify-between ${isEstimate ? 'opacity-75' : ''}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-card-foreground">{monthName}</span>
                      {isEstimate && (
                        <span className="text-xs text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">
                          est.
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`text-sm ${isEstimate ? 'text-green-500' : 'text-green-600'}`}>
                        +{formatCurrency(data.income)}
                      </span>
                      <span className={`text-sm ${isEstimate ? 'text-red-500' : 'text-red-600'}`}>
                        -{formatCurrency(data.expenses)}
                      </span>
                      <span className={`font-medium ${netFlow >= 0 ? (isEstimate ? 'text-green-500' : 'text-green-600') : (isEstimate ? 'text-red-500' : 'text-red-600')}`}>
                        {formatCurrency(netFlow)}
                      </span>
                    </div>
                  </div>
                )
              })
            ) : (
              // Show estimated monthly bills when no transaction data
              <div>
                <div className="text-sm text-card-foreground mb-3">Based on your bills:</div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-card-foreground">Monthly Bills Total</span>
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
                  <div className="text-xs text-card-foreground mt-2">
                    Add transactions to see detailed spending trends
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Top Spending Categories */}
        <div className="bg-card rounded-lg border border-input p-6">
          <h3 className="text-lg font-semibold text-card-foreground mb-4">Top Spending Categories</h3>
          <div className="space-y-3">
            {topCategories.length > 0 ? (
              topCategories.map(([category, amount]) => (
                <div key={category} className="flex items-center justify-between">
                  <span className="text-card-foreground">{category}</span>
                  <span className="font-medium text-card-foreground">{formatCurrency(amount)}</span>
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
                    <span className="text-card-foreground">{cat.name}</span>
                  </div>
                  <span className="font-medium text-card-foreground">{formatCurrency(cat.value)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Merchants by Spending */}
        <div className="bg-card rounded-lg border border-input p-6">
          <h3 className="text-lg font-semibold text-card-foreground mb-4">Top Merchants by Spending</h3>
          <div className="space-y-3">
            {topMerchants.length > 0 ? (
              topMerchants.map((merchant) => (
                <div key={merchant.name} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-card-foreground font-medium text-sm">{merchant.name}</span>
                    <span className="font-semibold text-card-foreground">{formatCurrency(merchant.total)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-card-foreground">
                    <span>{merchant.count} transaction{merchant.count !== 1 ? 's' : ''}</span>
                    <span>Avg: {formatCurrency(merchant.average)}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-card-foreground">
                <p className="text-sm">No merchant data available</p>
                <p className="text-xs mt-1">Add expense transactions to see top merchants</p>
              </div>
            )}
          </div>
        </div>

        {/* Bill Payment Schedule */}
        <div className="bg-card rounded-lg border border-input p-6">
          <h3 className="text-lg font-semibold text-card-foreground mb-4">Bill Payment Schedule</h3>
          <div className="space-y-2">
            {bills.filter(b => b.is_active).slice(0, 5).map(bill => (
              <div key={bill.id} className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-card-foreground">{bill.name}</p>
                  <p className="text-xs text-card-foreground">{bill.billing_cycle}</p>
                </div>
                <span className="font-medium text-card-foreground">{formatCurrency(bill.amount)}</span>
              </div>
            ))}
          </div>
        </div>

      </div>


      {/* AI Generated Insights */}
      {insights && (
        <AIAnalysisCard
          analysisText={typeof insights === 'string' ? insights : JSON.stringify(insights)}
        />
      )}
    </div>
  )
}