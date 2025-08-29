'use client'

import { useState } from 'react'
import { formatCurrency } from '@/lib/utils/helpers'
import { Calendar, DollarSign, Clock, CheckCircle, Trash2, Edit } from 'lucide-react'

interface BillsListProps {
  bills: any[]
}

export default function BillsList({ bills: initialBills }: BillsListProps) {
  const [bills, setBills] = useState(initialBills)
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'overdue'>('all')
  const [deleting, setDeleting] = useState<string | null>(null)

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
      return { text: `${Math.abs(diffDays)}d overdue`, color: 'text-red-600 bg-red-50' }
    } else if (diffDays === 0) {
      return { text: 'Due today', color: 'text-amber-600 bg-amber-50' }
    } else if (diffDays <= 3) {
      return { text: `${diffDays}d left`, color: 'text-amber-600 bg-amber-50' }
    } else if (diffDays <= 7) {
      return { text: `${diffDays}d left`, color: 'text-blue-600 bg-blue-50' }
    } else {
      return { text: `${diffDays}d left`, color: 'text-gray-600 bg-gray-50' }
    }
  }

  const handleDelete = async (billId: string, userId: string) => {
    if (!confirm('Are you sure you want to delete this bill?')) return
    
    setDeleting(billId)
    try {
      const response = await fetch('/api/bills/manual', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billId, userId }),
      })

      if (response.ok) {
        setBills(bills.filter(b => b.id !== billId))
      } else {
        alert('Failed to delete bill')
      }
    } catch (error) {
      console.error('Error deleting bill:', error)
      alert('Error deleting bill')
    } finally {
      setDeleting(null)
    }
  }

  const filteredBills = getFilteredBills()

  if (bills.length === 0) {
    return (
      <div className="text-center py-8 sm:py-12">
        <Calendar className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No bills added yet</h3>
        <p className="text-sm text-gray-500">Add bills manually or upload a spreadsheet</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex space-x-2 border-b overflow-x-auto">
        {(['all', 'upcoming', 'overdue'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-3 sm:px-4 py-2 font-medium text-xs sm:text-sm capitalize border-b-2 transition-colors whitespace-nowrap ${
              filter === tab
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab} ({tab === 'all' ? bills.length : getFilteredBills.length})
          </button>
        ))}
      </div>

      {/* Mobile: Card View */}
      <div className="sm:hidden space-y-3">
        {filteredBills.map((bill) => {
          const status = getDueDateStatus(bill.due_date)
          return (
            <div key={bill.id} className="bg-white rounded-lg border p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium text-gray-900 flex-1">{bill.name}</h3>
                <button
                  onClick={() => handleDelete(bill.id, bill.user_id)}
                  disabled={deleting === bill.id}
                  className="text-red-500 hover:text-red-700 p-1 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Amount</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(bill.amount)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Cycle</span>
                  <span className="text-sm">{getBillingCycleLabel(bill.billing_cycle)}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Status</span>
                  <span className={`px-2 py-1 rounded-full text-xs ${status.color}`}>
                    {status.text}
                  </span>
                </div>

                {bill.category && (
                  <div className="pt-1">
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

      {/* Desktop: Grid View */}
      <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredBills.map((bill) => {
          const status = getDueDateStatus(bill.due_date)
          return (
            <div key={bill.id} className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-medium text-gray-900 flex-1">{bill.name}</h3>
                <div className="flex items-center space-x-1">
                  {bill.is_active ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <div className="h-5 w-5 rounded-full bg-gray-300" />
                  )}
                  <button
                    onClick={() => handleDelete(bill.id, bill.user_id)}
                    disabled={deleting === bill.id}
                    className="text-red-500 hover:text-red-700 p-1 disabled:opacity-50"
                    title="Delete bill"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
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
        <div className="text-center py-6 sm:py-8 text-gray-500">
          No {filter === 'all' ? '' : filter} bills found
        </div>
      )}
    </div>
  )
}
