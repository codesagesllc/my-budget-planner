'use client'

import { useState, useEffect } from 'react'
import { formatCurrency } from '@/lib/utils/helpers'
import {
  Calendar,
  DollarSign,
  Clock,
  CheckCircle,
  Trash2,
  Edit,
  X,
  AlertTriangle,
  RefreshCw,
  Check,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

interface Bill {
  id: string
  name: string
  amount: number
  due_date: string
  billing_cycle: string
  category?: string
  is_paid: boolean
  payment_date?: string
  is_overdue: boolean
  current_period_start: string
  current_period_end: string
  recurrence_type: string
}

interface BillsListWithPaymentsProps {
  bills: Bill[]
  onBillUpdate?: () => void
}

export default function BillsListWithPayments({ bills: initialBills, onBillUpdate }: BillsListWithPaymentsProps) {
  const [bills, setBills] = useState<Bill[]>(initialBills)
  const [filter, setFilter] = useState<'all' | 'paid' | 'unpaid' | 'overdue'>('all')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [paymentLoading, setPaymentLoading] = useState<string | null>(null)

  useEffect(() => {
    setBills(initialBills)
  }, [initialBills])

  const handlePaymentToggle = async (billId: string, currentlyPaid: boolean) => {
    setPaymentLoading(billId)

    try {
      const response = await fetch('/api/bills/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          billId,
          action: currentlyPaid ? 'unpay' : 'pay'
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update payment status')
      }

      // Update the local state
      setBills(prevBills =>
        prevBills.map(bill =>
          bill.id === billId
            ? { ...bill, ...result.bill }
            : bill
        )
      )

      toast.success(result.message)

      // Trigger parent component refresh if provided
      if (onBillUpdate) {
        onBillUpdate()
      }

    } catch (error) {
      console.error('Payment toggle error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update payment status')
    } finally {
      setPaymentLoading(null)
    }
  }

  const getFilteredBills = () => {
    switch (filter) {
      case 'paid':
        return bills.filter(bill => bill.is_paid)
      case 'unpaid':
        return bills.filter(bill => !bill.is_paid && !bill.is_overdue)
      case 'overdue':
        return bills.filter(bill => bill.is_overdue)
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

  const getPaymentStatusIcon = (bill: Bill) => {
    if (paymentLoading === bill.id) {
      return <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
    }

    if (bill.is_overdue && !bill.is_paid) {
      return <AlertTriangle className="h-4 w-4 text-red-500" />
    }

    return (
      <div
        className={`h-4 w-4 border-2 rounded cursor-pointer transition-colors ${
          bill.is_paid
            ? 'bg-green-500 border-green-500'
            : 'border-gray-300 hover:border-green-400'
        }`}
        onClick={() => handlePaymentToggle(bill.id, bill.is_paid)}
      >
        {bill.is_paid && <Check className="h-3 w-3 text-white" />}
      </div>
    )
  }

  const getDueDateDisplay = (bill: Bill) => {
    if (bill.recurrence_type === 'one-time') {
      const dueDate = new Date(bill.due_date)
      return {
        text: dueDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        }),
        color: bill.is_paid ? 'text-green-600' : bill.is_overdue ? 'text-red-600' : 'text-purple-600'
      }
    }

    // For recurring bills, show the current period
    const periodStart = new Date(bill.current_period_start)
    const periodEnd = new Date(bill.current_period_end)

    return {
      text: `${periodStart.toLocaleDateString('en-US', { month: 'short' })} ${periodStart.getDate()} - ${periodEnd.getDate()}`,
      color: bill.is_paid ? 'text-green-600' : bill.is_overdue ? 'text-red-600' : 'text-blue-600'
    }
  }

  const filteredBills = getFilteredBills()
  const summary = {
    total: bills.length,
    paid: bills.filter(bill => bill.is_paid).length,
    unpaid: bills.filter(bill => !bill.is_paid && !bill.is_overdue).length,
    overdue: bills.filter(bill => bill.is_overdue).length,
    totalAmount: bills.reduce((sum, bill) => sum + bill.amount, 0),
    paidAmount: bills.filter(bill => bill.is_paid).reduce((sum, bill) => sum + bill.amount, 0),
    unpaidAmount: bills.filter(bill => !bill.is_paid).reduce((sum, bill) => sum + bill.amount, 0)
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Bills</p>
              <p className="text-2xl font-bold text-gray-900">{summary.total}</p>
            </div>
            <DollarSign className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Paid</p>
              <p className="text-2xl font-bold text-green-600">{summary.paid}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {formatCurrency(summary.paidAmount)}
          </p>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Unpaid</p>
              <p className="text-2xl font-bold text-blue-600">{summary.unpaid}</p>
            </div>
            <Clock className="h-8 w-8 text-blue-500" />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {formatCurrency(summary.unpaidAmount - bills.filter(bill => bill.is_overdue).reduce((sum, bill) => sum + bill.amount, 0))}
          </p>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Overdue</p>
              <p className="text-2xl font-bold text-red-600">{summary.overdue}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {formatCurrency(bills.filter(bill => bill.is_overdue).reduce((sum, bill) => sum + bill.amount, 0))}
          </p>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2">
        {['all', 'paid', 'unpaid', 'overdue'].map((filterType) => (
          <button
            key={filterType}
            onClick={() => setFilter(filterType as any)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              filter === filterType
                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                : 'text-gray-600 hover:text-gray-900 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
            {filterType === 'all' && ` (${summary.total})`}
            {filterType === 'paid' && ` (${summary.paid})`}
            {filterType === 'unpaid' && ` (${summary.unpaid})`}
            {filterType === 'overdue' && ` (${summary.overdue})`}
          </button>
        ))}
      </div>

      {/* Bills List */}
      {filteredBills.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">
            {filter === 'all'
              ? "No bills found. Add your first bill to get started!"
              : `No ${filter} bills found.`
            }
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              {filter === 'all' ? 'All Bills' : `${filter.charAt(0).toUpperCase() + filter.slice(1)} Bills`}
              ({filteredBills.length})
            </h3>
          </div>

          <div className="divide-y divide-gray-200">
            {filteredBills.map((bill) => {
              const dueDateInfo = getDueDateDisplay(bill)

              return (
                <div key={bill.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      {/* Payment Status Checkbox */}
                      <div className="flex items-center">
                        {getPaymentStatusIcon(bill)}
                      </div>

                      {/* Bill Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className={`font-medium ${bill.is_paid ? 'text-green-700' : bill.is_overdue ? 'text-red-700' : 'text-gray-900'}`}>
                            {bill.name}
                          </p>
                          {bill.is_overdue && !bill.is_paid && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Overdue
                            </span>
                          )}
                          {bill.is_paid && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Paid
                            </span>
                          )}
                        </div>

                        <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                          <span className={dueDateInfo.color}>
                            {dueDateInfo.text}
                          </span>
                          <span>•</span>
                          <span>{getBillingCycleLabel(bill.billing_cycle)}</span>
                          {bill.category && (
                            <>
                              <span>•</span>
                              <span>{bill.category}</span>
                            </>
                          )}
                        </div>

                        {bill.payment_date && (
                          <p className="text-xs text-green-600 mt-1">
                            Paid on {new Date(bill.payment_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>

                      {/* Amount */}
                      <div className="text-right">
                        <p className={`text-lg font-semibold ${bill.is_paid ? 'text-green-600' : 'text-gray-900'}`}>
                          {formatCurrency(bill.amount)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}