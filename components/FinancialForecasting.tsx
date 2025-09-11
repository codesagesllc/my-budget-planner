'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/supabase'
import FinancialGoals from './FinancialGoals'
import { 
  TrendingUp, TrendingDown, DollarSign, Brain, 
  Calendar, Target, AlertCircle, Zap, ChevronRight,
  BarChart3, PieChart, Activity, Lightbulb, Settings
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
  incomeBreakdown?: {
    recurring: number
    oneTime: number
  }
  expenseBreakdown?: {
    recurring: number
    oneTime: number
  }
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
  const [targetSavingsRate, setTargetSavingsRate] = useState(20) // User can set this
  const [emergencyFund, setEmergencyFund] = useState(0)
  const [showGoalsModal, setShowGoalsModal] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [tempTargetSavingsRate, setTempTargetSavingsRate] = useState(20)
  const [tempEmergencyFund, setTempEmergencyFund] = useState(0)
  const supabase = createClient()

  const COLORS = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6']

  // Load user preferences on mount
  useEffect(() => {
    const loadUserPreferences = async () => {
      const { data } = await supabase
        .from('user_preferences')
        .select('savings_target_percentage, emergency_fund_target')
        .eq('user_id', userId)
        .single()
      
      if (data) {
        if (data.savings_target_percentage) {
          setTargetSavingsRate(data.savings_target_percentage)
          setTempTargetSavingsRate(data.savings_target_percentage)
        }
        if (data.emergency_fund_target) {
          setEmergencyFund(data.emergency_fund_target)
          setTempEmergencyFund(data.emergency_fund_target)
        }
      }
    }
    
    loadUserPreferences()
  }, [userId])

  useEffect(() => {
    generateForecast()
  }, [transactions, incomeSources, bills, selectedMethod, targetSavingsRate, emergencyFund])

  // Calculate income for a specific month with proper date handling - TRULY FIXED VERSION
  const calculateIncomeForMonth = (year: number, month: number) => {
    const monthStart = new Date(year, month, 1)
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999)
    
    let recurringIncome = 0
    let oneTimeIncome = 0
    
    incomeSources.forEach(income => {
      if (!income.is_active) return
      
      // Handle one-time income with proper date range logic
      if (income.frequency === 'one-time') {
        if (!income.start_date) return
        
        const startDate = new Date(income.start_date)
        
        if (income.end_date) {
          const endDate = new Date(income.end_date)
          
          // CRITICAL FIX: Check if the income period actually overlaps with this month
          // The income must START before or during this month AND end after or during this month
          if (startDate <= monthEnd && endDate >= monthStart) {
            // IMPORTANT: Only count income if it has actually started
            // If start date is AFTER the month end, don't count it
            if (startDate > monthEnd) {
              return // Income hasn't started yet
            }
            
            // Calculate the effective overlap period within this month
            const effectiveStart = startDate > monthStart ? startDate : monthStart
            const effectiveEnd = endDate < monthEnd ? endDate : monthEnd
            
            // Make sure the effective period is valid (start before end)
            // This handles the case where income starts after the month we're calculating
            if (effectiveStart > effectiveEnd) {
              return // No valid overlap
            }
            
            // Calculate the number of days in the total income period
            const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
            
            // Calculate the number of days that fall within this specific month
            const monthDays = Math.ceil((effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
            
            // Prorate the amount based on days in this month vs total days
            const proratedAmount = (Number(income.amount) * monthDays) / totalDays
            oneTimeIncome += proratedAmount
          }
        } else {
          // If no end date, check if start date is in the specified month
          if (startDate >= monthStart && startDate <= monthEnd) {
            oneTimeIncome += Number(income.amount)
          }
        }
      } else {
        // Handle recurring income with date checks
        if (income.start_date) {
          const startDate = new Date(income.start_date)
          if (startDate > monthEnd) return // Hasn't started yet
          
          if (income.end_date) {
            const endDate = new Date(income.end_date)
            if (endDate < monthStart) return // Already ended
          }
        }
        
        // Calculate recurring income based on frequency
        const monthlyMultipliers: Record<string, number> = {
          'monthly': 1,
          'biweekly': 2.16667,
          'weekly': 4.33333,
          'quarterly': 0,  // Handle separately
          'annual': 0       // Handle separately
        }
        
        // Special handling for quarterly income
        if (income.frequency === 'quarterly' && income.start_date) {
          const startDate = new Date(income.start_date)
          const monthsDiff = (year - startDate.getFullYear()) * 12 + (month - startDate.getMonth())
          if (monthsDiff >= 0 && monthsDiff % 3 === 0) {
            recurringIncome += Number(income.amount)
          }
        }
        // Special handling for annual income
        else if (income.frequency === 'annual' && income.start_date) {
          const startDate = new Date(income.start_date)
          if (startDate.getMonth() === month && year >= startDate.getFullYear()) {
            recurringIncome += Number(income.amount)
          }
        }
        // Regular recurring income
        else {
          recurringIncome += Number(income.amount) * (monthlyMultipliers[income.frequency] || 0)
        }
      }
    })
    
    return {
      total: recurringIncome + oneTimeIncome,
      recurring: recurringIncome,
      oneTime: oneTimeIncome
    }
  }

  // Calculate expenses for a specific month with proper date handling
  const calculateExpensesForMonth = (year: number, month: number) => {
    const monthStart = new Date(year, month, 1)
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999)
    
    let recurringExpenses = 0
    let oneTimeExpenses = 0
    
    bills.forEach(bill => {
      if (!bill.is_active) return
      
      // Handle one-time bills
      if (bill.billing_cycle === 'one-time') {
        const dueDate = new Date(bill.due_date)
        if (dueDate >= monthStart && dueDate <= monthEnd) {
          oneTimeExpenses += Number(bill.amount)
        }
      } else {
        // Handle recurring bills
        const dueDate = new Date(bill.due_date)
        
        // Check if bill is active in this month
        if (dueDate > monthEnd) return // Bill hasn't started yet
        
        // Calculate recurring expenses based on billing cycle
        const cycleMultipliers: Record<string, number> = {
          'monthly': 1,
          'biweekly': 2.16667,
          'weekly': 4.33333,
          'quarterly': 0,  // Handle separately
          'annual': 0      // Handle separately
        }
        
        // Special handling for quarterly bills
        if (bill.billing_cycle === 'quarterly') {
          const monthsDiff = (year - dueDate.getFullYear()) * 12 + (month - dueDate.getMonth())
          if (monthsDiff >= 0 && monthsDiff % 3 === 0) {
            recurringExpenses += Number(bill.amount)
          }
        }
        // Special handling for annual bills
        else if (bill.billing_cycle === 'annual') {
          if (dueDate.getMonth() === month && year >= dueDate.getFullYear()) {
            recurringExpenses += Number(bill.amount)
          }
        }
        // Regular recurring bills
        else {
          recurringExpenses += Number(bill.amount) * (cycleMultipliers[bill.billing_cycle] || 1)
        }
      }
    })
    
    return {
      total: recurringExpenses + oneTimeExpenses,
      recurring: recurringExpenses,
      oneTime: oneTimeExpenses
    }
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
    
    // Filter out any past months (before current month)
    const currentDate = new Date()
    const currentYearMonth = currentDate.toISOString().substring(0, 7)
    const filteredForecast = forecast.filter(f => f.month >= currentYearMonth)
    
    setForecastData(filteredForecast)
    generateAIInsights(filteredForecast, historicalData)
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
    const forecast: ForecastData[] = []
    const currentDate = new Date()
    
    // Start from the current month 
    // IMPORTANT: We're in September 2025, so start from September, not August
    for (let i = 0; i < 12; i++) {
      const forecastDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1)
      const year = forecastDate.getFullYear()
      const month = forecastDate.getMonth()
      const monthStr = forecastDate.toISOString().substring(0, 7)
      
      const income = calculateIncomeForMonth(year, month)
      const expenses = calculateExpensesForMonth(year, month)
      
      // Add some growth/inflation factors
      const growthFactor = i === 0 ? 1 : 1 + (i * 0.002) // 0.2% monthly growth, but not for current month
      const inflationFactor = i === 0 ? 1 : 1 + (i * 0.003) // 0.3% monthly inflation, but not for current month
      
      const predictedIncome = income.total * growthFactor
      const predictedExpenses = expenses.total * inflationFactor
      
      forecast.push({
        month: monthStr,
        predictedIncome,
        predictedExpenses,
        predictedSavings: predictedIncome - predictedExpenses,
        incomeBreakdown: {
          recurring: income.recurring * growthFactor,
          oneTime: income.oneTime
        },
        expenseBreakdown: {
          recurring: expenses.recurring * inflationFactor,
          oneTime: expenses.oneTime
        }
      })
    }
    
    return forecast
  }

  const generateExponentialForecast = (historicalData: any[]) => {
    const forecast: ForecastData[] = []
    const currentDate = new Date()
    
    // Generate month-by-month forecast with exponential growth starting from current month
    for (let i = 0; i < 12; i++) {
      const forecastDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1)
      const year = forecastDate.getFullYear()
      const month = forecastDate.getMonth()
      const monthStr = forecastDate.toISOString().substring(0, 7)
      
      const income = calculateIncomeForMonth(year, month)
      const expenses = calculateExpensesForMonth(year, month)
      
      // Exponential growth factors
      const incomeGrowthRate = Math.pow(1.005, i) // 0.5% monthly compound growth
      const expenseGrowthRate = Math.pow(1.003, i) // 0.3% monthly compound inflation
      
      const predictedIncome = income.total * incomeGrowthRate
      const predictedExpenses = expenses.total * expenseGrowthRate
      
      forecast.push({
        month: monthStr,
        predictedIncome,
        predictedExpenses,
        predictedSavings: predictedIncome - predictedExpenses,
        incomeBreakdown: {
          recurring: income.recurring * incomeGrowthRate,
          oneTime: income.oneTime
        },
        expenseBreakdown: {
          recurring: expenses.recurring * expenseGrowthRate,
          oneTime: expenses.oneTime
        }
      })
    }
    
    return forecast
  }

  const generateMovingAverageForecast = (historicalData: any[]) => {
    const forecast: ForecastData[] = []
    const currentDate = new Date()
    
    // Seasonal adjustment factors (e.g., higher expenses in December for holidays)
    const seasonalFactors = [1, 1.02, 1.05, 1.03, 1, 0.98, 0.97, 0.98, 1, 1.03, 1.08, 1.15]
    
    // Start from current month
    for (let i = 0; i < 12; i++) {
      const forecastDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1)
      const year = forecastDate.getFullYear()
      const month = forecastDate.getMonth()
      const monthStr = forecastDate.toISOString().substring(0, 7)
      const monthIndex = forecastDate.getMonth()
      
      const income = calculateIncomeForMonth(year, month)
      const expenses = calculateExpensesForMonth(year, month)
      
      // Apply seasonal adjustments
      const predictedIncome = income.total * (2 - seasonalFactors[monthIndex] * 0.5) // Income less affected by seasons
      const predictedExpenses = expenses.total * seasonalFactors[monthIndex]
      
      forecast.push({
        month: monthStr,
        predictedIncome,
        predictedExpenses,
        predictedSavings: predictedIncome - predictedExpenses,
        incomeBreakdown: {
          recurring: income.recurring * (2 - seasonalFactors[monthIndex] * 0.5),
          oneTime: income.oneTime
        },
        expenseBreakdown: {
          recurring: expenses.recurring * seasonalFactors[monthIndex],
          oneTime: expenses.oneTime
        }
      })
    }
    
    return forecast
  }

  const generateAIForecast = async (historicalData: any[]) => {
    // Combine multiple forecasting methods with weights
    const linear = generateLinearForecast(historicalData)
    const exponential = generateExponentialForecast(historicalData)
    const movingAvg = generateMovingAverageForecast(historicalData)
    
    // Weighted average of different methods
    const weights = { linear: 0.4, exponential: 0.2, movingAvg: 0.4 }
    
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
      predictedSavings: 0,
      incomeBreakdown: {
        recurring: 
          (linear[index].incomeBreakdown?.recurring || 0) * weights.linear +
          (exponential[index].incomeBreakdown?.recurring || 0) * weights.exponential +
          (movingAvg[index].incomeBreakdown?.recurring || 0) * weights.movingAvg,
        oneTime: 
          (linear[index].incomeBreakdown?.oneTime || 0) * weights.linear +
          (exponential[index].incomeBreakdown?.oneTime || 0) * weights.exponential +
          (movingAvg[index].incomeBreakdown?.oneTime || 0) * weights.movingAvg
      },
      expenseBreakdown: {
        recurring: 
          (linear[index].expenseBreakdown?.recurring || 0) * weights.linear +
          (exponential[index].expenseBreakdown?.recurring || 0) * weights.exponential +
          (movingAvg[index].expenseBreakdown?.recurring || 0) * weights.movingAvg,
        oneTime: 
          (linear[index].expenseBreakdown?.oneTime || 0) * weights.linear +
          (exponential[index].expenseBreakdown?.oneTime || 0) * weights.exponential +
          (movingAvg[index].expenseBreakdown?.oneTime || 0) * weights.movingAvg
      }
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
            incomeBreakdown: item.incomeBreakdown,
            expenseBreakdown: item.expenseBreakdown,
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
    const actualSavingsRate = (avgSavings / avgMonthlyIncome) * 100
    
    // Savings rate insight vs target
    if (actualSavingsRate < targetSavingsRate) {
      const shortfall = targetSavingsRate - actualSavingsRate
      insights.push({
        type: 'warning',
        title: 'Below Target Savings Rate',
        description: `You're projected to save ${actualSavingsRate.toFixed(1)}% of income, ${shortfall.toFixed(1)}% below your ${targetSavingsRate}% target.`,
        metric: 'Savings Rate',
        value: actualSavingsRate,
        trend: 'down'
      })
    } else {
      insights.push({
        type: 'success',
        title: 'Meeting Savings Target',
        description: `Excellent! You're saving ${actualSavingsRate.toFixed(1)}% of income, exceeding your ${targetSavingsRate}% target.`,
        metric: 'Savings Rate',
        value: actualSavingsRate,
        trend: 'up'
      })
    }
    
    // One-time income insights
    const monthsWithOneTimeIncome = forecast.filter(f => (f.incomeBreakdown?.oneTime || 0) > 0)
    if (monthsWithOneTimeIncome.length > 0) {
      const totalOneTime = monthsWithOneTimeIncome.reduce((sum, f) => sum + (f.incomeBreakdown?.oneTime || 0), 0)
      insights.push({
        type: 'info',
        title: 'One-Time Income Detected',
        description: `You have ${formatCurrency(totalOneTime)} in one-time income over the next ${monthsWithOneTimeIncome.length} months. Plan accordingly as this won't repeat.`,
        metric: 'One-Time Income',
        value: totalOneTime,
        trend: 'stable'
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
    
    // Months with negative savings
    const negativeSavingsMonths = forecast.filter(f => f.predictedSavings < 0)
    if (negativeSavingsMonths.length > 0) {
      insights.push({
        type: 'warning',
        title: 'Deficit Months Ahead',
        description: `${negativeSavingsMonths.length} month(s) show expenses exceeding income. Review these periods carefully.`,
        metric: 'Deficit Months',
        value: negativeSavingsMonths.length,
        trend: 'down'
      })
    }
    
    // Income diversification
    const recurringIncomeRatio = forecast[0].incomeBreakdown 
      ? forecast[0].incomeBreakdown.recurring / forecast[0].predictedIncome 
      : 1
    
    if (recurringIncomeRatio < 0.5) {
      insights.push({
        type: 'tip',
        title: 'Income Stability Risk',
        description: 'Over 50% of your income is from one-time sources. Consider building more recurring income streams.',
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
    // Fix timezone issue: Parse as UTC and display as UTC
    // monthStr is like '2025-09', we need to ensure it's treated properly
    const [year, month] = monthStr.split('-').map(Number)
    // Create date with local timezone to avoid UTC conversion issues
    const date = new Date(year, month - 1, 1) // month - 1 because months are 0-indexed
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
  }

  // Prepare data for pie chart (using first month's data)
  const firstMonthExpenses = forecastData[0]?.predictedExpenses || 1
  const categoryBreakdown = [
    { name: 'Housing', value: firstMonthExpenses * 0.35, color: '#ef4444' },
    { name: 'Food', value: firstMonthExpenses * 0.15, color: '#f59e0b' },
    { name: 'Transportation', value: firstMonthExpenses * 0.15, color: '#3b82f6' },
    { name: 'Utilities', value: firstMonthExpenses * 0.10, color: '#8b5cf6' },
    { name: 'Entertainment', value: firstMonthExpenses * 0.10, color: '#10b981' },
    { name: 'Other', value: firstMonthExpenses * 0.15, color: '#6b7280' },
  ]

  return (
    <div className="space-y-6">
      {/* Settings and Method Selector */}
      <div className="bg-white rounded-xl p-4 border border-gray-200">
        <div className="flex flex-wrap items-center justify-between gap-4">
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
              Linear
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
              Seasonal
            </button>
          </div>
          
          {/* Settings Button */}
          <button
            onClick={() => {
              setShowSettings(!showSettings)
              // When opening settings, load current values
              if (!showSettings) {
                setTempTargetSavingsRate(targetSavingsRate)
                setTempEmergencyFund(emergencyFund)
              }
            }}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
        </div>
        
        {/* Settings Panel */}
        {showSettings && (
          <div className="mt-4 pt-4 border-t">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Savings Rate (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={tempTargetSavingsRate}
                  onChange={(e) => setTempTargetSavingsRate(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 20"
                />
                <p className="text-xs text-gray-500 mt-1">Your savings goal as % of income</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Emergency Fund Balance ($)
                </label>
                <input
                  type="number"
                  min="0"
                  value={tempEmergencyFund}
                  onChange={(e) => setTempEmergencyFund(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 5000"
                />
                <p className="text-xs text-gray-500 mt-1">Current emergency fund saved</p>
              </div>
              <div className="flex items-end">
                <div className="flex gap-2 w-full">
                  <button
                    onClick={() => {
                      // Apply the settings
                      setTargetSavingsRate(tempTargetSavingsRate)
                      setEmergencyFund(tempEmergencyFund)
                      setShowSettings(false)
                      
                      // Save to user preferences
                      supabase.from('user_preferences')
                        .upsert({
                          user_id: userId,
                          savings_target_percentage: tempTargetSavingsRate,
                          emergency_fund_target: tempEmergencyFund
                        })
                        .then(() => {
                          console.log('Settings saved')
                        })
                    }}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Apply Settings
                  </button>
                  <button
                    onClick={() => {
                      setShowSettings(false)
                      setTempTargetSavingsRate(targetSavingsRate)
                      setTempEmergencyFund(emergencyFund)
                    }}
                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Current Analysis:</strong> Based on your forecast, your average savings rate is{' '}
                <span className="font-semibold">
                  {((forecastData.reduce((sum, f) => sum + f.predictedSavings, 0) / 
                     forecastData.reduce((sum, f) => sum + f.predictedIncome, 0)) * 100 || 0).toFixed(1)}%
                </span>
                {' '}compared to your target of <span className="font-semibold">{targetSavingsRate}%</span>.
              </p>
            </div>
          </div>
        )}
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
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload
                  return (
                    <div className="bg-white p-3 border rounded-lg shadow-lg">
                      <p className="font-semibold">{label}</p>
                      <p className="text-green-600">Income: {formatCurrency(data.predictedIncome)}</p>
                      {data.incomeBreakdown && (
                        <div className="ml-2 text-xs text-gray-600">
                          <p>Recurring: {formatCurrency(data.incomeBreakdown.recurring)}</p>
                          <p>One-time: {formatCurrency(data.incomeBreakdown.oneTime)}</p>
                        </div>
                      )}
                      <p className="text-red-600">Expenses: {formatCurrency(data.predictedExpenses)}</p>
                      {data.expenseBreakdown && (
                        <div className="ml-2 text-xs text-gray-600">
                          <p>Recurring: {formatCurrency(data.expenseBreakdown.recurring)}</p>
                          <p>One-time: {formatCurrency(data.expenseBreakdown.oneTime)}</p>
                        </div>
                      )}
                      <p className="text-blue-600 font-semibold">Savings: {formatCurrency(data.predictedSavings)}</p>
                    </div>
                  )
                }
                return null
              }}
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
          <h3 className="text-lg font-semibold text-blue-900 mb-4">Expense Categories Breakdown</h3>
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
          <h3 className="text-lg font-semibold text-blue-900 mb-4">Savings Goals Progress</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Emergency Fund</span>
                <span className="font-semibold">
                  {formatCurrency(emergencyFund)} / {formatCurrency(forecastData[0]?.predictedExpenses * 6 || 0)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-red-600 h-2 rounded-full transition-all duration-500"
                  style={{ 
                    width: `${Math.min((emergencyFund / ((forecastData[0]?.predictedExpenses || 1) * 6)) * 100, 100)}%` 
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Current Savings Rate</span>
                <span className="font-semibold">
                  {((forecastData[0]?.predictedSavings || 0) / (forecastData[0]?.predictedIncome || 1) * 100).toFixed(1)}% / {targetSavingsRate}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ 
                    width: `${Math.min(((forecastData[0]?.predictedSavings || 0) / (forecastData[0]?.predictedIncome || 1) * 100 / targetSavingsRate) * 100, 100)}%` 
                  }}
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
        <h3 className="text-lg font-semibold text-blue-900 mb-4">Detailed Monthly Forecast</h3>
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="border-b bg-blue-50">
              <th className="text-left py-3 px-2 text-sm font-semibold text-blue-900">Month</th>
              <th className="text-right py-3 px-2 text-sm font-semibold text-blue-900">Income</th>
              <th className="text-right py-3 px-2 text-sm font-semibold text-blue-900">Recurring</th>
              <th className="text-right py-3 px-2 text-sm font-semibold text-blue-900">One-Time</th>
              <th className="text-right py-3 px-2 text-sm font-semibold text-blue-900">Expenses</th>
              <th className="text-right py-3 px-2 text-sm font-semibold text-blue-900">Savings</th>
              <th className="text-right py-3 px-2 text-sm font-semibold text-blue-900">Rate</th>
            </tr>
          </thead>
          <tbody>
            {forecastData.slice(0, 12).map((month, index) => {
              const savingsRate = month.predictedIncome > 0 
                ? (month.predictedSavings / month.predictedIncome) * 100 
                : null // Changed from 0 to null when no income
              return (
                <tr key={index} className="border-b hover:bg-blue-50 transition-colors">
                  <td className="py-3 px-2 text-sm font-medium text-blue-900">
                    {getMonthName(month.month)}
                  </td>
                  <td className="py-3 px-2 text-sm text-right font-semibold text-green-600">
                    {formatCurrency(month.predictedIncome)}
                  </td>
                  <td className="py-3 px-2 text-sm text-right text-blue-700">
                    {formatCurrency(month.incomeBreakdown?.recurring || 0)}
                  </td>
                  <td className="py-3 px-2 text-sm text-right text-blue-600">
                    {month.incomeBreakdown?.oneTime && month.incomeBreakdown.oneTime > 0 ? (
                      <span className="font-medium">
                        {formatCurrency(month.incomeBreakdown.oneTime)}
                      </span>
                    ) : (
                      <span className="text-blue-400">-</span>
                    )}
                  </td>
                  <td className="py-3 px-2 text-sm text-right font-semibold text-red-600">
                    {formatCurrency(month.predictedExpenses)}
                  </td>
                  <td className="py-3 px-2 text-sm text-right font-bold">
                    <span className={month.predictedSavings >= 0 ? 'text-green-700' : 'text-red-700'}>
                      {formatCurrency(month.predictedSavings)}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-sm text-right">
                    <div className="flex flex-col items-end">
                      {savingsRate !== null ? (
                        <>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            targetSavingsRate > 0 ? (
                              savingsRate >= targetSavingsRate
                                ? 'bg-green-100 text-green-800 border border-green-200'
                                : savingsRate > 10
                                ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                                : savingsRate > 0
                                ? 'bg-orange-100 text-orange-800 border border-orange-200'
                                : month.predictedSavings < 0
                                ? 'bg-red-100 text-red-800 border border-red-200'
                                : 'bg-gray-100 text-gray-800 border border-gray-200'
                            ) : (
                              // When target is 0, just show the rate without color coding
                              savingsRate > 0
                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                : month.predictedSavings < 0
                                ? 'bg-red-100 text-red-800 border border-red-200'
                                : 'bg-gray-100 text-gray-800 border border-gray-200'
                            )
                          }`}>
                            {savingsRate.toFixed(1)}%
                          </span>
                          {targetSavingsRate > 0 && savingsRate < targetSavingsRate && (
                            <span className="text-xs text-blue-600 mt-1">
                              Target: {targetSavingsRate}%
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                          N/A
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="bg-blue-50 font-semibold border-t-2 border-blue-200">
              <td className="py-3 px-2 text-sm text-blue-900">Total/Avg</td>
              <td className="py-3 px-2 text-sm text-right text-green-700">
                {formatCurrency(forecastData.reduce((sum, f) => sum + f.predictedIncome, 0))}
              </td>
              <td className="py-3 px-2 text-sm text-right text-blue-700">
                {formatCurrency(forecastData.reduce((sum, f) => sum + (f.incomeBreakdown?.recurring || 0), 0))}
              </td>
              <td className="py-3 px-2 text-sm text-right text-blue-600">
                {formatCurrency(forecastData.reduce((sum, f) => sum + (f.incomeBreakdown?.oneTime || 0), 0))}
              </td>
              <td className="py-3 px-2 text-sm text-right text-red-700">
                {formatCurrency(forecastData.reduce((sum, f) => sum + f.predictedExpenses, 0))}
              </td>
              <td className="py-3 px-2 text-sm text-right text-green-800">
                {formatCurrency(forecastData.reduce((sum, f) => sum + f.predictedSavings, 0))}
              </td>
              <td className="py-3 px-2 text-sm text-right">
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                  targetSavingsRate > 0 ? (
                    ((forecastData.reduce((sum, f) => sum + f.predictedSavings, 0) / 
                      forecastData.reduce((sum, f) => sum + f.predictedIncome, 0)) * 100) >= targetSavingsRate
                      ? 'bg-green-100 text-green-800 border border-green-200'
                      : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                  ) : (
                    'bg-blue-100 text-blue-800 border border-blue-200'
                  )
                }`}>
                  Avg: {((forecastData.reduce((sum, f) => sum + f.predictedSavings, 0) / 
                         forecastData.reduce((sum, f) => sum + f.predictedIncome, 0)) * 100 || 0).toFixed(1)}%
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Financial Goals Modal */}
      {showGoalsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <FinancialGoals 
              userId={userId} 
              monthlyIncome={forecastData[0]?.predictedIncome || 0}
              monthlySavings={forecastData[0]?.predictedSavings || 0}
              onClose={() => setShowGoalsModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}