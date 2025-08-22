'use client'

import { formatCurrency } from '@/lib/utils/helpers'
import { Calendar, DollarSign, Clock, CheckCircle } from 'lucide-react'
import { useState } from 'react'

interface BillsListProps {
  bills: any[]
}

export default function BillsList({ bills }: BillsListProps) {
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'overdue'>('all')

  const getFilteredBills = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    switch (filter) {
      case 'upcoming':
        return bills.filter(bill => {
          const dueDate = new Date(bill.due_date)
          return dueDate >= today && dueDate <= new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
        })
      case 'overdue':
        return bills.filter(bill => new Date(bill.due_date) < today)
      default:
        return bills
    }
  }

  const getBillingCycleLabel = (cycle: string) => {
    switch (cycle) {
      case 'monthly': return 'Monthly'
      case 'quarterly': return 'Quarterly'
      case 'annual': return 'Annual'
      case 'weekly': return 'Weekly'
      case 'biweekly': return 'Bi-weekly'
      default: return cycle
    }
  }

  const getDueDateStatus = (dueDate: string) => {
    const due = new Date(dueDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const diffTime = due.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) {
      return { text: `${Math.abs(diffDays)} days overdue`, color: 'text-red-600 bg-red-50' }
    } else if (diffDays === 0) {
      return { text: 'Due today', color: 'text-amber-600 bg-amber-50' }
    } else if (diffDays <= 3) {
      return { text: `Due in ${diffDays} days`, color: 'text-amber-600 bg-amber-50' }
    } else if (diffDays <= 7) {
      return { text: `Due in ${diffDays} days`, color: 'text-blue-600 bg-blue-50' }
    } else {
      return { text: `Due in ${diffDays} days`, color: 'text-gray-600 bg-gray-50' }
    }
  }

  const filteredBills = getFilteredBills()

  if (bills.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No bills added yet</h3>
        <p className="text-gray-500">Upload your bills spreadsheet to track recurring payments</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex space-x-2 border-b">
        {(['all', 'upcoming', 'overdue'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-2 font-medium text-sm capitalize border-b-2 transition-colors ${
              filter === tab
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab} ({tab === 'all' ? bills.length : getFilteredBills.length})
          </button>
        ))}
      </div>

      {/* Bills Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredBills.map((bill) => {
          const status = getDueDateStatus(bill.due_date)
          return (
            <div key={bill.id} className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-medium text-gray-900">{bill.name}</h3>
                {bill.is_active ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <div className="h-5 w-5 rounded-full bg-gray-300" />
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center text-sm text-gray-600">
                  <DollarSign className="h-4 w-4 mr-2" />
                  <span className="font-semibold text-lg text-gray-900">
                    {formatCurrency(bill.amount)}
                  </span>
                </div>

                <div className="flex items-center text-sm text-gray-600">
                  <Clock className="h-4 w-4 mr-2" />
                  <span>{getBillingCycleLabel(bill.billing_cycle)}</span>
                </div>

                <div className="flex items-center text-sm">
                  <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                  <span className={`px-2 py-1 rounded-full text-xs ${status.color}`}>
                    {status.text}
                  </span>
                </div>

                {bill.category && (
                  <div className="pt-2">
                    <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
                      {bill.category}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {filteredBills.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No {filter === 'all' ? '' : filter} bills found
        </div>
      )}
    </div>
  )
}
