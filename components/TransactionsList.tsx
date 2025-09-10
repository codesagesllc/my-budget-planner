'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/supabase'
import { 
  Search, Filter, Download, Calendar, DollarSign, 
  Tag, ChevronDown, ChevronUp, Plus, Check,
  X, AlertCircle, Receipt, RefreshCw, CheckSquare,
  Square, CreditCard, ArrowUpRight, ArrowDownRight,
  FileText, Clock
} from 'lucide-react'

type Transaction = Database['public']['Tables']['transactions']['Row']
type BillInsert = Database['public']['Tables']['bills']['Insert']

interface TransactionsListProps {
  transactions: Transaction[]
  userId?: string
  onUpdate?: () => void
}

interface ConversionModal {
  isOpen: boolean
  type: 'expense' | 'bill' | null
  transaction: Transaction | null
}

export default function TransactionsList({ transactions: initialTransactions, userId, onUpdate }: TransactionsListProps) {
  const [transactions, setTransactions] = useState(initialTransactions)
  const [filteredTransactions, setFilteredTransactions] = useState(initialTransactions)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedType, setSelectedType] = useState<'all' | 'income' | 'expense' | 'transfer'>('all')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'description'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set())
  const [conversionModal, setConversionModal] = useState<ConversionModal>({
    isOpen: false,
    type: null,
    transaction: null
  })
  const [bulkActionMode, setBulkActionMode] = useState(false)
  const supabase = createClient()

  // Categories for transactions
  const categories = [
    'all',
    'Food & Dining',
    'Transportation',
    'Shopping',
    'Entertainment',
    'Bills & Utilities',
    'Healthcare',
    'Education',
    'Travel',
    'Personal',
    'Business',
    'Other'
  ]

  useEffect(() => {
    setTransactions(initialTransactions)
    setFilteredTransactions(initialTransactions)
  }, [initialTransactions])

  useEffect(() => {
    filterTransactions()
  }, [searchTerm, selectedCategory, selectedType, dateRange, sortBy, sortOrder, transactions])

  const filterTransactions = () => {
    let filtered = [...transactions]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(t => 
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.category?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(t => t.category === selectedCategory)
    }

    // Type filter
    if (selectedType !== 'all') {
      filtered = filtered.filter(t => t.transaction_type === selectedType)
    }

    // Date range filter
    if (dateRange.start) {
      filtered = filtered.filter(t => new Date(t.date) >= new Date(dateRange.start))
    }
    if (dateRange.end) {
      filtered = filtered.filter(t => new Date(t.date) <= new Date(dateRange.end))
    }

    // Sorting
    filtered.sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime()
          break
        case 'amount':
          comparison = a.amount - b.amount
          break
        case 'description':
          comparison = a.description.localeCompare(b.description)
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

    setFilteredTransactions(filtered)
  }

  const handleSelectTransaction = (transactionId: string) => {
    const newSelected = new Set(selectedTransactions)
    if (newSelected.has(transactionId)) {
      newSelected.delete(transactionId)
    } else {
      newSelected.add(transactionId)
    }
    setSelectedTransactions(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedTransactions.size === filteredTransactions.length) {
      setSelectedTransactions(new Set())
    } else {
      setSelectedTransactions(new Set(filteredTransactions.map(t => t.id)))
    }
  }

  const handleConvertToExpense = async (transaction: Transaction) => {
    try {
      // Update transaction type to expense if it isn't already
      if (transaction.transaction_type !== 'expense') {
        await supabase
          .from('transactions')
          .update({ 
            transaction_type: 'expense',
            category: transaction.category || 'Other'
          })
          .eq('id', transaction.id)
      }

      // Close modal and refresh
      setConversionModal({ isOpen: false, type: null, transaction: null })
      onUpdate?.()
    } catch (error) {
      console.error('Error converting to expense:', error)
    }
  }

  const handleConvertToBill = async (formData: FormData) => {
    if (!conversionModal.transaction || !userId) return

    const billData: BillInsert = {
      user_id: userId,
      name: formData.get('name') as string,
      amount: Math.abs(conversionModal.transaction.amount),
      due_date: formData.get('due_date') as string,
      billing_cycle: formData.get('billing_cycle') as any,
      category: formData.get('category') as string,
      is_active: true
    }

    try {
      // Create the bill
      const { error: billError } = await supabase
        .from('bills')
        .insert([billData])

      if (!billError) {
        // Update transaction to mark it as converted
        await supabase
          .from('transactions')
          .update({ 
            transaction_type: 'expense',
            category: billData.category
          })
          .eq('id', conversionModal.transaction.id)

        setConversionModal({ isOpen: false, type: null, transaction: null })
        onUpdate?.()
      }
    } catch (error) {
      console.error('Error converting to bill:', error)
    }
  }

  const handleBulkConvert = async (type: 'expense' | 'bill') => {
    if (selectedTransactions.size === 0) return

    if (type === 'expense') {
      // Bulk convert to expenses
      const ids = Array.from(selectedTransactions)
      await supabase
        .from('transactions')
        .update({ transaction_type: 'expense' })
        .in('id', ids)
      
      setSelectedTransactions(new Set())
      setBulkActionMode(false)
      onUpdate?.()
    } else {
      // For bills, we need more info, so open modal for first transaction
      const firstTransactionId = Array.from(selectedTransactions)[0]
      const transaction = transactions.find(t => t.id === firstTransactionId)
      if (transaction) {
        setConversionModal({ isOpen: true, type: 'bill', transaction })
      }
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'income':
        return <ArrowUpRight className="w-4 h-4 text-green-600" />
      case 'expense':
        return <ArrowDownRight className="w-4 h-4 text-red-600" />
      case 'transfer':
        return <RefreshCw className="w-4 h-4 text-blue-600" />
      default:
        return <DollarSign className="w-4 h-4 text-gray-600" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Transactions</h3>
        <p className="text-sm text-gray-600 mt-1">
          Manage and categorize your transactions. Convert them to expenses or recurring bills.
        </p>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
              <option value="transfer">Transfer</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setBulkActionMode(!bulkActionMode)}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              bulkActionMode 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            {bulkActionMode ? 'Cancel Selection' : 'Bulk Actions'}
          </button>

          {bulkActionMode && selectedTransactions.size > 0 && (
            <>
              <button
                onClick={() => handleBulkConvert('expense')}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
              >
                <Receipt className="w-4 h-4" />
                Convert to Expense ({selectedTransactions.size})
              </button>
              <button
                onClick={() => handleBulkConvert('bill')}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Convert to Bill ({selectedTransactions.size})
              </button>
            </>
          )}
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {bulkActionMode && (
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedTransactions.size === filteredTransactions.length && filteredTransactions.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                )}
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={bulkActionMode ? 7 : 6} className="px-4 py-8 text-center text-gray-500">
                    No transactions found
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    {bulkActionMode && (
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedTransactions.has(transaction.id)}
                          onChange={() => handleSelectTransaction(transaction.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                    )}
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {formatDate(transaction.date)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {getTransactionIcon(transaction.transaction_type || 'expense')}
                        <div>
                          <p className="text-sm font-medium text-gray-900">{transaction.description}</p>
                          {transaction.pending && (
                            <span className="text-xs text-amber-600 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Pending
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">
                        {transaction.category || 'Uncategorized'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        transaction.transaction_type === 'income'
                          ? 'bg-green-100 text-green-700'
                          : transaction.transaction_type === 'expense'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {transaction.transaction_type || 'expense'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-sm font-semibold ${
                        transaction.transaction_type === 'income'
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}>
                        {transaction.transaction_type === 'income' ? '+' : '-'}
                        {formatCurrency(Math.abs(transaction.amount))}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setConversionModal({ 
                            isOpen: true, 
                            type: 'expense', 
                            transaction 
                          })}
                          className="p-1 hover:bg-orange-50 rounded text-orange-600"
                          title="Mark as One-time Expense"
                        >
                          <Receipt className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setConversionModal({ 
                            isOpen: true, 
                            type: 'bill', 
                            transaction 
                          })}
                          className="p-1 hover:bg-purple-50 rounded text-purple-600"
                          title="Convert to Recurring Bill"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Conversion Modal */}
      {conversionModal.isOpen && conversionModal.transaction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">
                  {conversionModal.type === 'expense' 
                    ? 'Convert to One-time Expense' 
                    : 'Convert to Recurring Bill'}
                </h2>
                <button
                  onClick={() => setConversionModal({ isOpen: false, type: null, transaction: null })}
                  className="p-1 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Transaction Details */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-600 mb-1">Transaction</p>
                <p className="font-semibold text-gray-900">{conversionModal.transaction.description}</p>
                <p className="text-sm text-gray-600 mt-1">
                  {formatDate(conversionModal.transaction.date)} • {formatCurrency(Math.abs(conversionModal.transaction.amount))}
                </p>
              </div>

              {conversionModal.type === 'expense' ? (
                // One-time Expense Confirmation
                <div className="space-y-4">
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <div className="flex gap-3">
                      <Receipt className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-orange-900">One-time Expense</p>
                        <p className="text-sm text-orange-700 mt-1">
                          This will categorize the transaction as a one-time expense for {formatDate(conversionModal.transaction.date)}.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setConversionModal({ isOpen: false, type: null, transaction: null })}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleConvertToExpense(conversionModal.transaction!)}
                      className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                    >
                      Convert to Expense
                    </button>
                  </div>
                </div>
              ) : (
                // Recurring Bill Form
                <form onSubmit={(e) => {
                  e.preventDefault()
                  handleConvertToBill(new FormData(e.currentTarget))
                }} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bill Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      defaultValue={conversionModal.transaction.description}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Billing Cycle
                    </label>
                    <select
                      name="billing_cycle"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="biweekly">Bi-weekly</option>
                      <option value="weekly">Weekly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="annual">Annual</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Due Date
                    </label>
                    <input
                      type="date"
                      name="due_date"
                      defaultValue={conversionModal.transaction.date}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <select
                      name="category"
                      defaultValue={conversionModal.transaction.category || 'Other'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      {categories.filter(c => c !== 'all').map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex gap-3">
                      <RefreshCw className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-purple-900">Recurring Bill</p>
                        <p className="text-sm text-purple-700 mt-1">
                          This will create a recurring bill that will be tracked monthly.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setConversionModal({ isOpen: false, type: null, transaction: null })}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    >
                      Create Recurring Bill
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}