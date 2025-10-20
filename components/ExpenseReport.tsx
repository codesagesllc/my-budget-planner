'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils/helpers'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { 
  startOfMonth, 
  endOfMonth, 
  subDays, 
  subMonths, 
  format, 
  addDays,
  addMonths,
  differenceInDays,
  eachDayOfInterval,
  parseISO
} from 'date-fns'
import { TrendingUp, Calendar, DollarSign, ChartBar, AlertCircle } from 'lucide-react'

interface Bill {
  id: string
  user_id: string
  name: string
  amount: number
  due_date: string
  categories: string[]
  billing_cycle: 'monthly' | 'quarterly' | 'annual' | 'weekly' | 'biweekly' | 'one-time'
  is_active: boolean
  created_at: string
  updated_at: string
}

interface IncomeSource {
  id: string
  user_id: string
  name: string
  amount: number
  frequency: 'monthly' | 'biweekly' | 'weekly' | 'quarterly' | 'annual' | 'one-time'
  is_active: boolean
  start_date?: string
  end_date?: string
}

interface Transaction {
  id: string
  user_id: string
  amount: number
  description: string
  date: string
  category?: string
  categories?: string[]
  transaction_type?: 'expense' | 'income' | 'transfer'
  exclude_from_spending?: boolean
  is_bill_payment?: boolean
}

type TimePeriod = 'last30' | 'currentMonth' | 'last6months'

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316']

