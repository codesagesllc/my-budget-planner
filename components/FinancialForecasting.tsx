'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/supabase'
import FinancialGoals from './FinancialGoals'
import { 
  TrendingUp, TrendingDown, DollarSign, Brain, 
  Calendar, Target, AlertCircle, Zap, ChevronRight,
  BarChart3, PieChart, Activity, Lightbulb
} from 'lucide-react'
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RePieChart, Pie, Cell } from 'recharts'

type Transaction = Database['public']['Tables']['transactions']['Row']
type IncomeSources = Database['public']['Tables']['income_sources']['Row']
type Bills = Database['public']['Tables']['bills']['Row']

interface ForecastingProps {
  userId: string
  transactions: Transaction[]
  incomeSources: IncomeSources[]
  bills: Bills[]
}

interface ForecastData {
  month: string
  predictedIncome: number
  predictedExpenses: number
  predictedSavings: number
  actualIncome?: number
  actualExpenses?: number
  actualSavings?: number
}

interface AIInsight {
  type: 'warning' | 'success' | 'info' | 'tip'
  title: string
  description: string
  metric?: string
  value?: number
  trend?: 'up' | 'down' | 'stable'
}

export default function FinancialForecasting({ userId, transactions, incomeSources, bills }: ForecastingProps) {
  const [forecastData, setForecastData] = useState<ForecastData[]>([])
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([])
  const [selectedMethod, setSelectedMethod] = useState<'linear' | 'exponential' | 'moving-average' | 'ai'>('ai')
  const [loading, setLoading] = useState(true)
  const [savingsGoal, setSavingsGoal] = useState(1000)
  const [emergencyFund, setEmergencyFund] = useState(0)
  const [showGoalsModal, setShowGoalsModal] = useState(false)
  const supabase = createClient()

  const COLORS = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6']

  useEffect(() => {
    generateForecast()
  }, [transactions, incomeSources, bills, selectedMethod])

  const calculateMonthlyIncome = () => {
    return incomeSources
      .filter(income => income.is_active)
      .reduce((sum, income) => {
        const monthlyMultipliers: Record<string, number> = {
          'monthly': 1,
          'biweekly': 2.16667,
          'weekly': 4.33333,
          'quarterly': 0.33333,
          'annual': 0.08333,
          'one-time': 0
        }
        return sum + (income.amount * (monthlyMultipliers[income.frequency] || 0))
      }, 0)
  }

  const calculateMonthlyExpenses = () => {
    return bills
      .filter(bill => bill.is_active)
      .reduce((sum, bill) => {
        const cycleMultipliers: Record<string, number> = {
          'monthly': 1,
          'biweekly': 2.16667,
          'weekly': 4.33333,
          'quarterly': 0.33333,
          'annual': 0.08333
        }
        return sum + (bill.amount * (cycleMultipliers[bill.billing_cycle] || 1))
      }, 0)
  }

  const generateForecast = async () => {
    setLoading(true)
    
    // Get historical data from transactions
    const historicalData = getHistoricalData()
    
    // Generate forecast based on selected method
    let forecast: ForecastData[] = []
    
    switch (selectedMethod) {
      case 'linear':
        forecast = generateLinearForecast(historicalData)
        break
      case 'exponential':
        forecast = generateExponentialForecast(historicalData)
        break
      case 'moving-average':
        forecast = generateMovingAverageForecast(historicalData)
        break
      case 'ai':
        forecast = await generateAIForecast(historicalData)
        break
    }
    
    setForecastData(forecast)
    generateAIInsights(forecast, historicalData)
    setLoading(false)
  }

  const getHistoricalData = () => {
    const monthlyData: Record<string, { income: number, expenses: number }> = {}
    
    // Group transactions by month
    transactions.forEach(transaction => {
      const month = transaction.date.substring(0, 7) // YYYY-MM
      if (!monthlyData[month]) {
        monthlyData[month] = { income: 0, expenses: 0 }
      }
      
      if (transaction.transaction_type === 'income') {
        monthlyData[month].income += transaction.amount
      } else if (transaction.transaction_type === 'expense') {
        monthlyData[month].expenses += Math.abs(transaction.amount)
      }
    })
    
    return Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        income: data.income,
        expenses: data.expenses,
        savings: data.income - data.expenses
      }))
  }

  const generateLinearForecast = (historicalData: any[]) => {
    const baseIncome = calculateMonthlyIncome()
    const baseExpenses = calculateMonthlyExpenses()
    
    // Calculate trend from historical data
    const incomeGrowth = historicalData.length > 1 
      ? (historicalData[historicalData.length - 1].income - historicalData[0].income) / historicalData.length
      : baseIncome * 0.02 // 2% default growth
    
    const expenseGrowth = historicalData.length > 1
      ? (historicalData[historicalData.length - 1].expenses - historicalData[0].expenses) / historicalData.length
      : baseExpenses * 0.03 // 3% default inflation
    
    const forecast: ForecastData[] = []
    const currentDate = new Date()
    
    for (let i = 0; i < 12; i++) {
      const futureDate = new Date(currentDate)
      futureDate.setMonth(currentDate.getMonth() + i)
      const monthStr = futureDate.toISOString().substring(0, 7)
      
      const predictedIncome = baseIncome + (incomeGrowth * i)
      const predictedExpenses = baseExpenses + (expenseGrowth * i)
      
      forecast.push({
        month: monthStr,
        predictedIncome,
        predictedExpenses,
        predictedSavings: predictedIncome - predictedExpenses
      })
    }
    
    return forecast
  }

  const generateExponentialForecast = (historicalData: any[]) => {
    const baseIncome = calculateMonthlyIncome()
    const baseExpenses = calculateMonthlyExpenses()
    
    // Calculate growth rates
    const incomeGrowthRate = 1.005 // 0.5% monthly growth
    const expenseGrowthRate = 1.003 // 0.3% monthly inflation
    
    const forecast: ForecastData[] = []
    const currentDate = new Date()
    
    for (let i = 0; i < 12; i++) {
      const futureDate = new Date(currentDate)
      futureDate.setMonth(currentDate.getMonth() + i)
      const monthStr = futureDate.toISOString().substring(0, 7)
      
      const predictedIncome = baseIncome * Math.pow(incomeGrowthRate, i)
      const predictedExpenses = baseExpenses * Math.pow(expenseGrowthRate, i)
      
      forecast.push({
        month: monthStr,
        predictedIncome,
        predictedExpenses,
        predictedSavings: predictedIncome - predictedExpenses
      })
    }
    
    return forecast
  }

  const generateMovingAverageForecast = (historicalData: any[]) => {
    const windowSize = 3 // 3-month moving average
    const baseIncome = calculateMonthlyIncome()
    const baseExpenses = calculateMonthlyExpenses()
    
    // Use historical data if available, otherwise use base values
    const recentIncome = historicalData.slice(-windowSize).reduce((sum, d) => sum + d.income, 0) / windowSize || baseIncome
    const recentExpenses = historicalData.slice(-windowSize).reduce((sum, d) => sum + d.expenses, 0) / windowSize || baseExpenses
    
    const forecast: ForecastData[] = []
    const currentDate = new Date()
    
    // Apply seasonal adjustments
    const seasonalFactors = [1, 1.02, 1.05, 1.03, 1, 0.98, 0.97, 0.98, 1, 1.03, 1.08, 1.15] // Monthly seasonal factors
    
    for (let i = 0; i < 12; i++) {
      const futureDate = new Date(currentDate)
      futureDate.setMonth(currentDate.getMonth() + i)
      const monthStr = futureDate.toISOString().substring(0, 7)
      const monthIndex = futureDate.getMonth()
      
      const predictedIncome = recentIncome * seasonalFactors[monthIndex]
      const predictedExpenses = recentExpenses * seasonalFactors[monthIndex]
      
      forecast.push({
        month: monthStr,
        predictedIncome,
        predictedExpenses,
        predictedSavings: predictedIncome - predictedExpenses
      })
    }
    
    return forecast
  }

  const generateAIForecast = async (historicalData: any[]) => {
    // This would normally call your AI API endpoint
    // For now, using a sophisticated calculation combining multiple methods
    
    const linear = generateLinearForecast(historicalData)
    const exponential = generateExponentialForecast(historicalData)
    const movingAvg = generateMovingAverageForecast(historicalData)
    
    // Weighted average of different methods
    const weights = { linear: 0.3, exponential: 0.2, movingAvg: 0.5 }
    
    const aiForecast = linear.map((item, index) => ({
      month: item.month,
      predictedIncome: 
        linear[index].predictedIncome * weights.linear +
        exponential[index].predictedIncome * weights.exponential +
        movingAvg[index].predictedIncome * weights.movingAvg,
      predictedExpenses:
        linear[index].predictedExpenses * weights.linear +
        exponential[index].predictedExpenses * weights.exponential +
        movingAvg[index].predictedExpenses * weights.movingAvg,
      predictedSavings: 0
    }))
    
    // Calculate savings
    aiForecast.forEach(item => {
      item.predictedSavings = item.predictedIncome - item.predictedExpenses
    })
    
    // Save forecast to database
    try {
      await supabase.from('budget_forecasts').insert(
        aiForecast.slice(0, 3).map(item => ({
          user_id: userId,
          forecast_date: item.month + '-01',
          predicted_income: item.predictedIncome,
          predicted_expenses: item.predictedExpenses,
          predicted_savings: item.predictedSavings,
          confidence_score: 0.85,
          forecast_method: 'ai_ensemble',
          insights: {
            method: 'AI Ensemble',
            weights,
            generated_at: new Date().toISOString()
          }
        }))
      )
    } catch (error) {
      console.error('Error saving forecast:', error)
    }
    
    return aiForecast
  }

  const generateAIInsights = (forecast: ForecastData[], historicalData: any[]) => {
    const insights: AIInsight[] = []
    
    // Calculate metrics
    const avgSavings = forecast.reduce((sum, f) => sum + f.predictedSavings, 0) / forecast.length
    const totalProjectedSavings = forecast.reduce((sum, f) => sum + f.predictedSavings, 0)
    const avgMonthlyIncome = forecast.reduce((sum, f) => sum + f.predictedIncome, 0) / forecast.length
    const avgMonthlyExpenses = forecast.reduce((sum, f) => sum + f.predictedExpenses, 0) / forecast.length
    const savingsRate = (avgSavings / avgMonthlyIncome) * 100
    
    // Savings rate insight
    if (savingsRate < 10) {
      insights.push({
        type: 'warning',
        title: 'Low Savings Rate',
        description: `You're projected to save only ${savingsRate.toFixed(1)}% of your income. Financial experts recommend saving at least 20%.`,
        metric: 'Savings Rate',
        value: savingsRate,
        trend: 'down'
      })
    } else if (savingsRate > 30) {
      insights.push({
        type: 'success',
        title: 'Excellent Savings Rate',
        description: `Great job! You're saving ${savingsRate.toFixed(1)}% of your income, well above the recommended 20%.`,
        metric: 'Savings Rate',
        value: savingsRate,
        trend: 'up'
      })
    }
    
    // Emergency fund insight
    const monthsOfExpenses = emergencyFund / avgMonthlyExpenses
    if (monthsOfExpenses < 3) {
      insights.push({
        type: 'warning',
        title: 'Build Your Emergency Fund',
        description: `Your emergency fund covers only ${monthsOfExpenses.toFixed(1)} months of expenses. Aim for 3-6 months.`,
        metric: 'Emergency Coverage',
        value: monthsOfExpenses,
        trend: 'stable'
      })
    }
    
    // Expense trend insight
    const expenseTrend = forecast[forecast.length - 1].predictedExpenses - forecast[0].predictedExpenses
    if (expenseTrend > avgMonthlyExpenses * 0.1) {
      insights.push({
        type: 'info',
        title: 'Rising Expenses Detected',
        description: `Your expenses are projected to increase by $${expenseTrend.toFixed(0)} over the next year. Consider reviewing your budget.`,
        metric: 'Expense Growth',
        value: expenseTrend,
        trend: 'up'
      })
    }
    
    // Savings goal insight
    const monthsToGoal = savingsGoal / avgSavings
    insights.push({
      type: 'tip',
      title: 'Savings Goal Timeline',
      description: `At your current savings rate, you'll reach your $${savingsGoal} goal in ${monthsToGoal.toFixed(0)} months.`,
      metric: 'Time to Goal',
      value: monthsToGoal,
      trend: 'stable'
    })
    
    // Income optimization
    if (avgMonthlyIncome < avgMonthlyExpenses * 1.3) {
      insights.push({
        type: 'tip',
        title: 'Consider Income Diversification',
        description: 'Your income barely covers expenses. Consider adding passive income streams or a side hustle.',
        trend: 'stable'
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

  const getMonthName = (monthStr: string) => {
    const date = new Date(monthStr + '-01')
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
  }

  // Prepare data for pie chart
  const categoryBreakdown = [
    { name: 'Housing', value: calculateMonthlyExpenses() * 0.35, color: '#ef4444' },
    { name: 'Food', value: calculateMonthlyExpenses() * 0.15, color: '#f59e0b' },
    { name: 'Transportation', value: calculateMonthlyExpenses() * 0.15, color: '#3b82f6' },
    { name: 'Utilities', value: calculateMonthlyExpenses() * 0.10, color: '#8b5cf6' },
    { name: 'Entertainment', value: calculateMonthlyExpenses() * 0.10, color: '#10b981' },
    { name: 'Other', value: calculateMonthlyExpenses() * 0.15, color: '#6b7280' },
  ]

  return (
    <div className="space-y-6">
      {/* Method Selector */}
      <div className="bg-white rounded-xl p-4 border border-gray-200">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedMethod('ai')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
              selectedMethod === 'ai' 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Brain className="w-4 h-4" />
            AI Forecast
          </button>
          <button
            onClick={() => setSelectedMethod('linear')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              selectedMethod === 'linear'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Linear Regression
          </button>
          <button
            onClick={() => setSelectedMethod('exponential')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              selectedMethod === 'exponential'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Exponential
          </button>
          <button
            onClick={() => setSelectedMethod('moving-average')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              selectedMethod === 'moving-average'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Moving Average
          </button>
        </div>
      </div>

      {/* AI Insights Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {aiInsights.map((insight, index) => (
          <div key={index} className="bg-white rounded-xl p-4 border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-3">
              {getInsightIcon(insight.type)}
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 text-sm">{insight.title}</h3>
                <p className="text-xs text-gray-600 mt-1">{insight.description}</p>
                {insight.value !== undefined && (
                  <div className="flex items-center gap-2 mt-2">
                    {insight.trend === 'up' && <TrendingUp className="w-4 h-4 text-green-500" />}
                    {insight.trend === 'down' && <TrendingDown className="w-4 h-4 text-red-500" />}
                    {insight.metric && (
                      <span className="text-xs font-medium text-gray-700">
                        {insight.metric}: {
                          typeof insight.value === 'number' && insight.value > 100 
                            ? formatCurrency(insight.value)
                            : `${insight.value?.toFixed(1)}${insight.metric?.includes('Rate') ? '%' : ''}`
                        }
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Forecast Chart */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">12-Month Financial Forecast</h3>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={forecastData.map(d => ({
            ...d,
            month: getMonthName(d.month)
          }))}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
            <Tooltip 
              formatter={(value: number) => formatCurrency(value)}
              labelStyle={{ color: '#000' }}
            />
            <Legend />
            <Area 
              type="monotone" 
              dataKey="predictedIncome" 
              stackId="1"
              stroke="#10b981" 
              fill="#10b981" 
              fillOpacity={0.6}
              name="Income"
            />
            <Area 
              type="monotone" 
              dataKey="predictedExpenses" 
              stackId="2"
              stroke="#ef4444" 
              fill="#ef4444" 
              fillOpacity={0.6}
              name="Expenses"
            />
            <Area 
              type="monotone" 
              dataKey="predictedSavings" 
              stackId="3"
              stroke="#3b82f6" 
              fill="#3b82f6" 
              fillOpacity={0.6}
              name="Savings"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Projected Annual Income</p>
              <p className="text-2xl font-bold mt-1">
                {formatCurrency(forecastData.reduce((sum, f) => sum + f.predictedIncome, 0))}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-red-500 to-pink-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm">Projected Annual Expenses</p>
              <p className="text-2xl font-bold mt-1">
                {formatCurrency(forecastData.reduce((sum, f) => sum + f.predictedExpenses, 0))}
              </p>
            </div>
            <TrendingDown className="w-8 h-8 text-red-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Projected Annual Savings</p>
              <p className="text-2xl font-bold mt-1">
                {formatCurrency(forecastData.reduce((sum, f) => sum + f.predictedSavings, 0))}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-blue-200" />
          </div>
        </div>
      </div>

      {/* Expense Breakdown Pie Chart */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Expense Categories Breakdown</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RePieChart>
              <Pie
                data={categoryBreakdown}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryBreakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
            </RePieChart>
          </ResponsiveContainer>
        </div>

        {/* Savings Progress */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Savings Goals Progress</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Emergency Fund</span>
                <span className="font-semibold">{formatCurrency(emergencyFund)} / {formatCurrency(calculateMonthlyExpenses() * 6)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((emergencyFund / (calculateMonthlyExpenses() * 6)) * 100, 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Monthly Savings Goal</span>
                <span className="font-semibold">{formatCurrency(savingsGoal)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((forecastData[0]?.predictedSavings / savingsGoal) * 100, 100)}%` }}
                />
              </div>
            </div>

            <div className="pt-4 border-t">
              <button 
                onClick={() => setShowGoalsModal(true)}
                className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2">
                <Target className="w-4 h-4" />
                Set Financial Goals
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Forecast Table */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 overflow-x-auto">
        <h3 className="text-lg font-semibold mb-4">Detailed Monthly Forecast</h3>
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 text-sm font-medium text-gray-600">Month</th>
              <th className="text-right py-2 text-sm font-medium text-gray-600">Income</th>
              <th className="text-right py-2 text-sm font-medium text-gray-600">Expenses</th>
              <th className="text-right py-2 text-sm font-medium text-gray-600">Savings</th>
              <th className="text-right py-2 text-sm font-medium text-gray-600">Savings Rate</th>
            </tr>
          </thead>
          <tbody>
            {forecastData.slice(0, 6).map((month, index) => (
              <tr key={index} className="border-b hover:bg-gray-50">
                <td className="py-3 text-sm font-medium">{getMonthName(month.month)}</td>
                <td className="py-3 text-sm text-right text-green-600">{formatCurrency(month.predictedIncome)}</td>
                <td className="py-3 text-sm text-right text-red-600">{formatCurrency(month.predictedExpenses)}</td>
                <td className="py-3 text-sm text-right font-semibold">{formatCurrency(month.predictedSavings)}</td>
                <td className="py-3 text-sm text-right">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    (month.predictedSavings / month.predictedIncome) * 100 > 20
                      ? 'bg-green-100 text-green-700'
                      : (month.predictedSavings / month.predictedIncome) * 100 > 10
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {((month.predictedSavings / month.predictedIncome) * 100).toFixed(1)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Financial Goals Modal */}
      {showGoalsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <FinancialGoals 
              userId={userId} 
              monthlyIncome={calculateMonthlyIncome()}
              monthlySavings={forecastData[0]?.predictedSavings || 0}
              onClose={() => setShowGoalsModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}