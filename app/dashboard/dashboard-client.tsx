'use client'

import React, { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Database } from '@/types/supabase'
import { useRolePermissions } from '@/hooks/useRolePermissions'
import { UsageMeter } from '@/components/ui/usage-meter'
import { toast } from 'sonner'
import PlaidLinkButton from '@/components/PlaidLinkButton'
import BillUploader from '@/components/BillUploader'
import TransactionsList from '@/components/TransactionsList'
import BillsList from '@/components/BillsList'
import FinancialInsights from '@/components/FinancialInsights'
import AccountsOverview from '@/components/AccountsOverview'
import IncomeManagement from '@/components/IncomeManagement'
import FinancialForecasting from '@/components/FinancialForecasting'
import ManualBillEntry from '@/components/ManualBillEntry'
import { RemainingBalanceCard } from '@/components/RemainingBalanceCard'
import AITransactionAnalyzer from '@/components/AITransactionAnalyzer'
import AddAccountModal from '@/components/AddAccountModal'
import {
  LogOut, Upload, Brain, DollarSign, Plus,
  FileSpreadsheet, Menu, X, Home, Receipt,
  CreditCard, TrendingUp, PlusCircle, BarChart3,
  Wallet, Settings, ChevronLeft, ChevronRight,
  ArrowUpRight, ArrowDownRight, Target, Calendar,
  AlertCircle, Edit3, PiggyBank, Sparkles, ChartBar,
  Crown, Shield, Lock, ChevronDown, BookOpen
} from 'lucide-react'
import { DebtManagement } from '@/components/debt/DebtManagement'
import RealTimeAlerts from '@/components/RealTimeAlerts'
import CategoryBudgetTracker from '@/components/CategoryBudgetTracker'
import CashFlowMeter from '@/components/CashFlowMeter'
import SavingsGoalsTracker from '@/components/SavingsGoalsTracker'
import DebtPayoffTracker from '@/components/DebtPayoffTracker'
import CategorySpendingLimits from '@/components/CategorySpendingLimits'
import PlaidSyncButton from '@/components/PlaidSyncButton'
import SpendingLimitNotifications from '@/components/SpendingLimitNotifications'
import RealtimeDiagnostic from '@/components/RealtimeDiagnostic'

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
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'bills' | 'income' | 'forecast' | 'insights' | 'debts' | 'budgets' | 'docs' | 'admin'>('overview')
  const [showBillUploader, setShowBillUploader] = useState(false)
  const [showManualBillEntry, setShowManualBillEntry] = useState(false)
  const [showAIAnalyzer, setShowAIAnalyzer] = useState(false)
  const [showAddAccount, setShowAddAccount] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showUsagePanel, setShowUsagePanel] = useState(false)
  const [alertsCollapsed, setAlertsCollapsed] = useState(false)
  const [savingsCollapsed, setSavingsCollapsed] = useState(false)
  const [quickActionsCollapsed, setQuickActionsCollapsed] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Auto-collapse real-time components when navigating away from overview
  useEffect(() => {
    if (activeTab !== 'overview') {
      setAlertsCollapsed(true)
      setSavingsCollapsed(true)
      setQuickActionsCollapsed(true)
    } else {
      setAlertsCollapsed(false)
      setSavingsCollapsed(false)
      setQuickActionsCollapsed(false)
    }
  }, [activeTab])

  // Role-based permissions
  const {
    role,
    hasFeature,
    canAccessUI,
    getFeatureUsage,
    trackUsage,
    showUpgradePrompt,
    usageStats,
    fetchUsageStats,
    user: rbacUser
  } = useRolePermissions()
  
  // Check if user is in trial period
  const isInTrial = role === 'premium' && rbacUser?.subscription_tier === 'free_trial'
  const trialDaysLeft = React.useMemo(() => {
    if (!isInTrial || !rbacUser?.free_trial_end_date) return 0
    const endDate = new Date(rbacUser.free_trial_end_date)
    const now = new Date()
    const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return Math.max(0, daysLeft)
  }, [isInTrial, rbacUser])

  // Always fetch income sources on mount to ensure we have the latest data
  useEffect(() => {
    if (user?.id) {
      fetchIncomeSources()
    }
  }, [user?.id])

  // Real-time subscriptions for dashboard data
  useEffect(() => {
    if (!user?.id) return

    console.log('Setting up real-time subscriptions for dashboard')

    const channel = supabase
      .channel('dashboard-updates')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        async (payload) => {
          console.log('🔄 Transaction change detected in dashboard:', payload)
          // Refresh transactions
          const { data: newTransactions } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', user.id)
            .order('date', { ascending: false })
            .limit(100)
          if (newTransactions) {
            setTransactions(newTransactions)
          }
        })
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'bills' },
        async (payload) => {
          console.log('🔄 Bill change detected in dashboard:', payload)
          // Refresh bills
          const { data: newBills } = await supabase
            .from('bills')
            .select('*')
            .eq('user_id', user.id)
            .order('due_date', { ascending: true })
          if (newBills) {
            setBills(newBills)
          }
        })
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'accounts' },
        async (payload) => {
          console.log('🔄 Account change detected in dashboard:', payload)
          // Refresh accounts
          const { data: newAccounts } = await supabase
            .from('accounts')
            .select('*')
            .eq('user_id', user.id)
          if (newAccounts) {
            setAccounts(newAccounts)
          }
        })
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'income_sources' },
        async (payload) => {
          console.log('🔄 Income source change detected in dashboard:', payload)
          // Refresh income sources
          await fetchIncomeSources()
        })
      .subscribe((status) => {
        console.log('Dashboard realtime subscription status:', status)
      })

    // Cleanup subscription on unmount
    return () => {
      console.log('Cleaning up dashboard realtime subscriptions')
      supabase.removeChannel(channel)
    }
  }, [user?.id, supabase])

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
        setIncomeSources(data || [])
      }
    } catch (err) {
      console.error('Error in fetchIncomeSources:', err)
      setIncomeSources([])
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()

    // Determine the correct login URL based on environment
    const currentHost = window.location.hostname
    let loginUrl = '/login' // fallback

    if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
      // Development environment
      loginUrl = '/login'
      router.push(loginUrl)
    } else if (currentHost === 'www.pocketwiseai.com' || currentHost === 'pocketwiseai.com') {
      // Production domain
      window.location.href = 'https://www.pocketwiseai.com/login'
    } else if (currentHost.includes('vercel.app')) {
      // Vercel deployment
      window.location.href = 'https://my-budget-planner-seven.vercel.app/login'
    } else {
      // Unknown environment, use relative path
      router.push(loginUrl)
    }
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

  const calculateMonthlyIncome = () => {
    const currentDate = new Date()
    const currentMonth = currentDate.getMonth()
    const currentYear = currentDate.getFullYear()
    const monthStart = new Date(currentYear, currentMonth, 1)
    const monthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999)
    
    
    return incomeSources.reduce((sum, income) => {
      if (!income.is_active) {
        return sum
      }

      // Handle one-time income with proper date range logic
      if (income.frequency === 'one-time') {
        if (!income.start_date) {
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

            return sum + proratedAmount
          }
        } else {
          // If no end date, check if start date is in current month
          if (startDate >= monthStart && startDate <= monthEnd) {
            return sum + Number(income.amount)
          }
        }
        return sum
      }

      // Handle recurring income with start/end date checks
      if (income.start_date) {
        const startDate = new Date(income.start_date)
        if (startDate > monthEnd) {
          return sum // Hasn't started yet
        }

        if (income.end_date) {
          const endDate = new Date(income.end_date)
          if (endDate < monthStart) {
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
            return sum + Number(income.amount)
          }
        }
        return sum
      }

      // Regular recurring income (monthly, biweekly, weekly)
      const monthlyAmount = Number(income.amount) * (multipliers[income.frequency] || 0)
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

  // Smart income reconciliation - prevent double counting
  const reconcileIncomeWithTransactions = () => {
    const reconciledIncome = {
      fromTransactions: 0,
      fromManualSources: 0,
      matched: 0,
      unmatched: 0
    }

    // Get all income transactions for the current month
    const currentDate = new Date()
    const currentMonth = currentDate.getMonth()
    const currentYear = currentDate.getFullYear()
    const monthStart = new Date(currentYear, currentMonth, 1)
    const monthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999)
    
    const incomeTransactions = transactions.filter(t => {
      const transDate = new Date(t.date)
      return (t.transaction_type === 'income' || t.amount > 0) &&
             transDate >= monthStart && transDate <= monthEnd
    })

    // Track which transactions have been matched
    const matchedTransactions = new Set<string>()
    
    // Process each income source and find matching transactions
    incomeSources.forEach(incomeSource => {
      if (!incomeSource.is_active) return
      
      // Calculate expected payments for this month based on frequency
      let expectedPayments = 0
      let expectedAmount = incomeSource.amount
      
      if (incomeSource.frequency === 'biweekly') {
        // Biweekly = ~2.16667 payments per month on average
        // But in any given month, it's either 2 or 3 payments
        // Check actual dates to be precise
        if (incomeSource.start_date) {
          const startDate = new Date(incomeSource.start_date)
          let paymentDate = new Date(startDate)
          let paymentsThisMonth = 0
          
          // Calculate all biweekly payment dates for this month
          while (paymentDate <= monthEnd) {
            if (paymentDate >= monthStart && paymentDate <= monthEnd) {
              paymentsThisMonth++
            }
            paymentDate.setDate(paymentDate.getDate() + 14) // Add 14 days
            if (paymentsThisMonth >= 3) break // Max 3 biweekly payments in a month
          }
          expectedPayments = paymentsThisMonth
        } else {
          expectedPayments = 2 // Default to 2 if no start date
        }
      } else if (incomeSource.frequency === 'weekly') {
        expectedPayments = 4 // 4 or 5 weekly payments per month
      } else if (incomeSource.frequency === 'monthly') {
        expectedPayments = 1
      } else if (incomeSource.frequency === 'one-time' && incomeSource.start_date) {
        const startDate = new Date(incomeSource.start_date)
        if (startDate >= monthStart && startDate <= monthEnd) {
          expectedPayments = 1
        }
      }
      
      // Find matching transactions for this income source
      const tolerance = expectedAmount * 0.10 // 10% tolerance for taxes/deductions
      const minAmount = expectedAmount - tolerance
      const maxAmount = expectedAmount + tolerance
      
      let matchedCount = 0
      let matchedTotal = 0
      
      incomeTransactions.forEach(transaction => {
        // Skip if already matched
        if (matchedTransactions.has(transaction.id)) return
        if (matchedCount >= expectedPayments) return
        
        const transactionAmount = Math.abs(transaction.amount)
        
        // Check if this transaction matches the expected amount
        if (transactionAmount >= minAmount && transactionAmount <= maxAmount) {
          const description = transaction.description?.toLowerCase() || ''
          
          // Additional confidence checks
          const isLikelyMatch = 
            description.includes('payroll') ||
            description.includes('salary') ||
            description.includes('direct dep') ||
            description.includes('dd') ||
            description.includes('wages') ||
            description.includes(incomeSource.name.toLowerCase().split(' ')[0])
          
          // For biweekly/weekly, be more lenient with matching
          if (incomeSource.frequency === 'biweekly' || incomeSource.frequency === 'weekly' || isLikelyMatch) {
            matchedTransactions.add(transaction.id)
            matchedCount++
            matchedTotal += transactionAmount
            reconciledIncome.matched += transactionAmount
          }
        }
      })
      
      // Calculate unmatched expected income
      const expectedTotal = expectedAmount * expectedPayments
      const unmatchedExpected = Math.max(0, expectedTotal - matchedTotal)
      
      if (unmatchedExpected > 0) {
        reconciledIncome.fromManualSources += unmatchedExpected
      }
      
    })
    
    // Add any unmatched transactions as unexpected income
    incomeTransactions.forEach(transaction => {
      if (!matchedTransactions.has(transaction.id)) {
        const amount = Math.abs(transaction.amount)
        reconciledIncome.unmatched += amount
        reconciledIncome.fromTransactions += amount
      }
    })


    return reconciledIncome
  }

  // Calculate financial metrics with proper one-time and period handling
  const accountsBalance = accounts.reduce((sum, account) => sum + (account.balance || 0), 0)
  
  // Use reconciled income to prevent double counting
  const reconciledIncome = reconcileIncomeWithTransactions()
  const totalIncomeFromTransactions = reconciledIncome.fromTransactions
  const totalExpectedIncome = reconciledIncome.fromManualSources
  
  // Calculate total expenses from transactions (withdrawals/charges)
  const totalExpensesFromTransactions = transactions
    .filter(t => t.transaction_type === 'expense' || (t.transaction_type !== 'income' && t.amount < 0))
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)
  
  // Calculate expected vs actual for the current month
  const currentDate = new Date()
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
  const currentDay = currentDate.getDate()
  const monthProgress = currentDay / daysInMonth
  
  // For the current month, use the greater of actual transactions or expected income/expenses
  // This gives users a realistic view even before transactions are imported
  const effectiveMonthlyIncome = Math.max(
    totalIncomeFromTransactions,
    calculateMonthlyIncome() * monthProgress // Prorated expected income
  )
  
  const effectiveMonthlyExpenses = Math.max(
    totalExpensesFromTransactions,
    calculateMonthlyExpenses() * monthProgress // Prorated expected expenses
  )
  
  // Calculate the net balance using reconciled amounts
  // This prevents double-counting of income that appears in both manual sources and transactions
  const hasTransactions = transactions.length > 0
  const totalBalance = hasTransactions
    ? accountsBalance + totalIncomeFromTransactions + totalExpectedIncome - totalExpensesFromTransactions
    : accountsBalance + (calculateMonthlyIncome() - calculateMonthlyExpenses())
  

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

  const monthlyIncome = React.useMemo(() => calculateMonthlyIncome(), [incomeSources])
  const monthlyExpenses = React.useMemo(() => calculateMonthlyExpenses(), [bills])
  const monthlySavings = monthlyIncome - monthlyExpenses
  const savingsRate = monthlyIncome > 0 ? (monthlySavings / monthlyIncome) * 100 : 0
  const monthBreakdown = React.useMemo(() => getCurrentMonthBreakdown(), [incomeSources, bills])
  const upcomingOneTimeItems = React.useMemo(() => getUpcomingOneTimeItems(), [incomeSources, bills])


  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Navigation items with role-based visibility
  const navItems = [
    { id: 'overview', label: 'Overview', icon: Home, requiredFeature: null },
    { id: 'income', label: 'Income', icon: TrendingUp, requiredFeature: null },
    { id: 'transactions', label: 'Transactions', icon: CreditCard, requiredFeature: null },
    { id: 'bills', label: 'Bills', icon: Receipt, requiredFeature: null },
    { id: 'budgets', label: 'Budget Limits', icon: Target, requiredFeature: null },
    { id: 'debts', label: 'Debts', icon: PiggyBank, requiredFeature: 'debt_strategies' },
    { id: 'forecast', label: 'Forecast', icon: BarChart3, requiredFeature: 'budget_forecasting' },
    { id: 'insights', label: 'Insights', icon: Brain, requiredFeature: 'ai_insights' },
    { id: 'docs', label: 'Documentation', icon: BookOpen, requiredFeature: null },
  ].filter(item => !item.requiredFeature || hasFeature(item.requiredFeature as any))
  
  // Add admin panel if user is admin
  if (canAccessUI('accessAdminPanel')) {
    navItems.push({ id: 'admin', label: 'Admin', icon: Shield, requiredFeature: null })
  }
  
  // Helper to check and track feature usage
  const handleFeatureAccess = async (feature: string, callback: () => void) => {
    const usage = getFeatureUsage(feature)
    if (usage.isExhausted) {
      showUpgradePrompt(feature)
      return
    }
    
    const allowed = await trackUsage(feature)
    if (allowed) {
      callback()
    }
  }

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
                  if (item.id === 'docs') {
                    router.push('/dashboard/docs')
                  } else {
                    setActiveTab(item.id as any)
                  }
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
                {sidebarCollapsed ? 'PWA' : 'PocketWiseAI'}
              </h1>
              {!sidebarCollapsed && (
                <>
                  <p className="text-xs text-blue-200 mt-1 font-medium tracking-wider uppercase">
                    AI-Powered Finance
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      role === 'admin' ? 'bg-red-500 text-white' :
                      role === 'premium' ? 'bg-purple-500 text-white' :
                      role === 'basic' ? 'bg-blue-500 text-white' :
                      'bg-gray-500 text-white'
                    }`}>
                      {role === 'admin' && <Shield className="w-3 h-3 inline mr-1" />}
                      {role === 'premium' && <Crown className="w-3 h-3 inline mr-1" />}
                      {role.toUpperCase()}
                    </span>
                    {canAccessUI('showUsageMeters') && (
                      <button
                        onClick={() => setShowUsagePanel(!showUsagePanel)}
                        className="text-blue-200 hover:text-white transition-colors"
                      >
                        <BarChart3 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
          
          <nav className="p-4">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  data-tab={item.id}
                  onClick={() => {
                    if (item.id === 'docs') {
                      router.push('/dashboard/docs')
                    } else {
                      setActiveTab(item.id as any)
                    }
                  }}
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
              <h1 className="text-lg font-bold text-gray-900">PocketWiseAI</h1>
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
              <p className="text-gray-700 mt-1">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              {isInTrial && trialDaysLeft > 0 && (
                <div className="mt-3 inline-flex items-center gap-2 bg-gradient-to-r from-purple-100 to-blue-100 px-4 py-2 rounded-lg">
                  <Crown className="w-5 h-5 text-purple-600" />
                  <span className="text-sm font-medium text-gray-900">
                    Premium Trial: {trialDaysLeft} days remaining
                  </span>
                </div>
              )}
            </div>

            {/* Financial Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Net Balance</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totalBalance)}</p>
                    {hasTransactions ? (
                      <>
                        <p className="text-xs text-gray-500 mt-1">
                          Base: {formatCurrency(accountsBalance)}
                        </p>
                        <p className="text-xs text-gray-500">
                          +Income: {formatCurrency(totalIncomeFromTransactions)}
                        </p>
                        {totalExpectedIncome > 0 && (
                          <p className="text-xs text-gray-500">
                            +Expected: {formatCurrency(totalExpectedIncome)}
                          </p>
                        )}
                        {reconciledIncome.matched > 0 && (
                          <p className="text-xs text-green-600">
                            ✓ Matched: {formatCurrency(reconciledIncome.matched)}
                          </p>
                        )}
                        <p className="text-xs text-gray-500">
                          -Expenses: {formatCurrency(totalExpensesFromTransactions)}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-xs text-gray-500 mt-1">
                          Expected monthly net
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatCurrency(calculateMonthlyIncome())} - {formatCurrency(calculateMonthlyExpenses())}
                        </p>
                      </>
                    )}
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

              <RemainingBalanceCard />

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

            {/* Quick Actions - Collapsible */}
            <div className="mb-8">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-4 border-b border-gray-200">
                  <button
                    onClick={() => setQuickActionsCollapsed(!quickActionsCollapsed)}
                    className="w-full flex items-center justify-between text-left"
                  >
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Plus className="h-5 w-5 text-blue-500" />
                      Quick Actions
                    </h3>
                    <ChevronDown className={`h-5 w-5 text-gray-500 transition-transform ${quickActionsCollapsed ? '-rotate-90' : ''}`} />
                  </button>
                </div>
                {!quickActionsCollapsed && (
                  <div className="p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                      <button
                        onClick={() => {
                          const accountUsage = getFeatureUsage('account_connections')
                          if (accountUsage.isExhausted) {
                            showUpgradePrompt('account connections')
                          } else {
                            setShowAddAccount(true)
                          }
                        }}
                        className={`px-6 py-3 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                          getFeatureUsage('account_connections').isExhausted
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700'
                        }`}
                        disabled={getFeatureUsage('account_connections').isExhausted}
                      >
                        <Wallet className="w-5 h-5" />
                        Add Account
                        {getFeatureUsage('account_connections').isExhausted && (
                          <Lock className="w-4 h-4 ml-1" />
                        )}
                      </button>


                      <button
                        onClick={() => handleFeatureAccess('bill_parsing', () => setShowBillUploader(true))}
                        className={`px-6 py-3 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                          !hasFeature('bill_parsing')
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                        disabled={!hasFeature('bill_parsing')}
                        title="📄 Upload spreadsheets (CSV, Excel) containing your bills. AI will extract bill names, amounts, billing cycles, and automatically categorize them using Plaid categories for better transaction matching."
                      >
                        <Upload className="w-5 h-5" />
                        Upload Bills
                        {!hasFeature('bill_parsing') && (
                          <Lock className="w-4 h-4 ml-1" />
                        )}
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
                  </div>
                )}
              </div>
            </div>

            {/* Real-time Financial Tracking Components */}
            <div className="space-y-6 mb-8">
              {/* Real-time Alerts - Collapsible */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-4 border-b border-gray-200">
                  <button
                    onClick={() => setAlertsCollapsed(!alertsCollapsed)}
                    className="w-full flex items-center justify-between text-left"
                  >
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-orange-500" />
                      Real-time Alerts & Notifications
                    </h3>
                    <ChevronDown className={`h-5 w-5 text-gray-500 transition-transform ${alertsCollapsed ? '-rotate-90' : ''}`} />
                  </button>
                </div>
                {!alertsCollapsed && (
                  <div className="p-6 space-y-6">
                    <RealTimeAlerts userId={user.id} />
                    <SpendingLimitNotifications
                      userId={user.id}
                      onNavigateToBudgets={() => setActiveTab('budgets')}
                    />
                  </div>
                )}
              </div>

              {/* Savings Goals - Collapsible */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-4 border-b border-gray-200">
                  <button
                    onClick={() => setSavingsCollapsed(!savingsCollapsed)}
                    className="w-full flex items-center justify-between text-left"
                  >
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Target className="h-5 w-5 text-green-500" />
                      Savings Goals Progress
                    </h3>
                    <ChevronDown className={`h-5 w-5 text-gray-500 transition-transform ${savingsCollapsed ? '-rotate-90' : ''}`} />
                  </button>
                </div>
                {!savingsCollapsed && (
                  <div className="p-6">
                    <SavingsGoalsTracker userId={user.id} />
                  </div>
                )}
              </div>
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              {activeTab === 'overview' && (
                <div className="p-6">
                  <h3 className="text-xl font-bold text-blue-900">Financial Overview</h3>

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

                  {/* Cash Flow Analysis */}
                  <CashFlowMeter userId={user.id} />

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
                        onClick={() => handleFeatureAccess('income_detection', () => setShowAIAnalyzer(true))}
                        className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                          !hasFeature('income_detection')
                            ? 'bg-gray-400 cursor-not-allowed text-gray-200'
                            : 'bg-purple-600 text-white hover:bg-purple-700'
                        }`}
                        disabled={!hasFeature('income_detection')}
                      >
                        <Sparkles className="w-4 h-4" />
                        AI Detect Bills
                        {!hasFeature('income_detection') && (
                          <Lock className="w-3 h-3 ml-1" />
                        )}
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
                        title="📊 Upload CSV or Excel files with your bills. AI automatically extracts and categorizes bills using Plaid-compatible categories for accurate expense tracking and transaction matching."
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
                        onClose={() => setShowAIAnalyzer(false)}
                      />
                    </div>
                  )}
                  
                  <BillsList bills={bills} />
                </div>
              )}

              {activeTab === 'forecast' && (
                <div className="p-6">
                  {hasFeature('budget_forecasting') ? (
                    <FinancialForecasting 
                      userId={user.id}
                      transactions={transactions}
                      incomeSources={incomeSources}
                      bills={bills}
                    />
                  ) : (
                    <div className="text-center py-12">
                      <Lock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Budget Forecasting Requires Upgrade
                      </h3>
                      <p className="text-gray-600 mb-6">
                        Upgrade to Basic or Premium to unlock budget forecasting features.
                      </p>
                      <button
                        onClick={() => showUpgradePrompt('Budget Forecasting')}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Upgrade Now
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'insights' && (
                <div className="p-6">
                  {hasFeature('ai_insights') ? (
                    <FinancialInsights
                      transactions={transactions}
                      bills={bills}
                      incomeSources={incomeSources}
                      userId={user.id}
                    />
                  ) : (
                    <div className="text-center py-12">
                      <Lock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        AI Insights Requires Upgrade
                      </h3>
                      <p className="text-gray-600 mb-6">
                        Upgrade to {role === 'free_trial' ? 'Basic' : 'Premium'} to unlock AI-powered financial insights.
                      </p>
                      <button
                        onClick={() => showUpgradePrompt('AI Insights')}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Upgrade Now
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'debts' && (
                <div className="p-6">
                  {hasFeature('debt_strategies') ? (
                    <DebtManagement userId={user.id} />
                  ) : (
                    <div className="text-center py-12">
                      <Lock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Debt Management Requires Upgrade
                      </h3>
                      <p className="text-gray-600 mb-6">
                        Upgrade to unlock AI-powered debt management strategies.
                      </p>
                      <button
                        onClick={() => showUpgradePrompt('Debt Strategies')}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Upgrade Now
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'budgets' && (
                <div className="p-6">
                  <CategorySpendingLimits userId={user.id} />
                </div>
              )}

              {activeTab === 'admin' && canAccessUI('accessAdminPanel') && (
                <div className="p-6">
                  <div className="text-center">
                    <h2 className="text-2xl font-bold mb-4 text-gray-900">Admin Dashboard</h2>
                    <p className="text-gray-700 mb-6">Access the admin control panel</p>
                    <div className="space-y-4">
                      <Shield className="h-16 w-16 text-blue-600 mx-auto" />
                      <div className="text-sm text-gray-500">
                        <p>Current Role: <strong>{role}</strong></p>
                        <p>Admin Access: <strong>{canAccessUI('accessAdminPanel') ? 'Granted' : 'Denied'}</strong></p>
                      </div>
                      <button
                        onClick={() => router.push('/admin')}
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 text-base"
                      >
                        Open Admin Dashboard
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Usage Panel Modal */}
      {showUsagePanel && canAccessUI('showUsageMeters') && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold">Usage & Limits</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Your {role} plan usage for {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </p>
              </div>
              <button onClick={() => setShowUsagePanel(false)}>
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* AI Features */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">AI Features</h4>
                <div className="space-y-3">
                  <UsageMeter
                    label="AI Insights"
                    used={getFeatureUsage('ai_insights').used}
                    limit={getFeatureUsage('ai_insights').limit}
                  />
                  <UsageMeter
                    label="Bill Parsing"
                    used={getFeatureUsage('bill_parsing').used}
                    limit={getFeatureUsage('bill_parsing').limit}
                  />
                  <UsageMeter
                    label="Income Detection"
                    used={getFeatureUsage('income_detection').used}
                    limit={getFeatureUsage('income_detection').limit}
                  />
                  <UsageMeter
                    label="Debt Strategies"
                    used={getFeatureUsage('debt_strategies').used}
                    limit={getFeatureUsage('debt_strategies').limit}
                  />
                </div>
              </div>
              
              {/* Data Limits */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Data Limits</h4>
                <div className="space-y-3">
                  <UsageMeter
                    label="Transactions"
                    used={transactions.length}
                    limit={getFeatureUsage('transaction_limit').limit}
                  />
                  <UsageMeter
                    label="Account Connections"
                    used={accounts.length}
                    limit={getFeatureUsage('account_connections').limit}
                  />
                  <UsageMeter
                    label="Financial Goals"
                    used={getFeatureUsage('goal_tracking').used}
                    limit={getFeatureUsage('goal_tracking').limit}
                  />
                  <UsageMeter
                    label="File Uploads"
                    used={getFeatureUsage('file_uploads').used}
                    limit={getFeatureUsage('file_uploads').limit}
                  />
                </div>
              </div>
              
              {/* Features */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Features</h4>
                <div className="grid grid-cols-2 gap-3">
                  <UsageMeter
                    label="Export Data"
                    used={0}
                    limit={hasFeature('export_data')}
                    compact
                  />
                  <UsageMeter
                    label="Advanced Analytics"
                    used={0}
                    limit={hasFeature('advanced_analytics')}
                    compact
                  />
                  <UsageMeter
                    label="Budget Forecasting"
                    used={0}
                    limit={hasFeature('budget_forecasting')}
                    compact
                  />
                  <UsageMeter
                    label="Custom Categories"
                    used={0}
                    limit={hasFeature('custom_categories')}
                    compact
                  />
                </div>
              </div>
              
              {/* Upgrade CTA */}
              {role !== 'premium' && role !== 'admin' && (
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 text-center">
                  <Crown className="w-10 h-10 text-purple-600 mx-auto mb-3" />
                  <h4 className="font-semibold text-gray-900 mb-2">
                    Unlock {role === 'free_trial' ? 'More' : 'Unlimited'} Features
                  </h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Upgrade to {role === 'free_trial' ? 'Basic for $15/mo' : 'Premium for $30/mo'} and get {role === 'free_trial' ? 'increased limits' : 'unlimited access'}.
                  </p>
                  <button
                    onClick={() => {
                      setShowUsagePanel(false)
                      router.push('/pricing')
                    }}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors"
                  >
                    Upgrade Now
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Add Account Modal */}
      {showAddAccount && (
        <AddAccountModal
          onClose={() => setShowAddAccount(false)}
          onSuccess={refreshData}
        />
      )}

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