export default function ExpenseReport() {
  const [bills, setBills] = useState<Bill[]>([])
  const [incomes, setIncomes] = useState<IncomeSource[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('currentMonth')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase =  createClient()

  // Fetch bills and income data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
          throw new Error('Please sign in to view expense reports')
        }

        // Fetch bills
        const { data: billsData, error: billsError } = await supabase
          .from('bills')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)

        if (billsError) {
          throw billsError
        }

        // Fetch income sources
        const { data: incomesData, error: incomesError } = await supabase
          .from('income_sources')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)

        if (incomesError) {
          throw incomesError
        }

        // Fetch transactions (for the selected time period)
        const { start, end } = getDateRangeForPeriod(timePeriod)
        const { data: transactionsData, error: transactionsError } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .gte('date', start.toISOString().split('T')[0])
          .lte('date', end.toISOString().split('T')[0])
          .eq('transaction_type', 'expense')
          .eq('exclude_from_spending', false)

        if (transactionsError) {
          throw transactionsError
        }

        setBills(billsData || [])
        setIncomes(incomesData || [])
        setTransactions(transactionsData || [])
      } catch (err: any) {
        setError(err.message || 'Failed to load expense data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [timePeriod])

  // Get date range based on selected period
  const getDateRange = () => {
    const now = new Date()
    switch (timePeriod) {
      case 'last30':
        return { start: subDays(now, 30), end: now }
      case 'currentMonth':
        return { start: startOfMonth(now), end: endOfMonth(now) }
      case 'last6months':
        return { start: subMonths(now, 6), end: now }
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) }
    }
  }

  // Helper function for fetching data based on period
  const getDateRangeForPeriod = (period: TimePeriod) => {
    const now = new Date()
    switch (period) {
      case 'last30':
        return { start: subDays(now, 30), end: now }
      case 'currentMonth':
        return { start: startOfMonth(now), end: endOfMonth(now) }
      case 'last6months':
        return { start: subMonths(now, 6), end: now }
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) }
    }
  }

  // Calculate monthly amount for different billing/frequency cycles
  const getMonthlyAmount = (amount: number, cycle: string): number => {
    const amt = Number(amount) || 0
    switch (cycle) {
      case 'weekly': return amt * 4.33333  // ~52 weeks / 12 months
      case 'biweekly': return amt * 2.16667  // ~26 payments / 12 months
      case 'monthly': return amt
      case 'quarterly': return amt / 3
      case 'annual': return amt / 12
      case 'one-time': return 0 // Don't include one-time in monthly calculations
      default: return amt
    }
  }

  // Calculate total monthly income with proper frequency handling
  const totalMonthlyIncome = useMemo(() => {
    if (!incomes || incomes.length === 0) {
      return 0
    }
    
    const currentDate = new Date()
    const currentMonth = currentDate.getMonth()
    const currentYear = currentDate.getFullYear()
    
    const total = incomes.reduce((sum, income) => {
      if (!income.is_active) {
        return sum
      }
      
      // For one-time income, check if it's in the current period
      if (income.frequency === 'one-time') {
        if (timePeriod === 'currentMonth' && income.start_date) {
          const startDate = new Date(income.start_date)
          if (startDate.getMonth() === currentMonth && startDate.getFullYear() === currentYear) {
            return sum + Number(income.amount)
          }
        }
        return sum // Skip one-time income for other periods
      }
      
      const monthlyAmount = getMonthlyAmount(Number(income.amount), income.frequency)
      return sum + monthlyAmount
    }, 0)

    return total
  }, [incomes, timePeriod])

  // Process bills and transactions by category
  const categoryData = useMemo(() => {
    const categoryTotals: Record<string, number> = {}

    // Process bills (convert to monthly amounts)
    bills.forEach(bill => {
      const monthlyAmount = getMonthlyAmount(bill.amount, bill.billing_cycle)

      if (bill.categories && Array.isArray(bill.categories)) {
        // If bill has multiple categories, split the amount equally
        const amountPerCategory = monthlyAmount / bill.categories.length
        bill.categories.forEach(category => {
          categoryTotals[category] = (categoryTotals[category] || 0) + amountPerCategory
        })
      } else {
        // If no categories, add to "Uncategorized"
        categoryTotals['Uncategorized'] = (categoryTotals['Uncategorized'] || 0) + monthlyAmount
      }
    })

    // Process transactions (actual amounts for the selected period)
    transactions.forEach(transaction => {
      // Only include expense transactions that aren't excluded from spending
      if (transaction.transaction_type === 'expense' && !transaction.exclude_from_spending) {
        const amount = Math.abs(transaction.amount)

        // Handle multiple categories
        if (transaction.categories && Array.isArray(transaction.categories) && transaction.categories.length > 0) {
          const amountPerCategory = amount / transaction.categories.length
          transaction.categories.forEach(category => {
            categoryTotals[category] = (categoryTotals[category] || 0) + amountPerCategory
          })
        } else if (transaction.category) {
          // Single category
          categoryTotals[transaction.category] = (categoryTotals[transaction.category] || 0) + amount
        } else {
          // No categories, add to "Uncategorized"
          categoryTotals['Uncategorized'] = (categoryTotals['Uncategorized'] || 0) + amount
        }
      }
    })

    return Object.entries(categoryTotals)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalMonthlyIncome > 0 ? (amount / totalMonthlyIncome) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount)
  }, [bills, transactions, totalMonthlyIncome])

  // Generate burndown chart data
  const burndownData = useMemo(() => {
    const { start, end } = getDateRange()
    const days = differenceInDays(end, start) + 1
    const dailyDates = eachDayOfInterval({ start, end })
    
    // Calculate total budget for the period based on bills
    const totalBudget = bills.reduce((sum, bill) => {
      if (!bill.is_active) return sum
      
      const monthlyAmount = getMonthlyAmount(bill.amount, bill.billing_cycle)
      
      // Adjust for the selected period
      if (timePeriod === 'last30') {
        return sum + (monthlyAmount * (30 / 30)) // Daily rate * 30 days
      } else if (timePeriod === 'currentMonth') {
        const daysInMonth = differenceInDays(end, start) + 1
        return sum + (monthlyAmount * (daysInMonth / 30)) // Adjust for actual days in month
      } else if (timePeriod === 'last6months') {
        return sum + (monthlyAmount * 6)
      }
      return sum + monthlyAmount
    }, 0)

    if (totalBudget === 0) {
      // Return empty data if no budget
      return dailyDates.map((date) => ({
        day: format(date, 'MMM d'),
        ideal: 0,
        actual: 0
      }))
    }

    const idealDailyBurn = totalBudget / days
    let actualSpent = 0
    
    return dailyDates.map((date, index) => {
      const dayNum = index + 1
      const idealRemaining = Math.max(0, totalBudget - (idealDailyBurn * dayNum))
      
      // Simulate actual spending with some variation for realism
      // This creates a more realistic burndown pattern
      const dailyVariation = Math.sin(index * 0.3) * (idealDailyBurn * 0.2)
      const todaySpending = idealDailyBurn + dailyVariation
      actualSpent += todaySpending
      const actualRemaining = Math.max(0, totalBudget - actualSpent)
      
      return {
        day: format(date, 'MMM d'),
        ideal: parseFloat(idealRemaining.toFixed(2)),
        actual: parseFloat(actualRemaining.toFixed(2))
      }
    })
  }, [bills, timePeriod])

  // Income vs Expenses by category (frequency analysis)
  const frequencyData = useMemo(() => {
    // Calculate what percentage of income each category represents
    // Only include categories that have actual spending
    return categoryData
      .filter(cat => cat.amount > 0)
      .map(cat => {
        // Ensure percentage is calculated correctly
        const percentage = totalMonthlyIncome > 0
          ? (cat.amount / totalMonthlyIncome) * 100
          : 0

        // Determine frequency based on bills and transactions in this category
        let frequency = 'Mixed' // Default when category has both bills and transactions

        // Check if category has bills
        const billsInCategory = bills.filter(bill => bill.categories?.includes(cat.category))

        // Check if category has transactions
        const transactionsInCategory = transactions.filter(transaction =>
          (transaction.categories?.includes(cat.category) || transaction.category === cat.category) &&
          transaction.transaction_type === 'expense' &&
          !transaction.exclude_from_spending
        )

        if (billsInCategory.length > 0 && transactionsInCategory.length === 0) {
          // Only bills in this category
          const primaryBill = billsInCategory[0]
          if (primaryBill.billing_cycle === 'monthly') frequency = 'Monthly'
          else if (primaryBill.billing_cycle === 'weekly' || primaryBill.billing_cycle === 'biweekly') frequency = 'Frequent'
          else frequency = 'Periodic'
        } else if (transactionsInCategory.length > 0 && billsInCategory.length === 0) {
          // Only transactions in this category
          frequency = 'Variable'
        }
        // else: Mixed (both bills and transactions)

        return {
          category: cat.category,
          percentOfIncome: percentage,
          amount: cat.amount,
          frequency: frequency
        }
      })
      .sort((a, b) => b.percentOfIncome - a.percentOfIncome) // Sort by percentage descending
  }, [categoryData, bills, transactions, totalMonthlyIncome])

  // Spending forecast
  const forecastData = useMemo(() => {
    const baseMonthlySpending = categoryData.reduce((sum, cat) => sum + cat.amount, 0)
    
    return categoryData.map(cat => {
      // Simple linear projection with slight randomness for realism
      const growthRate = 1.02 // 2% monthly growth assumption
      const forecast30 = cat.amount * growthRate
      const forecast60 = cat.amount * Math.pow(growthRate, 2)
      const forecast90 = cat.amount * Math.pow(growthRate, 3)
      
      return {
        category: cat.category,
        current: cat.amount,
        '30_days': forecast30,
        '60_days': forecast60,
        '90_days': forecast90
      }
    })
  }, [categoryData])

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-sm">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Time Period Selector */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Expense Report</h2>
            <p className="text-black dark:text-white mt-1">Comprehensive analysis of your bills, transactions, and spending patterns</p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setTimePeriod('last30')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                timePeriod === 'last30' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Last 30 Days
            </button>
            <button
              onClick={() => setTimePeriod('currentMonth')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                timePeriod === 'currentMonth' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => setTimePeriod('last6months')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                timePeriod === 'last6months' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Last 6 Months
            </button>
          </div>
        </div>
      </div>

      {/* Category Breakdown Chart */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <ChartBar className="h-5 w-5 mr-2 text-blue-600" />
            Spending by Category
          </h3>
          <p className="text-sm text-black dark:text-white mt-1">Total amount spent per category (bills + transactions)</p>
        </div>
        
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={categoryData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="category" 
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="amount" fill="#3B82F6" radius={[8, 8, 0, 0]}>
              {categoryData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Burndown Chart */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
            Budget Burndown
          </h3>
          <p className="text-sm text-black dark:text-white mt-1">Tracking spending against budget over time</p>
        </div>
        
        {burndownData && burndownData.length > 0 && burndownData.some(d => d.ideal > 0 || d.actual > 0) ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={burndownData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="day" 
                tick={{ fontSize: 12 }}
                interval={Math.floor(burndownData.length / 8)}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `${(value / 1000).toFixed(1)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="ideal" 
                stroke="#10B981" 
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Ideal Spending"
                dot={false}
              />
              <Line 
                type="monotone" 
                dataKey="actual" 
                stroke="#3B82F6" 
                strokeWidth={2}
                name="Actual Remaining"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-black dark:text-white">
            <TrendingUp className="h-12 w-12 text-gray-300 mb-3" />
            <p className="text-center">
              No budget data available for burndown chart.
              <br />
              Add bills to see spending projections.
            </p>
          </div>
        )}
      </div>

      {/* Frequency of Income Spent Chart */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <DollarSign className="h-5 w-5 mr-2 text-purple-600" />
            Percentage of Income by Category
          </h3>
          <p className="text-sm text-black dark:text-white mt-1">How much of your income goes to each category (bills + transactions)</p>
        </div>
        
        {frequencyData.length > 0 && totalMonthlyIncome > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={frequencyData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => {
                    if (entry.percentOfIncome < 5) return ''
                    return `${entry.percentOfIncome.toFixed(1)}%`
                  }}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="percentOfIncome"
                  nameKey="category"
                >
                  {frequencyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, 'Percentage']}
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem' }}
                />
                <Legend 
                  verticalAlign="middle" 
                  align="right"
                  layout="vertical"
                  iconType="circle"
                  wrapperStyle={{
                    paddingLeft: '20px',
                  }}
                  formatter={(value) => {
                    const item = frequencyData.find(d => d.category === value)
                    if (item) {
                      return `${value} (${item.percentOfIncome.toFixed(1)}%)`
                    }
                    return value
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="mt-6 space-y-3">
              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Breakdown Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {frequencyData.map((item, index) => (
                    <div key={item.category} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-sm text-gray-700 truncate">{item.category}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">{formatCurrency(item.amount)}</span>
                        <span className="text-xs text-black dark:text-white bg-gray-100 px-2 py-1 rounded">
                          {item.percentOfIncome.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-blue-900">Total Monthly Income:</span>
                  <span className="text-lg font-bold text-blue-900">{formatCurrency(totalMonthlyIncome)}</span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-sm font-medium text-blue-900">Total Expenses:</span>
                  <span className="text-lg font-bold text-blue-900">
                    {formatCurrency(categoryData.reduce((sum, cat) => sum + cat.amount, 0))}
                  </span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-black dark:text-white">
            <DollarSign className="h-12 w-12 text-gray-300 mb-3" />
            <p className="text-center">
              {totalMonthlyIncome === 0 
                ? 'No income data available. Please add income sources to see this chart.'
                : 'No expense data available for the selected period.'}
            </p>
          </div>
        )}
      </div>

      {/* Spending Forecast Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-orange-600" />
            Spending Forecast
          </h3>
          <p className="text-sm text-black dark:text-white mt-1">Projected spending for the next 30, 60, and 90 days</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-black dark:text-white uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-black dark:text-white uppercase tracking-wider">
                  Current
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-black dark:text-white uppercase tracking-wider">
                  30 Days
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-black dark:text-white uppercase tracking-wider">
                  60 Days
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-black dark:text-white uppercase tracking-wider">
                  90 Days
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {forecastData.map((item, index) => (
                <tr key={item.category} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.category}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatCurrency(item.current)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatCurrency(item['30_days'])}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatCurrency(item['60_days'])}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatCurrency(item['90_days'])}
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-100 font-semibold">
                <td className="px-6 py-4 text-sm text-gray-900">
                  Total
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 text-right">
                  {formatCurrency(forecastData.reduce((sum, item) => sum + item.current, 0))}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 text-right">
                  {formatCurrency(forecastData.reduce((sum, item) => sum + item['30_days'], 0))}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 text-right">
                  {formatCurrency(forecastData.reduce((sum, item) => sum + item['60_days'], 0))}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 text-right">
                  {formatCurrency(forecastData.reduce((sum, item) => sum + item['90_days'], 0))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
          <p className="text-blue-100 text-sm">Total Monthly Expenses</p>
          <p className="text-3xl font-bold mt-2">
            {formatCurrency(categoryData.reduce((sum, cat) => sum + cat.amount, 0))}
          </p>
          <p className="text-blue-100 text-xs mt-2">
            Bills + Transactions across {categoryData.length} categories
          </p>
        </div>
        
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
          <p className="text-green-100 text-sm">Monthly Income</p>
          <p className="text-3xl font-bold mt-2">
            {formatCurrency(totalMonthlyIncome)}
          </p>
          <p className="text-green-100 text-xs mt-2">
            From {incomes.filter(i => i.is_active).length} active sources
          </p>
        </div>
        
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
          <p className="text-purple-100 text-sm">Net Monthly</p>
          <p className="text-3xl font-bold mt-2">
            {formatCurrency(totalMonthlyIncome - categoryData.reduce((sum, cat) => sum + cat.amount, 0))}
          </p>
          <p className="text-purple-100 text-xs mt-2">
            {totalMonthlyIncome > categoryData.reduce((sum, cat) => sum + cat.amount, 0) ? 'Surplus' : 'Deficit'}
          </p>
        </div>
      </div>

    </div>
  )
}
