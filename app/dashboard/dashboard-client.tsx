'use client'

import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Database } from '@/types/supabase'
import PlaidLinkButton from '@/components/PlaidLinkButton'
import BillUploader from '@/components/BillUploader'
import TransactionsList from '@/components/TransactionsList'
import BillsList from '@/components/BillsList'
import FinancialInsights from '@/components/FinancialInsights'
import AccountsOverview from '@/components/AccountsOverview'
import IncomeManagement from '@/components/IncomeManagement'
import FinancialForecasting from '@/components/FinancialForecasting'
import ManualBillEntry from '@/components/ManualBillEntry'
import AITransactionAnalyzer from '@/components/AITransactionAnalyzer'
import { 
  LogOut, Upload, Brain, DollarSign, Plus, 
  FileSpreadsheet, Menu, X, Home, Receipt, 
  CreditCard, TrendingUp, PlusCircle, BarChart3,
  Wallet, Settings, ChevronLeft, ChevronRight,
  ArrowUpRight, ArrowDownRight, Target, Calendar,
  AlertCircle, Edit3, PiggyBank, Sparkles, ChartBar
} from 'lucide-react'
import { DebtManagement } from '@/components/debt/DebtManagement'

type Transaction = Database['public']['Tables']['transactions']['Row']
type Account = Database['public']['Tables']['accounts']['Row']
type Bill = Database['public']['Tables']['bills']['Row']
type IncomeSources = Database['public']['Tables']['income_sources']['Row']

interface DashboardClientProps {
  user: User
  initialAccounts: Account[]
  initialTransactions: Transaction[]
  initialBills: Bill[]
  initialIncomeSources?: IncomeSources[]
}

