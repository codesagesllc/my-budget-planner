'use client'

import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Database } from '@/types/supabase'
import PlaidLinkButton from '@/components/PlaidLinkButton'
import BillUploader from '@/components/BillUploader'
import TransactionsList from '@/components/TransactionsList'
import BillsList from '@/components/BillsList'
import FinancialInsights from '@/components/FinancialInsights'
import AccountsOverview from '@/components/AccountsOverview'
import IncomeManagement from '@/components/IncomeManagement'
import FinancialForecasting from '@/components/FinancialForecasting'
import { 
  LogOut, Upload, Link, Brain, DollarSign, Plus, 
  FileSpreadsheet, Menu, X, Home, Receipt, 
  CreditCard, TrendingUp, PlusCircle, BarChart3,
  Wallet, Settings, ChevronLeft, ChevronRight,
  ArrowUpRight, ArrowDownRight, Target
} from 'lucide-react'

type Transaction = Database['public']['Tables']['transactions']['Row']
type Account = Database['public']['Tables']['accounts']['Row']
type Bill = Database['public']['Tables']['bills']['Row']
type IncomeSources = Database['public']['Tables']['income_sources']['Row']

interface DashboardClientProps {
  user: User
  initialAccounts: Account[]
  initialTransactions: Transaction[]
  initialBills: Bill[]
}

export default function DashboardClient({ 
  user, 
  initialAccounts, 
  initialTransactions, 
  initialBills 
}: DashboardClientProps) {
  const [accounts, setAccounts] = useState(initialAccounts)
  const [transactions, setTransactions] = useState(initialTransactions)
  const [bills, setBills] = useState(initialBills)
  const [incomeSources, setIncomeSources] = useState<IncomeSources[]>([])
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'bills' | 'income' | 'forecast' | 'insights'>('overview')
  const [showBillUploader, setShowBillUploader] = useState(false)
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Fetch income sources on mount
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
        // Table might not exist yet, so we'll just set empty array
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
    router.push('/login')
  }

  const refreshData = async () => {
    setLoading(true)
    const [accountsResult, transactionsResult, billsResult, incomeResult] = await Promise.all([
      supabase.from('accounts').select('*').eq('user_id', user.id),
      supabase.from('transactions').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(50),
      supabase.from('bills').select('*').eq('user_id', user.id).eq('is_active', true),
      supabase.from('income_sources').select('*').eq('user_id', user.id).eq('is_active', true)
    ])

    if (accountsResult.data) setAccounts(accountsResult.data)
    if (transactionsResult.data) setTransactions(transactionsResult.data)
    if (billsResult.data) setBills(billsResult.data)
    if (incomeResult.data) setIncomeSources(incomeResult.data)
    setLoading(false)
  }

  // Calculate financial metrics
  const totalBalance = accounts.reduce((sum, account) => sum + (account.balance || 0), 0)
  
  const calculateMonthlyIncome = () => {
    return incomeSources.reduce((sum, income) => {
      const multipliers: Record<string, number> = {
        'monthly': 1,
        'biweekly': 2.16667,
        'weekly': 4.33333,
        'quarterly': 0.33333,
        'annual': 0.08333,
        'one-time': 0
      }
      return sum + (income.amount * (multipliers[income.frequency] || 0))
    }, 0)
  }

  const calculateMonthlyExpenses = () => {
    return bills.reduce((sum, bill) => {
      const multipliers: Record<string, number> = {
        'monthly': 1,
        'biweekly': 2.16667,
        'weekly': 4.33333,
        'quarterly': 0.33333,
        'annual': 0.08333
      }
      return sum + (bill.amount * (multipliers[bill.billing_cycle] || 1))
    }, 0)
  }

  const monthlyIncome = calculateMonthlyIncome()
  const monthlyExpenses = calculateMonthlyExpenses()
  const monthlySavings = monthlyIncome - monthlyExpenses
  const savingsRate = monthlyIncome > 0 ? (monthlySavings / monthlyIncome) * 100 : 0

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
        <div className="hidden lg:block w-64 bg-white shadow-md h-screen sticky top-0">
          <div className="p-6 border-b">
            <h1 className="text-2xl font-bold text-gray-900">Budget Planner</h1>
            <p className="text-sm text-gray-600 mt-1">AI-Powered Finance</p>
          </div>
          <nav className="p-4">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
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
          <div className="absolute bottom-0 w-full p-4 border-t">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Sign Out</span>
            </button>
          </div>
        </div>

        {/* Main Area */}
        <div className="flex-1 lg:ml-0">
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
                  </div>
                  <ArrowUpRight className="w-8 h-8 text-green-500" />
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Monthly Expenses</p>
                    <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(monthlyExpenses)}</p>
                  </div>
                  <ArrowDownRight className="w-8 h-8 text-red-500" />
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Savings Rate</p>
                    <p className="text-2xl font-bold text-purple-600 mt-1">{savingsRate.toFixed(1)}%</p>
                  </div>
                  <Target className="w-8 h-8 text-purple-500" />
                </div>
              </div>
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              {activeTab === 'overview' && (
                <div className="p-6">
                  <h3 className="text-lg font-semibold mb-6">Financial Overview</h3>
                  
                  {/* Quick Actions */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
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
                      onClick={() => setActiveTab('income')}
                      className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus className="w-5 h-5" />
                      Add Income
                    </button>
                  </div>

                  {/* Monthly Breakdown */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h4 className="font-semibold text-gray-900 mb-4">Monthly Cash Flow</h4>
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
                            style={{ width: `${monthlyIncome > 0 ? (monthlyExpenses / monthlyIncome) * 100 : 0}%` }} 
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
                  <TransactionsList transactions={transactions} />
                </div>
              )}

              {activeTab === 'bills' && (
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold">Bills Management</h3>
                    <button
                      onClick={() => setShowBillUploader(true)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      Upload Bills
                    </button>
                  </div>
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
                    accounts={accounts}
                  />
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
              onCancel={() => setShowBillUploader(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}