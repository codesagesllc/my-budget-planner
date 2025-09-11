'use client'

import { useState } from 'react'
import { Plus, X, Save, Calendar, DollarSign, Tag, RefreshCw } from 'lucide-react'

interface ManualBillEntryProps {
  userId: string
  onSuccess?: () => void
  onCancel?: () => void
}

export default function ManualBillEntry({ userId, onSuccess, onCancel }: ManualBillEntryProps) {
  const [bill, setBill] = useState({
    name: '',
    amount: '',
    dueDate: '',
    billingCycle: 'monthly' as 'monthly' | 'quarterly' | 'annual' | 'weekly' | 'biweekly' | 'one-time',
    category: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const categories = [
    'Utilities',
    'Entertainment',
    'Insurance',
    'Housing',
    'Transportation',
    'Health',
    'Shopping',
    'Food',
    'Technology',
    'Education',
    'Other',
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!bill.name || !bill.amount) {
      setError('Name and amount are required')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/bills/manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          bill: {
            ...bill,
            amount: parseFloat(bill.amount),
          },
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to add bill')
      }

      // Reset form
      setBill({
        name: '',
        amount: '',
        dueDate: '',
        billingCycle: 'monthly',
        category: '',
      })

      onSuccess?.()
    } catch (err) {
      console.error('Error adding bill:', err)
      setError(err instanceof Error ? err.message : 'Failed to add bill')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-blue-900">Add Bill Manually</h3>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-blue-500 hover:text-blue-700 p-1"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-md text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Bill Name */}
        <div>
          <label className="block text-sm font-medium text-blue-900 mb-1">
            Bill Name *
          </label>
          <div className="relative">
            <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-400" />
            <input
              type="text"
              value={bill.name}
              onChange={(e) => setBill({ ...bill, name: e.target.value })}
              placeholder="e.g., Netflix, Electricity, Rent"
              className="w-full pl-10 pr-3 py-2 border border-blue-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
        </div>

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-blue-900 mb-1">
            Amount *
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-400" />
            <input
              type="number"
              step="0.01"
              value={bill.amount}
              onChange={(e) => setBill({ ...bill, amount: e.target.value })}
              placeholder="0.00"
              className="w-full pl-10 pr-3 py-2 border border-blue-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
        </div>

        {/* Due Date and Billing Cycle - Mobile Responsive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Due Date */}
          <div>
            <label className="block text-sm font-medium text-blue-900 mb-1">
              Due Date (Day of Month)
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-400" />
              <input
                type="number"
                min="1"
                max="31"
                value={bill.dueDate}
                onChange={(e) => setBill({ ...bill, dueDate: e.target.value })}
                placeholder="1-31"
                className="w-full pl-10 pr-3 py-2 border border-blue-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Billing Cycle */}
          <div>
            <label className="block text-sm font-medium text-blue-900 mb-1">
              Billing Cycle
            </label>
            <div className="relative">
              <RefreshCw className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-blue-400" />
              <select
                value={bill.billingCycle}
                onChange={(e) => setBill({ ...bill, billingCycle: e.target.value as any })}
                className="w-full pl-10 pr-3 py-2 border border-blue-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
              >
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-weekly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annual">Annual</option>
                <option value="one-time">One-Time</option>
              </select>
            </div>
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-blue-900 mb-1">
            Category
          </label>
          <select
            value={bill.category}
            onChange={(e) => setBill({ ...bill, category: e.target.value })}
            className="w-full px-3 py-2 border border-blue-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select a category</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Submit Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 sm:flex-initial px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                Adding...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Add Bill
              </>
            )}
          </button>
          
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 sm:flex-initial px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
