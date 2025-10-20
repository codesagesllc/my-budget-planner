'use client'

import { useState } from 'react'
import { formatCurrency } from '@/lib/utils/helpers'
import { Calendar, DollarSign, Clock, CheckCircle, Trash2, Edit, X, Check, Loader2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import ManualBillEntry from './ManualBillEntry'

interface BillsListProps {
  bills: any[]
}

export default function BillsList({ bills: initialBills }: BillsListProps) {
  const [bills, setBills] = useState(initialBills)
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'overdue' | 'paid'>('all')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [editingBill, setEditingBill] = useState<any | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [paymentLoading, setPaymentLoading] = useState<string | null>(null)

  const getFilteredBills = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    switch (filter) {
      case 'upcoming':
        return bills.filter(bill => {
          // Skip one-time and annual bills for upcoming filter
          if (bill.billing_cycle === 'one-time' || bill.billing_cycle === 'annual') {
            return false
          }
          
          const storedDate = new Date(bill.due_date)
          const dueDay = storedDate.getDate()
          const nextDueDate = new Date(today.getFullYear(), today.getMonth(), dueDay)
          
          return nextDueDate >= today && nextDueDate <= new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
        })
      case 'overdue':
        return bills.filter(bill => {
          // Skip one-time and annual bills for overdue filter
          if (bill.billing_cycle === 'one-time' || bill.billing_cycle === 'annual') {
            return false
          }

          const storedDate = new Date(bill.due_date)
          const dueDay = storedDate.getDate()
          const nextDueDate = new Date(today.getFullYear(), today.getMonth(), dueDay)

          return nextDueDate < today
        })
      case 'paid':
        return bills.filter(bill => bill.is_paid === true)
      default:
        return bills
    }
  }

  const getTabCount = (tab: 'all' | 'upcoming' | 'overdue' | 'paid') => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (tab === 'all') return bills.length
    
    if (tab === 'upcoming') {
      return bills.filter(bill => {
        if (bill.billing_cycle === 'one-time' || bill.billing_cycle === 'annual') {
          return false
        }
        const storedDate = new Date(bill.due_date)
        const dueDay = storedDate.getDate()
        const nextDueDate = new Date(today.getFullYear(), today.getMonth(), dueDay)
        return nextDueDate >= today && nextDueDate <= new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
      }).length
    }
    
    if (tab === 'overdue') {
      return bills.filter(bill => {
        if (bill.billing_cycle === 'one-time' || bill.billing_cycle === 'annual') {
          return false
        }
        const storedDate = new Date(bill.due_date)
        const dueDay = storedDate.getDate()
        const nextDueDate = new Date(today.getFullYear(), today.getMonth(), dueDay)
        return nextDueDate < today
      }).length
    }

    if (tab === 'paid') {
      return bills.filter(bill => bill.is_paid === true).length
    }

    return 0
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

  const getDueDateStatus = (bill: any) => {
    // For one-time bills, show "One-time" with the actual date
    if (bill.billing_cycle === 'one-time') {
      const dueDate = new Date(bill.due_date)
      const monthName = dueDate.toLocaleDateString('en-US', { month: 'short' })
      const day = dueDate.getDate()
      return { 
        text: `One-time (${monthName} ${day})`, 
        color: 'text-purple-600 bg-purple-50',
        showCalendar: false
      }
    }
    
    // For annual bills, show "Annual" with the month
    if (bill.billing_cycle === 'annual') {
      const dueDate = new Date(bill.due_date)
      const monthName = dueDate.toLocaleDateString('en-US', { month: 'long' })
      return { 
        text: `Annual (${monthName})`, 
        color: 'text-indigo-600 bg-indigo-50',
        showCalendar: false
      }
    }
    
    // For recurring bills, calculate the next due date based on current month
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // Extract the day from the stored due_date
    const storedDate = new Date(bill.due_date)
    const dueDay = storedDate.getDate()
    
    // Calculate the due date for the current month
    let nextDueDate = new Date(today.getFullYear(), today.getMonth(), dueDay)
    
    // If the due date has already passed this month, show it as overdue
    if (nextDueDate < today) {
      const diffTime = today.getTime() - nextDueDate.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      return { 
        text: `${diffDays}d overdue`, 
        color: 'text-red-600 bg-red-50',
        showCalendar: true
      }
    }
    
    const diffTime = nextDueDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) {
      return { text: 'Due today', color: 'text-amber-600 bg-amber-50', showCalendar: true }
    } else if (diffDays <= 3) {
      return { text: `${diffDays}d left`, color: 'text-amber-600 bg-amber-50', showCalendar: true }
    } else if (diffDays <= 7) {
      return { text: `${diffDays}d left`, color: 'text-blue-600 bg-blue-50', showCalendar: true }
    } else {
      return { text: `${diffDays}d left`, color: 'text-black bg-gray-100', showCalendar: true }
    }
  }

  const handleDelete = async (billId: string, userId: string) => {
    if (!confirm('Are you sure you want to delete this bill?')) return
    
    setDeleting(billId)
    try {
      const response = await fetch(`/api/bills/${billId}?userId=${userId}`, {
        method: 'DELETE',
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

  const handleEdit = (bill: any) => {
    setEditingBill(bill)
    setShowEditModal(true)
  }

  const handleEditSuccess = async () => {
    // Close modal first
    setShowEditModal(false)
    setEditingBill(null)
    
    // Refresh the bills list by fetching updated data
    try {
      // For now, we'll reload the page as we don't have direct access to supabase here
      // In a production app, you'd pass a refresh function from the parent component
      window.location.reload()
    } catch (error) {
      console.error('Error refreshing bills:', error)
    }
  }

  const handleEditCancel = () => {
    setEditingBill(null)
    setShowEditModal(false)
  }

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

    } catch (error) {
      console.error('Payment toggle error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update payment status')
    } finally {
      setPaymentLoading(null)
    }
  }

  const getPaymentStatusIcon = (bill: any) => {
    if (paymentLoading === bill.id) {
      return <Loader2 className="h-4 w-4 animate-spin text-card-foreground" />
    }

    return (
      <div
        className={`h-4 w-4 border-2 rounded cursor-pointer transition-colors ${
          bill.is_paid
            ? 'bg-green-500 border-green-500'
            : bill.is_overdue
            ? 'border-red-300 hover:border-green-400'
            : 'border-input hover:border-green-400'
        }`}
        onClick={() => handlePaymentToggle(bill.id, bill.is_paid || false)}
      >
        {bill.is_paid && <Check className="h-3 w-3 text-white" />}
      </div>
    )
  }

  const filteredBills = getFilteredBills()

  if (bills.length === 0) {
    return (
      <div className="text-center py-8 sm:py-12">
        <Calendar className="h-10 w-10 sm:h-12 sm:w-12 text-black mx-auto mb-4" />
        <h3 className="text-base sm:text-lg font-medium text-black mb-2">No bills added yet</h3>
        <p className="text-sm text-black">Add bills manually or upload a spreadsheet</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex space-x-2 border-b overflow-x-auto">
        {(['all', 'upcoming', 'overdue', 'paid'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-3 sm:px-4 py-2 font-medium text-xs sm:text-sm capitalize border-b-2 transition-colors whitespace-nowrap ${
              filter === tab
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-black hover:text-black'
            }`}
          >
            {tab} ({getTabCount(tab)})
          </button>
        ))}
      </div>

      {/* Mobile: Card View */}
      <div className="sm:hidden space-y-3">
        {filteredBills.map((bill) => {
          const status = getDueDateStatus(bill)
          return (
            <div key={bill.id} className="bg-card rounded-lg border p-4">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center space-x-3 flex-1">
                  {getPaymentStatusIcon(bill)}
                  <h3 className={`font-medium ${bill.is_paid ? 'text-green-700' : bill.is_overdue ? 'text-red-700' : 'text-card-foreground'}`}>
                    {bill.name}
                    {bill.is_paid && <span className="ml-2 text-xs text-green-600">✓ Paid</span>}
                    {bill.is_overdue && !bill.is_paid && <span className="ml-2 text-xs text-red-600">Overdue</span>}
                  </h3>
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleEdit(bill)}
                    className="text-primary hover:text-primary/80 p-1"
                    title="Edit bill"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
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
                <div className="flex justify-between items-center">
                  <span className="text-sm text-card-foreground">Amount</span>
                  <span className="font-semibold text-card-foreground">
                    {formatCurrency(bill.amount)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-card-foreground">Cycle</span>
                  <span className="text-sm">{getBillingCycleLabel(bill.billing_cycle)}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-card-foreground">Status</span>
                  <span className={`px-2 py-1 rounded-full text-xs ${status.color}`}>
                    {status.text}
                  </span>
                </div>

                {/* Display categories */}
                {(bill.categories && Array.isArray(bill.categories) && bill.categories.length > 0) && (
                  <div className="pt-1 flex flex-wrap gap-1">
                    {bill.categories.map((cat: string, idx: number) => (
                      <span key={idx} className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">
                        {cat}
                      </span>
                    ))}
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
          const status = getDueDateStatus(bill)
          return (
            <div key={bill.id} className="bg-card rounded-lg border p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center space-x-3 flex-1">
                  {getPaymentStatusIcon(bill)}
                  <h3 className={`font-medium ${bill.is_paid ? 'text-green-700' : bill.is_overdue ? 'text-red-700' : 'text-card-foreground'}`}>
                    {bill.name}
                  </h3>
                </div>
                <div className="flex items-center space-x-1">
                  {bill.is_paid && <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">Paid</span>}
                  {bill.is_overdue && !bill.is_paid && <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded-full">Overdue</span>}
                  <button
                    onClick={() => handleEdit(bill)}
                    className="text-primary hover:text-primary/80 p-1"
                    title="Edit bill"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
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
                <div className="flex items-center text-sm text-card-foreground">
                  <DollarSign className="h-4 w-4 mr-2" />
                  <span className="font-semibold text-lg text-card-foreground">
                    {formatCurrency(bill.amount)}
                  </span>
                </div>

                <div className="flex items-center text-sm text-card-foreground">
                  <Clock className="h-4 w-4 mr-2" />
                  <span>{getBillingCycleLabel(bill.billing_cycle)}</span>
                </div>

                <div className="flex items-center text-sm">
                  {status.showCalendar && <Calendar className="h-4 w-4 mr-2 text-card-foreground" />}
                  <span className={`px-2 py-1 rounded-full text-xs ${status.color}`}>
                    {status.text}
                  </span>
                </div>

                {/* Display categories */}
                {(bill.categories && Array.isArray(bill.categories) && bill.categories.length > 0) && (
                  <div className="pt-2 flex flex-wrap gap-1">
                    {bill.categories.map((cat: string, idx: number) => (
                      <span key={idx} className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">
                        {cat}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {filteredBills.length === 0 && (
        <div className="text-center py-6 sm:py-8 text-black">
          {filter === 'paid' ? 'No paid bills found' :
           filter === 'all' ? 'No bills found' :
           `No ${filter} bills found`}
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingBill && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slideUp rounded-lg">
            <ManualBillEntry
              userId={editingBill.user_id}
              editMode={true}
              billToEdit={editingBill}
              onSuccess={handleEditSuccess}
              onCancel={handleEditCancel}
            />
          </div>
        </div>
      )}
    </div>
  )
}
