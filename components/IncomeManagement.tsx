'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/supabase'
import { 
  DollarSign, Plus, Edit2, Trash2, Calendar, 
  TrendingUp, Briefcase, Gift, Home, Car, X, Brain, Sparkles
} from 'lucide-react'
import AIIncomeDetector from './AIIncomeDetector'

type IncomeSources = Database['public']['Tables']['income_sources']['Row']
type IncomeInsert = Database['public']['Tables']['income_sources']['Insert']

interface IncomeManagementProps {
  userId: string
  onUpdate?: () => void
}

export default function IncomeManagement({ userId, onUpdate }: IncomeManagementProps) {
  const [incomeSources, setIncomeSources] = useState<IncomeSources[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAIDetector, setShowAIDetector] = useState(false)
  const [editingIncome, setEditingIncome] = useState<IncomeSources | null>(null)
  const [loading, setLoading] = useState(true)
  const [totalMonthlyIncome, setTotalMonthlyIncome] = useState(0)
  const supabase =  createClient()

  const incomeCategories = [
    { value: 'salary', label: 'Salary', icon: Briefcase },
    { value: 'freelance', label: 'Freelance', icon: TrendingUp },
    { value: 'investment', label: 'Investment', icon: TrendingUp },
    { value: 'rental', label: 'Rental', icon: Home },
    { value: 'business', label: 'Business', icon: Briefcase },
    { value: 'pension', label: 'Pension', icon: Calendar },
    { value: 'benefits', label: 'Benefits', icon: Gift },
    { value: 'other', label: 'Other', icon: DollarSign },
  ]

  const frequencies = [
    { value: 'monthly', label: 'Monthly', multiplier: 1 },
    { value: 'biweekly', label: 'Bi-weekly', multiplier: 2.16667 },
    { value: 'weekly', label: 'Weekly', multiplier: 4.33333 },
    { value: 'quarterly', label: 'Quarterly', multiplier: 0.33333 },
    { value: 'annual', label: 'Annual', multiplier: 0.08333 },
    { value: 'one-time', label: 'One-time', multiplier: 0 },
  ]

  useEffect(() => {
    fetchIncomeSources()
  }, [userId])

  useEffect(() => {
    calculateTotalMonthlyIncome()
  }, [incomeSources])

  const fetchIncomeSources = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('income_sources')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching income sources:', error)
    } else {
      setIncomeSources(data || [])
    }
    setLoading(false)
  }

  const calculateTotalMonthlyIncome = () => {
    const currentDate = new Date()
    const currentMonth = currentDate.getMonth()
    const currentYear = currentDate.getFullYear()
    const monthStart = new Date(currentYear, currentMonth, 1)
    const monthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999)
    
    const total = incomeSources.reduce((sum, income) => {
      if (!income.is_active) return sum
      
      // Handle one-time income
      if (income.frequency === 'one-time') {
        if (!income.start_date) return sum
        
        const startDate = new Date(income.start_date)
        
        if (income.end_date) {
          const endDate = new Date(income.end_date)
          
          // Check if overlaps with current month
          if (startDate <= monthEnd && endDate >= monthStart) {
            const effectiveStart = startDate > monthStart ? startDate : monthStart
            const effectiveEnd = endDate < monthEnd ? endDate : monthEnd
            const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
            const monthDays = Math.ceil((effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
            const proratedAmount = (income.amount * monthDays) / totalDays
            return sum + proratedAmount
          }
        } else {
          // Check if start date is in current month
          if (startDate >= monthStart && startDate <= monthEnd) {
            return sum + income.amount
          }
        }
        return sum
      }
      
      // Handle recurring income
      const freq = frequencies.find(f => f.value === income.frequency)
      const monthlyAmount = income.amount * (freq?.multiplier || 0)
      return sum + monthlyAmount
    }, 0)
    setTotalMonthlyIncome(total)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    const incomeData: IncomeInsert = {
      user_id: userId,
      name: formData.get('name') as string,
      amount: parseFloat(formData.get('amount') as string),
      frequency: formData.get('frequency') as any,
      category: formData.get('category') as string,
      start_date: formData.get('start_date') as string || null,
      end_date: formData.get('end_date') as string || null,
      notes: formData.get('notes') as string || null,
      is_active: true,
    }

    if (editingIncome) {
      const { error } = await supabase
        .from('income_sources')
        .update(incomeData)
        .eq('id', editingIncome.id)

      if (!error) {
        setEditingIncome(null)
        fetchIncomeSources()
        onUpdate?.()
      }
    } else {
      const { error } = await supabase
        .from('income_sources')
        .insert([incomeData])

      if (!error) {
        setShowAddModal(false)
        fetchIncomeSources()
        onUpdate?.()
      }
    }
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('income_sources')
      .update({ is_active: false })
      .eq('id', id)

    if (!error) {
      fetchIncomeSources()
      onUpdate?.()
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const getMonthlyEquivalent = (amount: number, frequency: string) => {
    const freq = frequencies.find(f => f.value === frequency)
    return amount * (freq?.multiplier || 0)
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-green-100 text-sm font-medium">Total Monthly Income</p>
            <p className="text-3xl font-bold mt-1">{formatCurrency(totalMonthlyIncome)}</p>
            <p className="text-green-100 text-sm mt-2">
              From {incomeSources.filter(i => i.is_active).length} active source(s)
            </p>
          </div>
          <div className="bg-white/20 rounded-full p-4">
            <TrendingUp className="w-8 h-8" />
          </div>
        </div>
      </div>

      {/* Add Income Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => setShowAddModal(true)}
          className="flex-1 sm:flex-none bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Income Source
        </button>
        <button
          onClick={() => setShowAIDetector(true)}
          className="flex-1 sm:flex-none bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
        >
          <Brain className="w-5 h-5" />
          AI Detect Income
        </button>
      </div>

      {/* Income Sources List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading income sources...</div>
        ) : incomeSources.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No income sources added yet</p>
            <p className="text-gray-500 text-sm mt-1">Click the button above to add your first income source</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {incomeSources.map((income) => {
              const CategoryIcon = incomeCategories.find(c => c.value === income.category)?.icon || DollarSign
              const monthlyEquivalent = getMonthlyEquivalent(income.amount, income.frequency)
              
              return (
                <div key={income.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-green-100 rounded-full p-2">
                        <CategoryIcon className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{income.name}</h3>
                        <p className="text-sm text-gray-500 capitalize">{income.category}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setEditingIncome(income)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <Edit2 className="w-4 h-4 text-gray-500" />
                      </button>
                      <button
                        onClick={() => handleDelete(income.id)}
                        className="p-1 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Amount:</span>
                      <span className="font-semibold text-gray-900">{formatCurrency(income.amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Frequency:</span>
                      <span className="text-sm capitalize text-gray-900">{income.frequency}</span>
                    </div>
                    {income.frequency !== 'monthly' && (
                      <div className="flex justify-between pt-2 border-t">
                        <span className="text-sm text-gray-600">Monthly:</span>
                        <span className="font-semibold text-green-600">
                          {formatCurrency(monthlyEquivalent)}
                        </span>
                      </div>
                    )}
                    {income.notes && (
                      <p className="text-xs text-gray-500 pt-2 border-t">{income.notes}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* AI Income Detector Modal */}
      {showAIDetector && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
            <AIIncomeDetector
              userId={userId}
              onIncomeCreated={() => {
                setShowAIDetector(false)
                fetchIncomeSources()
                onUpdate?.()
              }}
              onClose={() => setShowAIDetector(false)}
            />
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {(showAddModal || editingIncome) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">
                  {editingIncome ? 'Edit Income Source' : 'Add Income Source'}
                </h2>
                <button
                  onClick={() => {
                    setShowAddModal(false)
                    setEditingIncome(null)
                  }}
                  className="p-1 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Income Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    defaultValue={editingIncome?.name}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="e.g., Monthly Salary, Freelance Project"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount
                  </label>
                  <input
                    type="number"
                    name="amount"
                    defaultValue={editingIncome?.amount}
                    required
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Frequency
                  </label>
                  <select
                    name="frequency"
                    defaultValue={editingIncome?.frequency || 'monthly'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    {frequencies.map(freq => (
                      <option key={freq.value} value={freq.value}>
                        {freq.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    name="category"
                    defaultValue={editingIncome?.category || 'salary'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    {incomeCategories.map(cat => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date (Optional)
                    </label>
                    <input
                      type="date"
                      name="start_date"
                      defaultValue={editingIncome?.start_date || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date (Optional)
                    </label>
                    <input
                      type="date"
                      name="end_date"
                      defaultValue={editingIncome?.end_date || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    name="notes"
                    defaultValue={editingIncome?.notes || ''}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Additional notes about this income source..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false)
                      setEditingIncome(null)
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    {editingIncome ? 'Update' : 'Add'} Income
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