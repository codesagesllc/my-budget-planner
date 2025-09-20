'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/supabase'
import {
  Search, Filter, Download, Calendar, DollarSign,
  Tag, ChevronDown, ChevronUp, Plus, Check,
  X, AlertCircle, Receipt, RefreshCw, CheckSquare,
  Square, CreditCard, ArrowUpRight, ArrowDownRight,
  FileText, Clock, Link, TrendingUp
} from 'lucide-react'
import { BILL_CATEGORY_GROUPS, getBillCategoryLabel } from '@/lib/constants/bill-categories'
import PlaidSyncButton from '@/components/PlaidSyncButton'

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
  selectedCategories: string[]
  showCategoryDropdown: boolean
  customCategory: string
  showCustomInput: boolean
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
    transaction: null,
    selectedCategories: [],
    showCategoryDropdown: false,
    customCategory: '',
    showCustomInput: false
  })
  const [bulkActionMode, setBulkActionMode] = useState(false)
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [billLinkModal, setBillLinkModal] = useState<{
    isOpen: boolean
    transaction: Transaction | null
    selectedBillId: string
    bills: any[]
  }>({
    isOpen: false,
    transaction: null,
    selectedBillId: '',
    bills: []
  })
  const [incomeLinkModal, setIncomeLinkModal] = useState<{
    isOpen: boolean
    transaction: Transaction | null
    selectedIncomeId: string
    incomeSources: any[]
  }>({
    isOpen: false,
    transaction: null,
    selectedIncomeId: '',
    incomeSources: []
  })
  const [createIncomeModal, setCreateIncomeModal] = useState<{
    isOpen: boolean
    transaction: Transaction | null
  }>({
    isOpen: false,
    transaction: null
  })
  const supabase =  createClient()

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

  // Set up real-time subscriptions
  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel('transactions-list-updates')
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('Transaction change detected in list:', payload)
          setIsUpdating(true)

          // Handle different types of changes
          if (payload.eventType === 'INSERT') {
            const newTransaction = payload.new as Transaction
            setTransactions(prev => [newTransaction, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            const updatedTransaction = payload.new as Transaction
            setTransactions(prev =>
              prev.map(t => t.id === updatedTransaction.id ? updatedTransaction : t)
            )
          } else if (payload.eventType === 'DELETE') {
            const deletedTransaction = payload.old as Transaction
            setTransactions(prev =>
              prev.filter(t => t.id !== deletedTransaction.id)
            )
          }

          // Call parent onUpdate callback
          onUpdate?.()

          // Reset updating state after a short delay
          setTimeout(() => setIsUpdating(false), 500)
        })
      .subscribe((status) => {
        console.log('Transactions list realtime subscription status:', status)
        setIsRealtimeConnected(status === 'SUBSCRIBED')
      })

    // Cleanup subscription on unmount
    return () => {
      console.log('Cleaning up transactions list realtime subscriptions')
      supabase.removeChannel(channel)
    }
  }, [userId, onUpdate, supabase])

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
    // Validate that at least one category is selected
    if (conversionModal.selectedCategories.length === 0) {
      alert('Please select at least one category for this expense.')
      return
    }

    try {
      // Update transaction with selected categories
      const { error } = await supabase
        .from('transactions')
        .update({
          transaction_type: 'expense',
          category: conversionModal.selectedCategories[0], // Primary category
          categories: conversionModal.selectedCategories    // All selected categories
        })
        .eq('id', transaction.id)

      if (error) {
        throw error
      }

      // Close modal - real-time updates will handle the UI refresh
      closeModal()
      // onUpdate will be called by real-time subscription
    } catch (error) {
      console.error('Error converting to expense:', error)
      alert('Failed to convert transaction to expense. Please try again.')
    }
  }

  const handleConvertToBill = async (formData: FormData) => {
    if (!conversionModal.transaction || !userId) return

    const billingCycle = formData.get('billing_cycle') as string

    // Prevent one-time expenses from being created as bills
    if (billingCycle === 'one-time') {
      alert('One-time expenses should use "Convert to Expense" instead of "Convert to Bill". Bills are for recurring payments only.')
      return
    }

    const billData: BillInsert = {
      user_id: userId,
      name: formData.get('name') as string,
      amount: Math.abs(conversionModal.transaction.amount),
      due_date: formData.get('due_date') as string,
      billing_cycle: billingCycle as any,
      category: formData.get('category') as string,
      is_active: true
    }

    try {
      // Create the bill
      const { error: billError } = await supabase
        .from('bills')
        .insert([billData])

      if (billError) {
        throw billError
      }

      // Update transaction to mark it as converted
      const { error: transactionError } = await supabase
        .from('transactions')
        .update({
          transaction_type: 'expense',
          category: billData.category
        })
        .eq('id', conversionModal.transaction.id)

      if (transactionError) {
        throw transactionError
      }

      // Close modal - real-time updates will handle the UI refresh
      closeModal()
      // onUpdate will be called by real-time subscription
    } catch (error) {
      console.error('Error converting to bill:', error)
      alert('Failed to convert transaction to bill. Please try again.')
    }
  }

  const handleBulkConvert = async (type: 'expense' | 'bill') => {
    if (selectedTransactions.size === 0) return

    if (type === 'expense') {
      try {
        // Bulk convert to expenses
        const ids = Array.from(selectedTransactions)
        const { error } = await supabase
          .from('transactions')
          .update({ transaction_type: 'expense' })
          .in('id', ids)

        if (error) {
          throw error
        }

        setSelectedTransactions(new Set())
        setBulkActionMode(false)
        // onUpdate will be called by real-time subscription
      } catch (error) {
        console.error('Error bulk converting to expenses:', error)
        alert('Failed to convert transactions to expenses. Please try again.')
      }
    } else {
      // For bills, we need more info, so open modal for first transaction
      const firstTransactionId = Array.from(selectedTransactions)[0]
      const transaction = transactions.find(t => t.id === firstTransactionId)
      if (transaction) {
        setConversionModal({
          isOpen: true,
          type: 'bill',
          transaction,
          selectedCategories: [],
          showCategoryDropdown: false,
          customCategory: '',
          showCustomInput: false
        })
      }
    }
  }

  // Bill linking functions
  const openBillLinkModal = async (transaction: Transaction) => {
    try {
      // Fetch user's bills for linking
      const { data: bills, error } = await supabase
        .from('bills')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('name')

      if (error) {
        console.error('Error fetching bills:', error)
        alert('Failed to load bills. Please try again.')
        return
      }

      setBillLinkModal({
        isOpen: true,
        transaction,
        selectedBillId: '',
        bills: bills || []
      })
    } catch (error) {
      console.error('Error opening bill link modal:', error)
      alert('Failed to open bill linking. Please try again.')
    }
  }

  const handleLinkToBill = async () => {
    if (!billLinkModal.transaction || !billLinkModal.selectedBillId || !userId) return

    try {
      // First, try to update transaction with enhanced fields
      let updateData: any = {
        updated_at: new Date().toISOString()
      }

      // Try to add enhanced fields if they exist
      try {
        updateData.bill_id = billLinkModal.selectedBillId
        updateData.is_bill_payment = true
        updateData.exclude_from_spending = true
      } catch (enhancedError) {
        console.log('Enhanced fields not available, using basic update')
      }

      const { error: transactionError } = await supabase
        .from('transactions')
        .update(updateData)
        .eq('id', billLinkModal.transaction.id)

      if (transactionError) {
        console.error('Error linking transaction to bill:', transactionError)
        alert(`Failed to link transaction to bill: ${transactionError.message}`)
        return
      }

      // Mark the bill as paid
      const { error: billError } = await supabase
        .from('bills')
        .update({
          is_paid: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', billLinkModal.selectedBillId)

      if (billError) {
        console.error('Error marking bill as paid:', billError)
        // Don't fail the whole operation, but log the error
      }

      // Close modal and refresh data
      setBillLinkModal({
        isOpen: false,
        transaction: null,
        selectedBillId: '',
        bills: []
      })

      // Real-time updates will handle UI refresh
      if (onUpdate) {
        onUpdate()
      }

      console.log('Successfully linked transaction to bill and marked bill as paid')

    } catch (error) {
      console.error('Error in handleLinkToBill:', error)
      alert('Failed to link transaction to bill. Please try again.')
    }
  }

  const openIncomeLinkModal = async (transaction: Transaction) => {
    try {
      // Fetch user's income sources for linking
      const { data: incomeSources, error } = await supabase
        .from('income_sources')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('name')

      if (error) {
        console.error('Error fetching income sources:', error)
        alert('Failed to load income sources. Please try again.')
        return
      }

      setIncomeLinkModal({
        isOpen: true,
        transaction,
        selectedIncomeId: '',
        incomeSources: incomeSources || []
      })
    } catch (error) {
      console.error('Error opening income link modal:', error)
      alert('Failed to open income linking. Please try again.')
    }
  }

  const handleLinkToIncome = async () => {
    if (!incomeLinkModal.transaction || !incomeLinkModal.selectedIncomeId || !userId) return

    try {
      // Update transaction to link to income source (transaction should already be income type)
      let updateData: any = {
        updated_at: new Date().toISOString()
      }

      // Add income source reference if we have enhanced fields
      try {
        updateData.income_source_id = incomeLinkModal.selectedIncomeId
        updateData.exclude_from_spending = true
      } catch (enhancedError) {
        console.log('Enhanced fields not available, using basic update')
      }

      const { error: transactionError } = await supabase
        .from('transactions')
        .update(updateData)
        .eq('id', incomeLinkModal.transaction.id)

      if (transactionError) {
        console.error('Error linking transaction to income:', transactionError)
        alert(`Failed to link transaction to income: ${transactionError.message}`)
        return
      }

      // Close modal and refresh data
      setIncomeLinkModal({
        isOpen: false,
        transaction: null,
        selectedIncomeId: '',
        incomeSources: []
      })

      // Real-time updates will handle UI refresh
      if (onUpdate) {
        onUpdate()
      }

      console.log('Successfully linked transaction to income source')

    } catch (error) {
      console.error('Error in handleLinkToIncome:', error)
      alert('Failed to link transaction to income. Please try again.')
    }
  }

  const openCreateIncomeModal = (transaction: Transaction) => {
    setCreateIncomeModal({
      isOpen: true,
      transaction
    })
  }

  const handleCreateIncomeFromTransaction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!createIncomeModal.transaction || !userId) return

    try {
      const formData = new FormData(e.currentTarget)
      const transaction = createIncomeModal.transaction

      // Create income source based on transaction
      const incomeData = {
        user_id: userId,
        name: formData.get('name') as string,
        amount: Math.abs(transaction.amount), // Use absolute value since income might be negative in transactions
        frequency: formData.get('frequency') as string,
        category: formData.get('category') as string,
        start_date: transaction.date, // Use transaction date as start date
        notes: `Created from transaction: ${transaction.description}`,
        is_active: true
      }

      const { data: newIncome, error: incomeError } = await supabase
        .from('income_sources')
        .insert([incomeData])
        .select()
        .single()

      if (incomeError) {
        console.error('Error creating income source:', incomeError)
        alert(`Failed to create income source: ${incomeError.message}`)
        return
      }

      // Link the transaction to the newly created income source
      let updateData: any = {
        updated_at: new Date().toISOString()
      }

      try {
        updateData.income_source_id = newIncome.id
        updateData.exclude_from_spending = true
      } catch (enhancedError) {
        console.log('Enhanced fields not available, using basic update')
      }

      const { error: transactionError } = await supabase
        .from('transactions')
        .update(updateData)
        .eq('id', transaction.id)

      if (transactionError) {
        console.error('Error linking transaction to new income source:', transactionError)
        // Don't fail the whole operation since income source was created successfully
      }

      // Close modal and refresh data
      setCreateIncomeModal({
        isOpen: false,
        transaction: null
      })

      // Real-time updates will handle UI refresh
      if (onUpdate) {
        onUpdate()
      }

      console.log('Successfully created income source from transaction')

    } catch (error) {
      console.error('Error in handleCreateIncomeFromTransaction:', error)
      alert('Failed to create income source. Please try again.')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const toggleCategory = (category: string) => {
    setConversionModal(prev => ({
      ...prev,
      selectedCategories: prev.selectedCategories.includes(category)
        ? prev.selectedCategories.filter(c => c !== category)
        : [...prev.selectedCategories, category]
    }))
  }

  const addCustomCategory = () => {
    if (conversionModal.customCategory.trim() && !conversionModal.selectedCategories.includes(conversionModal.customCategory.trim())) {
      setConversionModal(prev => ({
        ...prev,
        selectedCategories: [...prev.selectedCategories, prev.customCategory.trim()],
        customCategory: '',
        showCustomInput: false
      }))
    }
  }

  const handleCustomCategoryKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addCustomCategory()
    }
  }

  const closeModal = () => {
    setConversionModal({
      isOpen: false,
      type: null,
      transaction: null,
      selectedCategories: [],
      showCategoryDropdown: false,
      customCategory: '',
      showCustomInput: false
    })
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
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900">Transactions</h3>
            {isRealtimeConnected && (
              <div className={`w-2 h-2 rounded-full ${isUpdating ? 'bg-orange-500 animate-pulse' : 'bg-green-500'}`} title={isUpdating ? 'Updating transactions...' : 'Real-time updates active'} />
            )}
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Manage and categorize your transactions. Convert them to expenses or recurring bills.
          </p>
        </div>
        <div className="flex items-center gap-4">
          {isUpdating && (
            <div className="flex items-center gap-2 text-sm text-orange-600">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Updating...</span>
            </div>
          )}
          {userId && (
            <PlaidSyncButton
              userId={userId}
              onSyncComplete={() => {
                if (onUpdate) onUpdate()
              }}
            />
          )}
        </div>
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
                        {/* Show expense and bill conversion only for non-income transactions */}
                        {transaction.transaction_type !== 'income' && (
                          <>
                            <button
                              onClick={() => setConversionModal({
                                isOpen: true,
                                type: 'expense',
                                transaction,
                                selectedCategories: [],
                                showCategoryDropdown: false,
                                customCategory: '',
                                showCustomInput: false
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
                                transaction,
                                selectedCategories: [],
                                showCategoryDropdown: false,
                                customCategory: '',
                                showCustomInput: false
                              })}
                              className="p-1 hover:bg-purple-50 rounded text-purple-600"
                              title="Convert to Recurring Bill"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {/* Show bill linking only for expense transactions */}
                        {transaction.transaction_type !== 'income' && (
                          <button
                            onClick={() => openBillLinkModal(transaction)}
                            className="p-1 hover:bg-blue-50 rounded text-blue-600"
                            title="Link to Existing Bill"
                          >
                            <Link className="w-4 h-4" />
                          </button>
                        )}

                        {/* Show income actions only for income transactions */}
                        {transaction.transaction_type === 'income' && (
                          <>
                            <button
                              onClick={() => openIncomeLinkModal(transaction)}
                              className="p-1 hover:bg-green-50 rounded text-green-600"
                              title="Link to Income Source"
                            >
                              <TrendingUp className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openCreateIncomeModal(transaction)}
                              className="p-1 hover:bg-emerald-50 rounded text-emerald-600"
                              title="Create Income Source from Transaction"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </>
                        )}
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
                  onClick={closeModal}
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

                  {/* Category Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Categories * (Select all that apply)
                    </label>

                    {/* Selected Categories */}
                    {conversionModal.selectedCategories.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {conversionModal.selectedCategories.map((cat) => (
                          <span
                            key={cat}
                            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800"
                          >
                            {getBillCategoryLabel(cat)}
                            <button
                              type="button"
                              onClick={() => toggleCategory(cat)}
                              className="ml-1 hover:text-orange-600"
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
                        onClick={() => setConversionModal(prev => ({ ...prev, showCategoryDropdown: !prev.showCategoryDropdown }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-left flex items-center justify-between"
                      >
                        <span className="text-gray-700">
                          {conversionModal.selectedCategories.length === 0
                            ? 'Select categories...'
                            : `${conversionModal.selectedCategories.length} selected`}
                        </span>
                        <Tag className="h-4 w-4 text-gray-400" />
                      </button>

                      {/* Dropdown Menu */}
                      {conversionModal.showCategoryDropdown && (
                        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                          {/* Custom Category Input */}
                          <div className="p-3 border-b bg-gray-50">
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                placeholder="Enter custom category..."
                                value={conversionModal.customCategory}
                                onChange={(e) => setConversionModal(prev => ({ ...prev, customCategory: e.target.value }))}
                                onKeyPress={handleCustomCategoryKeyPress}
                                className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-orange-500"
                              />
                              <button
                                type="button"
                                onClick={addCustomCategory}
                                disabled={!conversionModal.customCategory.trim()}
                                className="px-2 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700 disabled:bg-gray-300"
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
                                  className={`w-full px-3 py-2 text-left hover:bg-orange-50 flex items-center justify-between ${
                                    conversionModal.selectedCategories.includes(category) ? 'bg-orange-50' : ''
                                  }`}
                                >
                                  <span className="text-sm text-gray-800">{getBillCategoryLabel(category)}</span>
                                  {conversionModal.selectedCategories.includes(category) && (
                                    <Check className="h-4 w-4 text-orange-600" />
                                  )}
                                </button>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={closeModal}
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
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-blue-800">
                      <strong>Note:</strong> Bills are for recurring payments (monthly, weekly, etc.).
                      For one-time expenses, use "Mark as One-time Expense" instead.
                    </p>
                  </div>

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
                      <option value="one-time">One-time (Use "Convert to Expense" instead)</option>
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
                      onClick={() => setConversionModal({ isOpen: false, type: null, transaction: null, selectedCategories: [], showCategoryDropdown: false, customCategory: '', showCustomInput: false })}
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

      {/* Bill Link Modal */}
      {billLinkModal.isOpen && billLinkModal.transaction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Link to Existing Bill</h2>
                <button
                  onClick={() => setBillLinkModal({ isOpen: false, transaction: null, selectedBillId: '', bills: [] })}
                  className="p-1 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Transaction Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="font-semibold text-gray-900">{billLinkModal.transaction.description}</p>
                <p className="text-sm text-gray-600 mt-1">
                  {formatDate(billLinkModal.transaction.date)} • {formatCurrency(Math.abs(billLinkModal.transaction.amount))}
                </p>
              </div>

              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Link className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="font-medium text-blue-900 mb-1">Link to Bill</h3>
                      <p className="text-sm text-blue-700">
                        This will mark the transaction as a bill payment and exclude it from spending calculations.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Bill to Link
                  </label>
                  <select
                    value={billLinkModal.selectedBillId}
                    onChange={(e) => setBillLinkModal(prev => ({ ...prev, selectedBillId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Choose a bill...</option>
                    {billLinkModal.bills.map(bill => (
                      <option key={bill.id} value={bill.id}>
                        {bill.name} - {formatCurrency(bill.amount)} ({bill.billing_cycle})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setBillLinkModal({ isOpen: false, transaction: null, selectedBillId: '', bills: [] })}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleLinkToBill}
                    disabled={!billLinkModal.selectedBillId}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Link to Bill
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Income Link Modal */}
      {incomeLinkModal.isOpen && incomeLinkModal.transaction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Link to Income Source</h2>
                <button
                  onClick={() => setIncomeLinkModal({ isOpen: false, transaction: null, selectedIncomeId: '', incomeSources: [] })}
                  className="p-1 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Transaction Info */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <p className="font-semibold text-gray-900">{incomeLinkModal.transaction.description}</p>
                <p className="text-sm text-gray-600 mt-1">
                  {formatDate(incomeLinkModal.transaction.date)} • {formatCurrency(Math.abs(incomeLinkModal.transaction.amount))}
                </p>
              </div>

              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <TrendingUp className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="font-medium text-green-900 mb-1">Link to Income</h3>
                      <p className="text-sm text-green-700">
                        This will mark the transaction as income and help track your actual income vs expected.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Income Source to Link
                  </label>
                  <select
                    value={incomeLinkModal.selectedIncomeId}
                    onChange={(e) => setIncomeLinkModal(prev => ({ ...prev, selectedIncomeId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  >
                    <option value="">Choose an income source...</option>
                    {incomeLinkModal.incomeSources.map(income => (
                      <option key={income.id} value={income.id}>
                        {income.name} - {formatCurrency(income.amount)} ({income.frequency})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setIncomeLinkModal({ isOpen: false, transaction: null, selectedIncomeId: '', incomeSources: [] })}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleLinkToIncome}
                    disabled={!incomeLinkModal.selectedIncomeId}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Link to Income
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Income Modal */}
      {createIncomeModal.isOpen && createIncomeModal.transaction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Create Income Source</h2>
                <button
                  onClick={() => setCreateIncomeModal({ isOpen: false, transaction: null })}
                  className="p-1 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Transaction Info */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6">
                <p className="font-semibold text-gray-900">{createIncomeModal.transaction.description}</p>
                <p className="text-sm text-gray-600 mt-1">
                  {formatDate(createIncomeModal.transaction.date)} • {formatCurrency(Math.abs(createIncomeModal.transaction.amount))}
                </p>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6">
                <div className="flex items-start space-x-3">
                  <Plus className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-emerald-900 mb-1">Create New Income Source</h3>
                    <p className="text-sm text-emerald-700">
                      Create a new income source based on this transaction and automatically link them.
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleCreateIncomeFromTransaction} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Income Source Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    defaultValue={createIncomeModal.transaction.description}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="e.g., Monthly Salary, Freelance Project"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Frequency
                  </label>
                  <select
                    name="frequency"
                    defaultValue="monthly"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="biweekly">Bi-weekly</option>
                    <option value="weekly">Weekly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="annual">Annual</option>
                    <option value="one-time">One-time</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    name="category"
                    defaultValue="salary"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="salary">Salary</option>
                    <option value="freelance">Freelance</option>
                    <option value="investment">Investment</option>
                    <option value="rental">Rental</option>
                    <option value="business">Business</option>
                    <option value="pension">Pension</option>
                    <option value="benefits">Benefits</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setCreateIncomeModal({ isOpen: false, transaction: null })}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                  >
                    Create Income Source
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}