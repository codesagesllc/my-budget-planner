'use client'

import { useState } from 'react'
import { User } from '@supabase/supabase-js'
import { formatCurrency } from '@/lib/utils/helpers'
import PlaidLinkButton from '@/components/PlaidLinkButton'
import BillUploader from '@/components/BillUploader'
import TransactionsList from '@/components/TransactionsList'
import BillsList from '@/components/BillsList'
import FinancialInsights from '@/components/FinancialInsights'
import AccountsOverview from '@/components/AccountsOverview'
import { LogOut, Upload, Link, Brain, DollarSign } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface DashboardClientProps {
  user: User
  initialAccounts: any[]
  initialTransactions: any[]
  initialBills: any[]
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
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'bills' | 'insights'>('overview')
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const totalBalance = accounts.reduce((sum, account) => sum + (account.balance || 0), 0)
  const monthlyBills = bills.reduce((sum, bill) => {
    if (bill.billing_cycle === 'monthly') return sum + bill.amount
    if (bill.billing_cycle === 'annual') return sum + (bill.amount / 12)
    if (bill.billing_cycle === 'quarterly') return sum + (bill.amount / 3)
    if (bill.billing_cycle === 'weekly') return sum + (bill.amount * 4.33)
    if (bill.billing_cycle === 'biweekly') return sum + (bill.amount * 2.17)
    return sum
  }, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-blue-600 mr-2" />
              <h1 className="text-xl font-bold text-gray-900">Budget Planner</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">{user.email}</span>
              <button
                onClick={handleSignOut}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Balance</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalBalance)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Monthly Bills</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(monthlyBills)}</p>
              </div>
              <Upload className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Connected Accounts</p>
                <p className="text-2xl font-bold text-gray-900">{accounts.length}</p>
              </div>
              <Link className="h-8 w-8 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4 mb-8">
          <PlaidLinkButton 
            userId={user.id} 
            onSuccess={() => router.refresh()} 
          />
          <BillUploader 
            userId={user.id} 
            onSuccess={() => router.refresh()} 
          />
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {(['overview', 'transactions', 'bills', 'insights'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                    activeTab === tab
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <AccountsOverview accounts={accounts} />
            )}
            {activeTab === 'transactions' && (
              <TransactionsList transactions={transactions} />
            )}
            {activeTab === 'bills' && (
              <BillsList bills={bills} />
            )}
            {activeTab === 'insights' && (
              <FinancialInsights 
                transactions={transactions} 
                bills={bills} 
                userId={user.id}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  )
}