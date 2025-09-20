'use client'

import { useState } from 'react'
import { Plus, X, Save, Calendar, DollarSign, Tag, RefreshCw, Check } from 'lucide-react'
import { PLAID_BILL_CATEGORIES, BILL_CATEGORY_GROUPS, getBillCategoryLabel } from '@/lib/constants/bill-categories'

interface ManualBillEntryProps {
  userId: string
  onSuccess?: () => void
  onCancel?: () => void
  editMode?: boolean
  billToEdit?: any // Bill data when editing
}

export default function ManualBillEntry({ userId, onSuccess, onCancel, editMode = false, billToEdit }: ManualBillEntryProps) {
  // Initialize form with edit data if provided
  const getInitialState = () => {
    if (editMode && billToEdit) {
      // Extract day from due_date
      const dueDate = billToEdit.due_date ? new Date(billToEdit.due_date).getDate().toString() : ''
      
      // Handle categories - could be array or need to fallback to category field
      let categories: string[] = []
      if (billToEdit.categories && Array.isArray(billToEdit.categories)) {
        categories = billToEdit.categories
      } else if (billToEdit.category) {
        categories = [billToEdit.category]
      }
      
      return {
        name: billToEdit.name || '',
        amount: billToEdit.amount?.toString() || '',
        dueDate,
        billingCycle: billToEdit.billing_cycle || 'monthly',
        categories,
        is_paid: billToEdit.is_paid || false,
      }
    }
    
    return {
      name: '',
      amount: '',
      dueDate: '',
      billingCycle: 'monthly' as 'monthly' | 'quarterly' | 'annual' | 'weekly' | 'biweekly' | 'one-time',
      categories: [] as string[],
      is_paid: false,
    }
  }
  
  const [bill, setBill] = useState(getInitialState())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  const [customCategory, setCustomCategory] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)

  // Use Plaid-compatible categories for better transaction matching
  const availableCategories = PLAID_BILL_CATEGORIES.map(cat => cat.value)

  const toggleCategory = (category: string) => {
    setBill(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }))
  }

  const addCustomCategory = () => {
    if (customCategory.trim() && !bill.categories.includes(customCategory.trim())) {
      setBill(prev => ({
        ...prev,
        categories: [...prev.categories, customCategory.trim()]
      }))
      setCustomCategory('')
      setShowCustomInput(false)
    }
  }

  const handleCustomCategoryKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addCustomCategory()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!bill.name || !bill.amount) {
      setError('Name and amount are required')
      return
    }

    if (bill.categories.length === 0) {
      setError('Please select at least one category')
      return
    }

    setLoading(true)

    try {
      const endpoint = editMode ? `/api/bills/${billToEdit.id}` : '/api/bills/manual'
      const method = editMode ? 'PUT' : 'POST'
      
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          bill: {
            ...bill,
            amount: parseFloat(bill.amount),
            category: bill.categories[0] || 'other', // Single category for backward compatibility
            categories: bill.categories, // Array for enhanced functionality
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
        categories: [],
        is_paid: false,
      })

      onSuccess?.()
    } catch (err) {
      console.error('Error adding bill:', err)
      setError(err instanceof Error ? err.message : 'Failed to add bill')
    } finally {
      setLoading(false)
    }
  }

  // Get suggested categories based on bill name using Plaid categories
  const getSuggestedCategories = (name: string) => {
    const nameLower = name.toLowerCase()
    const suggestions: string[] = []

    // Streaming services
    if (nameLower.includes('netflix') || nameLower.includes('spotify') || nameLower.includes('youtube') || nameLower.includes('disney')) {
      suggestions.push('streaming', 'subscription')
    }

    // Software/Tech
    if (nameLower.includes('adobe') || nameLower.includes('microsoft') || nameLower.includes('github') || nameLower.includes('ai') || nameLower.includes('claude') || nameLower.includes('gemini')) {
      suggestions.push('software', 'subscription')
    }

    // Utilities
    if (nameLower.includes('electric')) suggestions.push('electric')
    if (nameLower.includes('gas')) suggestions.push('gas')
    if (nameLower.includes('water')) suggestions.push('water')
    if (nameLower.includes('internet') || nameLower.includes('wifi')) suggestions.push('internet')
    if (nameLower.includes('phone') || nameLower.includes('verizon') || nameLower.includes('att') || nameLower.includes('tmobile')) suggestions.push('phone')
    if (nameLower.includes('cable') || nameLower.includes('tv')) suggestions.push('cable')

    // Housing
    if (nameLower.includes('rent')) suggestions.push('rent')
    if (nameLower.includes('mortgage')) suggestions.push('mortgage')
    if (nameLower.includes('hoa')) suggestions.push('hoa')

    // Insurance
    if (nameLower.includes('insurance')) {
      if (nameLower.includes('auto') || nameLower.includes('car')) suggestions.push('auto_insurance')
      else if (nameLower.includes('health')) suggestions.push('health_insurance')
      else if (nameLower.includes('home')) suggestions.push('home_insurance')
      else if (nameLower.includes('life')) suggestions.push('life_insurance')
      else suggestions.push('health_insurance') // default
    }

    // Fitness/Health
    if (nameLower.includes('gym') || nameLower.includes('fitness') || nameLower.includes('planet')) {
      suggestions.push('gym')
    }

    // Transportation
    if (nameLower.includes('loan') && (nameLower.includes('auto') || nameLower.includes('car'))) {
      suggestions.push('auto_loan')
    }

    // Credit cards
    if (nameLower.includes('credit') || nameLower.includes('visa') || nameLower.includes('mastercard') || nameLower.includes('amex')) {
      suggestions.push('credit_card')
    }

    return [...new Set(suggestions)] // Remove duplicates
  }

  // Auto-suggest categories when name changes
  const handleNameChange = (name: string) => {
    setBill(prev => ({ ...prev, name }))
    
    // Auto-suggest categories if none selected yet
    if (bill.categories.length === 0 && name.length > 2) {
      const suggestions = getSuggestedCategories(name)
      if (suggestions.length > 0) {
        setBill(prev => ({ ...prev, categories: suggestions }))
      }
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-blue-900">{editMode ? 'Edit Bill' : 'Add Bill Manually'}</h3>
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
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g., Netflix, Gemini AI, Planet Fitness"
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
              type="text"
              inputMode="decimal"
              pattern="[0-9]+(\.[0-9]{0,2})?"
              value={bill.amount}
              onChange={(e) => {
                const value = e.target.value
                // Allow empty string, numbers, and one decimal point
                if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
                  setBill({ ...bill, amount: value })
                }
              }}
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

        {/* Categories - Multi-select */}
        <div>
          <label className="block text-sm font-medium text-blue-900 mb-1">
            Categories * (Select all that apply)
          </label>
          
          {/* Selected Categories */}
          {bill.categories.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {bill.categories.map((cat) => (
                <span
                  key={cat}
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {getBillCategoryLabel(cat)}
                  <button
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className="ml-1 hover:text-blue-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Category Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
              className="w-full px-3 py-2 border border-blue-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-left flex items-center justify-between"
            >
              <span className="text-blue-700">
                {bill.categories.length === 0 
                  ? 'Select categories...' 
                  : `${bill.categories.length} selected`}
              </span>
              <Tag className="h-4 w-4 text-blue-400" />
            </button>

            {/* Dropdown Menu - Grouped by Category Type */}
            {showCategoryDropdown && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-blue-300 rounded-md shadow-lg max-h-60 overflow-auto">
                {/* Custom Category Input */}
                <div className="p-3 border-b bg-gray-50">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Enter custom category..."
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      onKeyPress={handleCustomCategoryKeyPress}
                      className="flex-1 px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={addCustomCategory}
                      disabled={!customCategory.trim()}
                      className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
                    >
                      Add
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Press Enter or click Add to create a custom category</p>
                </div>

                {/* Predefined Categories */}
                {Object.entries(BILL_CATEGORY_GROUPS).map(([groupName, groupCategories]) => (
                  <div key={groupName}>
                    <div className="px-3 py-1 bg-gray-100 text-xs font-medium text-gray-600 sticky top-0">
                      {groupName}
                    </div>
                    {groupCategories.map((category) => (
                      <button
                        key={category}
                        type="button"
                        onClick={() => toggleCategory(category)}
                        className={`w-full px-3 py-2 text-left hover:bg-blue-50 flex items-center justify-between ${
                          bill.categories.includes(category) ? 'bg-blue-50' : ''
                        }`}
                      >
                        <span className="text-sm text-gray-800">{getBillCategoryLabel(category)}</span>
                        {bill.categories.includes(category) && (
                          <Check className="h-4 w-4 text-blue-600" />
                        )}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>


          {/* Quick Select Common Categories */}
          <div className="mt-2">
            <p className="text-xs text-blue-600 mb-1">Quick select:</p>
            <div className="flex flex-wrap gap-1">
              {['subscription', 'streaming', 'electric', 'internet', 'rent'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className={`px-2 py-1 text-xs rounded-full transition-colors ${
                    bill.categories.includes(cat)
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  }`}
                >
                  {getBillCategoryLabel(cat)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Payment Status - Only show in edit mode */}
        {editMode && (
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={bill.is_paid}
                onChange={(e) => setBill({ ...bill, is_paid: e.target.checked })}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
              />
              <span className="text-sm font-medium text-blue-900">
                Mark as paid
              </span>
            </label>
            <p className="text-xs text-gray-500 mt-1">
              Check this box if this bill has been paid for the current period
            </p>
          </div>
        )}

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
                {editMode ? 'Updating...' : 'Adding...'}
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {editMode ? 'Update Bill' : 'Add Bill'}
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