export default function DashboardClient({ 
  user, 
  initialAccounts, 
  initialTransactions, 
  initialBills,
  initialIncomeSources = [] 
}: DashboardClientProps) {
  const [accounts, setAccounts] = useState(initialAccounts)
  const [transactions, setTransactions] = useState(initialTransactions)
  const [bills, setBills] = useState(initialBills)
  const [incomeSources, setIncomeSources] = useState<IncomeSources[]>(initialIncomeSources)
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'bills' | 'income' | 'forecast' | 'insights' | 'debts'>('overview')
  const [showBillUploader, setShowBillUploader] = useState(false)
  const [showManualBillEntry, setShowManualBillEntry] = useState(false)
  const [showAIAnalyzer, setShowAIAnalyzer] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Always fetch income sources on mount to ensure we have the latest data
  useEffect(() => {
    if (user?.id) {
      fetchIncomeSources()
    }
  }, [user?.id])

  const fetchIncomeSources = async () => {
    try {
      const { data, error } = await supabase
        .from('income_sources')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)

      if (error) {
        console.error('Error fetching income sources:', error)
        setIncomeSources([])
      } else {
        console.log('Fetched income sources:', data)
        setIncomeSources(data || [])
      }
    } catch (err) {
      console.error('Error in fetchIncomeSources:', err)
      setIncomeSources([])
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const refreshData = async () => {
    setLoading(true)
    try {
      const [accountsResult, transactionsResult, billsResult, incomeResult] = await Promise.all([
        supabase.from('accounts').select('*').eq('user_id', user.id),
        supabase.from('transactions').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(100),
        supabase.from('bills').select('*').eq('user_id', user.id).eq('is_active', true),
        supabase.from('income_sources').select('*').eq('user_id', user.id).eq('is_active', true)
      ])

      if (accountsResult.data) setAccounts(accountsResult.data)
      if (transactionsResult.data) setTransactions(transactionsResult.data)
      if (billsResult.data) setBills(billsResult.data)
      if (incomeResult.data) setIncomeSources(incomeResult.data)
    } catch (error) {
      console.error('Error refreshing data:', error)
    }
    setLoading(false)
  }

  // Calculate financial metrics with proper one-time and period handling
  const totalBalance = accounts.reduce((sum, account) => sum + (account.balance || 0), 0)
  
  const calculateMonthlyIncome = () => {
    const currentDate = new Date()
    const currentMonth = currentDate.getMonth()
    const currentYear = currentDate.getFullYear()
    const monthStart = new Date(currentYear, currentMonth, 1)
    const monthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999)
    
    console.log('Calculating monthly income:', {
      currentMonth,
      currentYear,
      monthStart: monthStart.toISOString(),
      monthEnd: monthEnd.toISOString(),
      incomeSources: incomeSources.length,
      sources: incomeSources
    })
    
    return incomeSources.reduce((sum, income) => {
      if (!income.is_active) {
        console.log(`Skipping inactive: ${income.name}`)
        return sum
      }

      // Handle one-time income with proper date range logic - EXACTLY like debug endpoint
      if (income.frequency === 'one-time') {
        if (!income.start_date) {
          console.log(`No start date for: ${income.name}`)
          return sum
        }
        
        const startDate = new Date(income.start_date)
        
        if (income.end_date) {
          const endDate = new Date(income.end_date)
          
          // Check if this income period overlaps with current month
          if (startDate <= monthEnd && endDate >= monthStart) {
            // Calculate the overlap period
            const effectiveStart = startDate > monthStart ? startDate : monthStart
            const effectiveEnd = endDate < monthEnd ? endDate : monthEnd
            
            // Calculate the number of days in the total period
            const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
            
            // Calculate the number of days in the current month
            const monthDays = Math.ceil((effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
            
            // Prorate the amount based on days in month vs total days
            const proratedAmount = (Number(income.amount) * monthDays) / totalDays
            
            console.log(`Prorating ${income.name}: ${monthDays}/${totalDays} days = $${proratedAmount.toFixed(2)}`)
            return sum + proratedAmount
          } else {
            console.log(`Outside current month: ${income.name}`)
          }
        } else {
          // If no end date, check if start date is in current month
          if (startDate >= monthStart && startDate <= monthEnd) {
            console.log(`One-time income ${income.name}: $${income.amount}`)
            return sum + Number(income.amount)
          }
        }
        return sum
      }
      
      // Handle recurring income with start/end date checks
      if (income.start_date) {
        const startDate = new Date(income.start_date)
        if (startDate > monthEnd) {
          console.log(`Not started yet: ${income.name}`)
          return sum // Hasn't started yet
        }
        
        if (income.end_date) {
          const endDate = new Date(income.end_date)
          if (endDate < monthStart) {
            console.log(`Already ended: ${income.name}`)
            return sum // Already ended
          }
        }
      }
      
      // Frequency multipliers for recurring income
      const multipliers: Record<string, number> = {
        'monthly': 1,
        'biweekly': 2.16667, // ~26 payments per year / 12
        'weekly': 4.33333,   // ~52 payments per year / 12
        'quarterly': 0.33333, // 4 payments per year / 12
        'annual': 0.08333,    // 1 payment per year / 12
      }
      
      // Special handling for quarterly income
      if (income.frequency === 'quarterly' && income.start_date) {
        const startDate = new Date(income.start_date)
        const monthsDiff = (currentYear - startDate.getFullYear()) * 12 + (currentMonth - startDate.getMonth())
        
        // Check if this is a quarter payment month (every 3 months from start)
        if (monthsDiff >= 0 && monthsDiff % 3 === 0) {
          console.log(`Quarterly income ${income.name}: $${income.amount}`)
          return sum + Number(income.amount)
        }
        return sum
      }
      
      // Special handling for annual income
      if (income.frequency === 'annual' && income.start_date) {
        const startDate = new Date(income.start_date)
        
        // Check if this month matches the anniversary month
        if (startDate.getMonth() === currentMonth) {
          const yearsDiff = currentYear - startDate.getFullYear()
          if (yearsDiff >= 0) {
            console.log(`Annual income ${income.name}: $${income.amount}`)
            return sum + Number(income.amount)
          }
        }
        return sum
      }
      
      // Regular recurring income (monthly, biweekly, weekly)
      const monthlyAmount = Number(income.amount) * (multipliers[income.frequency] || 0)
      if (monthlyAmount > 0) {
        console.log(`Recurring ${income.frequency} income ${income.name}: $${monthlyAmount.toFixed(2)}`)
      }
      return sum + monthlyAmount
    }, 0)
  }

  const calculateMonthlyExpenses = () => {
    const currentDate = new Date()
    const currentMonth = currentDate.getMonth()
    const currentYear = currentDate.getFullYear()
    
    return bills.reduce((sum, bill) => {
      if (!bill.is_active) return sum
      
      // Handle one-time bills
      if (bill.billing_cycle === 'one-time') {
        const dueDate = new Date(bill.due_date)
        if (dueDate.getMonth() === currentMonth && 
            dueDate.getFullYear() === currentYear) {
          return sum + Number(bill.amount)
        }
        return sum
      }
      
      // Handle quarterly bills
      if (bill.billing_cycle === 'quarterly') {
        const dueDate = new Date(bill.due_date)
        const monthsDiff = (currentYear - dueDate.getFullYear()) * 12 + 
                          (currentMonth - dueDate.getMonth())
        if (monthsDiff >= 0 && monthsDiff % 3 === 0) {
          return sum + Number(bill.amount)
        }
        return sum
      }
      
      // Handle annual bills
      if (bill.billing_cycle === 'annual') {
        const dueDate = new Date(bill.due_date)
        if (dueDate.getMonth() === currentMonth) {
          const yearsDiff = currentYear - dueDate.getFullYear()
          if (yearsDiff >= 0) {
            return sum + Number(bill.amount)
          }
        }
        return sum
      }
      
      // Regular recurring bills
      const multipliers: Record<string, number> = {
        'monthly': 1,
        'biweekly': 2.16667,
        'weekly': 4.33333,
      }
      
      return sum + (Number(bill.amount) * (multipliers[bill.billing_cycle] || 0))
    }, 0)
  }

  // Helper function to get upcoming one-time items
  const getUpcomingOneTimeItems = () => {
    const today = new Date()
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
    
    const upcomingBills = bills.filter(bill => {
      if (bill.billing_cycle !== 'one-time') return false
      const dueDate = new Date(bill.due_date)
      return dueDate >= today && dueDate <= thirtyDaysFromNow && bill.is_active
    }).map(bill => ({
      ...bill,
      type: 'expense' as const,
      date: new Date(bill.due_date),
      amount: Number(bill.amount)
    }))
    
    const upcomingIncome = incomeSources.filter(income => {
      if (income.frequency !== 'one-time') return false
      if (!income.start_date) return false
      const startDate = new Date(income.start_date)
      return startDate >= today && startDate <= thirtyDaysFromNow && income.is_active
    }).map(income => ({
      ...income,
      type: 'income' as const,
      date: new Date(income.start_date!),
      amount: Number(income.amount)
    }))
    
    const allItems = [...upcomingBills, ...upcomingIncome]
      .sort((a, b) => a.date.getTime() - b.date.getTime())
    
    return allItems
  }

  // Get breakdown of current month's finances
  const getCurrentMonthBreakdown = () => {
    const currentDate = new Date()
    const currentMonth = currentDate.getMonth()
    const currentYear = currentDate.getFullYear()
    const monthStart = new Date(currentYear, currentMonth, 1)
    const monthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999)
    
    let oneTimeIncome = 0
    let recurringIncome = 0
    
    incomeSources.forEach(income => {
      if (!income.is_active) return
      
      if (income.frequency === 'one-time' && income.start_date) {
        const startDate = new Date(income.start_date)
        
        if (income.end_date) {
          const endDate = new Date(income.end_date)
          
          // Check if this income period overlaps with current month
          if (startDate <= monthEnd && endDate >= monthStart) {
            const effectiveStart = startDate > monthStart ? startDate : monthStart
            const effectiveEnd = endDate < monthEnd ? endDate : monthEnd
            const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
            const monthDays = Math.ceil((effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
            const proratedAmount = (Number(income.amount) * monthDays) / totalDays
            oneTimeIncome += proratedAmount
          }
        } else {
          if (startDate >= monthStart && startDate <= monthEnd) {
            oneTimeIncome += Number(income.amount)
          }
        }
      } else {
        const multipliers: Record<string, number> = {
          'monthly': 1,
          'biweekly': 2.16667,
          'weekly': 4.33333,
          'quarterly': 0.33333,
          'annual': 0.08333,
        }
        recurringIncome += Number(income.amount) * (multipliers[income.frequency] || 0)
      }
    })
    
    let oneTimeExpenses = 0
    let recurringExpenses = 0
    
    bills.forEach(bill => {
      if (!bill.is_active) return
      
      if (bill.billing_cycle === 'one-time') {
        const dueDate = new Date(bill.due_date)
        if (dueDate.getMonth() === currentMonth && dueDate.getFullYear() === currentYear) {
          oneTimeExpenses += Number(bill.amount)
        }
      } else if (bill.billing_cycle === 'quarterly') {
        const dueDate = new Date(bill.due_date)
        const monthsDiff = (currentYear - dueDate.getFullYear()) * 12 + 
                          (currentMonth - dueDate.getMonth())
        if (monthsDiff >= 0 && monthsDiff % 3 === 0) {
          recurringExpenses += Number(bill.amount)
        }
      } else if (bill.billing_cycle === 'annual') {
        const dueDate = new Date(bill.due_date)
        if (dueDate.getMonth() === currentMonth) {
          recurringExpenses += Number(bill.amount)
        }
      } else {
        const multipliers: Record<string, number> = {
          'monthly': 1,
          'biweekly': 2.16667,
          'weekly': 4.33333,
        }
        recurringExpenses += Number(bill.amount) * (multipliers[bill.billing_cycle] || 0)
      }
    })
    
    return {
      oneTimeIncome,
      recurringIncome,
      totalIncome: oneTimeIncome + recurringIncome,
      oneTimeExpenses,
      recurringExpenses,
      totalExpenses: oneTimeExpenses + recurringExpenses,
      netCashFlow: (oneTimeIncome + recurringIncome) - (oneTimeExpenses + recurringExpenses)
    }
  }

  const monthlyIncome = calculateMonthlyIncome()
  const monthlyExpenses = calculateMonthlyExpenses()
  const monthlySavings = monthlyIncome - monthlyExpenses
  const savingsRate = monthlyIncome > 0 ? (monthlySavings / monthlyIncome) * 100 : 0
  const monthBreakdown = getCurrentMonthBreakdown()
  const upcomingOneTimeItems = getUpcomingOneTimeItems()

  // Log for debugging
  useEffect(() => {
    console.log('Dashboard Income Calculation:', {
      incomeSources: incomeSources.length,
      monthlyIncome,
      monthBreakdown,
      currentMonth: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    })
  }, [incomeSources, monthlyIncome])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Navigation items
  const navItems = [
    { id: 'overview', label: 'Overview', icon: Home },
    { id: 'income', label: 'Income', icon: TrendingUp },
    { id: 'transactions', label: 'Transactions', icon: CreditCard },
    { id: 'bills', label: 'Bills', icon: Receipt },
    { id: 'debts', label: 'Debts', icon: PiggyBank },
    { id: 'forecast', label: 'Forecast', icon: BarChart3 },
    { id: 'insights', label: 'Insights', icon: Brain },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Mobile Sidebar */}
      <div className={`fixed left-0 top-0 h-full w-64 bg-white shadow-lg z-50 transform transition-transform lg:hidden ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Menu</h2>
            <button onClick={() => setMobileMenuOpen(false)}>
              <X className="w-6 h-6 text-gray-500" />
            </button>
          </div>
        </div>
        <nav className="p-4">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as any)
                  setMobileMenuOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
                  activeTab === item.id
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Main Content */}
      <div className="lg:flex">
        {/* Desktop Sidebar */}
        <div className={`hidden lg:block ${sidebarCollapsed ? 'w-20' : 'w-64'} bg-gradient-to-b from-blue-900 via-blue-800 to-blue-900 shadow-xl h-screen sticky top-0 transition-all duration-300`}>
          {/* Collapse Toggle Button */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="absolute -right-3 top-8 bg-blue-600 text-white rounded-full p-1.5 shadow-lg hover:bg-blue-700 transition-colors z-10"
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
          
          <div className="p-6 border-b border-blue-700/50">
            <div className={`${sidebarCollapsed ? 'text-center' : ''}`}>
              <h1 className={`font-bold text-white ${sidebarCollapsed ? 'text-xl' : 'text-2xl'} transition-all`}>
                {sidebarCollapsed ? 'MBP' : 'My Budget Planner'}
              </h1>
              {!sidebarCollapsed && (
                <p className="text-xs text-blue-200 mt-1 font-medium tracking-wider uppercase">
                  AI-Powered Finance
                </p>
              )}
            </div>
          </div>
          
          <nav className="p-4">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-lg mb-2 transition-all group relative ${
                    activeTab === item.id
                      ? 'bg-white/20 text-white shadow-lg'
                      : 'text-blue-100 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className={`${sidebarCollapsed ? 'w-6 h-6' : 'w-5 h-5'}`} />
                  {!sidebarCollapsed && (
                    <span className="font-medium">{item.label}</span>
                  )}
                  {sidebarCollapsed && (
                    <span className="absolute left-full ml-2 px-2 py-1 bg-blue-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                      {item.label}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>
          
          <div className="absolute bottom-0 w-full p-4 border-t border-blue-700/50">
            <button
              onClick={handleSignOut}
              className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 text-red-300 hover:bg-red-900/20 hover:text-red-200 rounded-lg transition-all group relative`}
            >
              <LogOut className={`${sidebarCollapsed ? 'w-6 h-6' : 'w-5 h-5'}`} />
              {!sidebarCollapsed && (
                <span className="font-medium">Sign Out</span>
              )}
              {sidebarCollapsed && (
                <span className="absolute left-full ml-2 px-2 py-1 bg-red-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                  Sign Out
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Main Area */}
        <div className={`flex-1 ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'} transition-all duration-300`}>
          {/* Mobile Header */}
          <div className="lg:hidden bg-white shadow-sm sticky top-0 z-30">
            <div className="flex items-center justify-between p-4">
              <button onClick={() => setMobileMenuOpen(true)}>
                <Menu className="w-6 h-6 text-gray-700" />
              </button>
              <h1 className="text-lg font-bold text-gray-900">Budget Planner</h1>
              <button onClick={handleSignOut}>
                <LogOut className="w-6 h-6 text-red-600" />
              </button>
            </div>
          </div>

          {/* Page Content */}
          <div className="p-4 lg:p-8">
            {/* User Welcome */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Welcome back, {user.email?.split('@')[0]}!
              </h2>
              <p className="text-gray-600 mt-1">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>

            {/* Financial Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Balance</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totalBalance)}</p>
                  </div>
                  <Wallet className="w-8 h-8 text-blue-500" />
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Monthly Income</p>
                    <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(monthlyIncome)}</p>
                    {monthBreakdown.oneTimeIncome > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        Includes {formatCurrency(monthBreakdown.oneTimeIncome)} one-time
                      </p>
                    )}
                  </div>
                  <ArrowUpRight className="w-8 h-8 text-green-500" />
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Monthly Expenses</p>
                    <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(monthlyExpenses)}</p>
                    {monthBreakdown.oneTimeExpenses > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        Includes {formatCurrency(monthBreakdown.oneTimeExpenses)} one-time
                      </p>
                    )}
                  </div>
                  <ArrowDownRight className="w-8 h-8 text-red-500" />
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Savings Rate</p>
                    <p className="text-2xl font-bold text-purple-600 mt-1">{savingsRate.toFixed(1)}%</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Net: {formatCurrency(monthlySavings)}
                    </p>
                  </div>
                  <Target className="w-8 h-8 text-purple-500" />
                </div>
              </div>
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              {activeTab === 'overview' && (
                <div className="p-6">
                  <h3 className="text-xl font-bold text-blue-900">Financial Overview</h3>
                  
                  {/* Quick Actions */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <PlaidLinkButton 
                      userId={user.id}
                      onSuccess={refreshData}
                    />
                    <button
                      onClick={() => setShowBillUploader(true)}
                      className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Upload className="w-5 h-5" />
                      Upload Bills
                    </button>
                    <button
                      onClick={() => setShowManualBillEntry(true)}
                      className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Edit3 className="w-5 h-5" />
                      Add Bill
                    </button>
                    <button
                      onClick={() => setActiveTab('income')}
                      className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus className="w-5 h-5" />
                      Add Income
                    </button>
                  </div>

                  {/* Upcoming One-Time Items */}
                  {upcomingOneTimeItems.length > 0 && (
                    <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <Calendar className="w-5 h-5 text-yellow-600" />
                        <h4 className="font-semibold text-gray-900">Upcoming One-Time Items (Next 30 Days)</h4>
                      </div>
                      <div className="space-y-2">
                        {upcomingOneTimeItems.slice(0, 5).map((item, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {item.type === 'income' ? (
                                <ArrowUpRight className="w-4 h-4 text-green-500" />
                              ) : (
                                <ArrowDownRight className="w-4 h-4 text-red-500" />
                              )}
                              <span className="text-sm text-gray-700">{item.name}</span>
                              <span className="text-xs text-gray-500">
                                {item.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                            </div>
                            <span className={`font-medium ${item.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                              {item.type === 'income' ? '+' : '-'}{formatCurrency(item.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Monthly Breakdown */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h4 className="font-semibold text-gray-900 mb-4">Monthly Cash Flow Breakdown</h4>
                    
                    {/* Income Breakdown */}
                    <div className="mb-6">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">Income</span>
                        <span className="font-semibold text-green-600">{formatCurrency(monthBreakdown.totalIncome)}</span>
                      </div>
                      <div className="space-y-1 ml-4">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-600">Recurring</span>
                          <span className="text-gray-900">{formatCurrency(monthBreakdown.recurringIncome)}</span>
                        </div>
                        {monthBreakdown.oneTimeIncome > 0 && (
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-600">One-time</span>
                            <span className="text-gray-900">{formatCurrency(monthBreakdown.oneTimeIncome)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Expense Breakdown */}
                    <div className="mb-6">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">Expenses</span>
                        <span className="font-semibold text-red-600">{formatCurrency(monthBreakdown.totalExpenses)}</span>
                      </div>
                      <div className="space-y-1 ml-4">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-600">Recurring</span>
                          <span className="text-gray-900">{formatCurrency(monthBreakdown.recurringExpenses)}</span>
                        </div>
                        {monthBreakdown.oneTimeExpenses > 0 && (
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-600">One-time</span>
                            <span className="text-gray-900">{formatCurrency(monthBreakdown.oneTimeExpenses)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Progress Bars */}
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm text-gray-600">Income</span>
                          <span className="font-semibold text-green-600">{formatCurrency(monthlyIncome)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-green-500 h-2 rounded-full" style={{ width: '100%' }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm text-gray-600">Expenses</span>
                          <span className="font-semibold text-red-600">{formatCurrency(monthlyExpenses)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-red-500 h-2 rounded-full" 
                            style={{ width: `${monthlyIncome > 0 ? Math.min((monthlyExpenses / monthlyIncome) * 100, 100) : 0}%` }} 
                          />
                        </div>
                      </div>
                      <div className="pt-4 border-t">
                        <div className="flex justify-between">
                          <span className="font-semibold text-gray-900">Net Savings</span>
                          <span className={`font-bold text-lg ${monthlySavings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(monthlySavings)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recent Transactions Preview */}
                  <div className="mt-8">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-gray-900">Recent Transactions</h4>
                      <button
                        onClick={() => setActiveTab('transactions')}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        View All →
                      </button>
                    </div>
                    <div className="space-y-2">
                      {transactions.slice(0, 5).map((transaction) => (
                        <div key={transaction.id} className="flex items-center justify-between py-2 border-b last:border-0">
                          <div>
                            <p className="font-medium text-gray-900">{transaction.description}</p>
                            <p className="text-sm text-gray-500">{new Date(transaction.date).toLocaleDateString()}</p>
                          </div>
                          <span className={`font-semibold ${
                            transaction.transaction_type === 'income' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {transaction.transaction_type === 'income' ? '+' : '-'}
                            {formatCurrency(Math.abs(transaction.amount))}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'income' && (
                <div className="p-6">
                  <IncomeManagement userId={user.id} onUpdate={refreshData} />
                </div>
              )}

              {activeTab === 'transactions' && (
                <div className="p-6">
                  <TransactionsList 
                    transactions={transactions} 
                    userId={user.id}
                    onUpdate={refreshData}
                  />
                </div>
              )}

              {activeTab === 'bills' && (
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-blue-900">Bills Management</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowAIAnalyzer(true)}
                        className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                      >
                        <Sparkles className="w-4 h-4" />
                        AI Detect Bills
                      </button>
                      <Link
                        href="/dashboard/reports"
                        className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
                      >
                        <ChartBar className="w-4 h-4" />
                        Expense Report
                      </Link>
                      <button
                        onClick={() => setShowManualBillEntry(true)}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                      >
                        <Edit3 className="w-4 h-4" />
                        Manual Entry
                      </button>
                      <button
                        onClick={() => setShowBillUploader(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                      >
                        <Upload className="w-4 h-4" />
                        Upload Bills
                      </button>
                    </div>
                  </div>
                  
                  {/* AI Transaction Analyzer */}
                  {showAIAnalyzer && (
                    <div className="mb-6">
                      <AITransactionAnalyzer
                        userId={user.id}
                        transactions={transactions}
                        onBillsDetected={(detectedBills) => {
                          console.log('Bills detected:', detectedBills)
                        }}
                        onCreateBills={(createdBills) => {
                          console.log('Bills created:', createdBills)
                          refreshData()
                          setShowAIAnalyzer(false)
                        }}
                      />
                    </div>
                  )}
                  
                  <BillsList bills={bills} />
                </div>
              )}

              {activeTab === 'forecast' && (
                <div className="p-6">
                  <FinancialForecasting 
                    userId={user.id}
                    transactions={transactions}
                    incomeSources={incomeSources}
                    bills={bills}
                  />
                </div>
              )}

              {activeTab === 'insights' && (
                <div className="p-6">
                  <FinancialInsights 
                    transactions={transactions}
                    bills={bills}
                    userId={user.id}
                  />
                </div>
              )}

              {activeTab === 'debts' && (
                <div className="p-6">
                  <DebtManagement />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bill Uploader Modal */}
      {showBillUploader && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Upload Bills</h3>
              <button onClick={() => setShowBillUploader(false)}>
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>
            <BillUploader 
              userId={user.id}
              onSuccess={() => {
                setShowBillUploader(false)
                refreshData()
              }}
            />
          </div>
        </div>
      )}

      {/* Manual Bill Entry Modal */}
      {showManualBillEntry && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <ManualBillEntry 
              userId={user.id}
              onSuccess={() => {
                setShowManualBillEntry(false)
                refreshData()
              }}
              onCancel={() => setShowManualBillEntry(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}