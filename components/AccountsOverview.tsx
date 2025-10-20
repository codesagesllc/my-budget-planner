'use client'

import { formatCurrency } from '@/lib/utils/helpers'
import { CreditCard, Building, Wallet } from 'lucide-react'

interface AccountsOverviewProps {
  accounts: any[]
}

export default function AccountsOverview({ accounts }: AccountsOverviewProps) {
  const getAccountIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'credit':
        return <CreditCard className="h-5 w-5" />
      case 'investment':
      case 'loan':
        return <Building className="h-5 w-5" />
      default:
        return <Wallet className="h-5 w-5" />
    }
  }

  const getAccountColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'credit':
        return 'text-red-600 bg-red-50'
      case 'investment':
        return 'text-green-600 bg-green-50'
      case 'loan':
        return 'text-orange-600 bg-orange-50'
      default:
        return 'text-blue-600 bg-blue-50'
    }
  }

  if (accounts.length === 0) {
    return (
      <div className="text-center py-12">
        <Wallet className="h-12 w-12 text-black dark:text-white mx-auto mb-4" />
        <h3 className="text-lg font-medium text-black dark:text-white mb-2">No accounts connected</h3>
        <p className="text-black dark:text-white">Connect your bank accounts to see your balances here</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {accounts.map((account) => (
        <div key={account.id} className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-2">
            <div className={`p-2 rounded-lg ${getAccountColor(account.type)}`}>
              {getAccountIcon(account.type)}
            </div>
            <span className="text-xs text-black dark:text-white uppercase">{account.type}</span>
          </div>
          <h3 className="font-medium text-black dark:text-white mb-1">{account.name}</h3>
          <p className="text-2xl font-bold text-black dark:text-white">
            {formatCurrency(account.balance)}
          </p>
          <p className="text-xs text-black dark:text-white mt-2">
            Last updated: {new Date(account.updated_at).toLocaleDateString()}
          </p>
        </div>
      ))}
    </div>
  )
}
