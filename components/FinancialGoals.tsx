'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/supabase'
import { 
  Target, Plus, Edit2, Trash2, Calendar, 
  TrendingUp, DollarSign, X, CheckCircle,
  Home, Car, GraduationCap, Plane, PiggyBank, Heart
} from 'lucide-react'

type FinancialGoal = Database['public']['Tables']['financial_goals']['Row']
type GoalInsert = Database['public']['Tables']['financial_goals']['Insert']

interface FinancialGoalsProps {
  userId: string
  monthlyIncome?: number
  monthlySavings?: number
  onClose?: () => void
}

export default function FinancialGoals({ userId, monthlyIncome = 0, monthlySavings = 0, onClose }: FinancialGoalsProps) {
  const [goals, setGoals] = useState<FinancialGoal[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingGoal, setEditingGoal] = useState<FinancialGoal | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase =  createClient()

  const goalCategories = [
    { value: 'emergency', label: 'Emergency Fund', icon: PiggyBank, color: 'red' },
    { value: 'home', label: 'Home Purchase', icon: Home, color: 'blue' },
    { value: 'car', label: 'Car Purchase', icon: Car, color: 'green' },
    { value: 'education', label: 'Education', icon: GraduationCap, color: 'purple' },
    { value: 'travel', label: 'Travel', icon: Plane, color: 'yellow' },
    { value: 'retirement', label: 'Retirement', icon: TrendingUp, color: 'indigo' },
    { value: 'wedding', label: 'Wedding', icon: Heart, color: 'pink' },
    { value: 'other', label: 'Other', icon: Target, color: 'gray' },
  ]

  useEffect(() => {
    fetchGoals()
  }, [userId])

  const fetchGoals = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('financial_goals')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('priority', { ascending: true })

    if (error) {
      console.error('Error fetching goals:', error)
      setGoals([])
    } else {
      setGoals(data || [])
    }
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    const goalData: GoalInsert = {
      user_id: userId,
      name: formData.get('name') as string,
      target_amount: parseFloat(formData.get('target_amount') as string),
      current_amount: parseFloat(formData.get('current_amount') as string) || 0,
      target_date: formData.get('target_date') as string || null,
      category: formData.get('category') as string,
      priority: parseInt(formData.get('priority') as string) || 1,
      is_active: true,
    }

    if (editingGoal) {
      const { error } = await supabase
        .from('financial_goals')
        .update(goalData)
        .eq('id', editingGoal.id)

      if (!error) {
        setEditingGoal(null)
        fetchGoals()
      }
    } else {
      const { error } = await supabase
        .from('financial_goals')
        .insert([goalData])

      if (!error) {
        setShowAddModal(false)
        fetchGoals()
      }
    }
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('financial_goals')
      .update({ is_active: false })
      .eq('id', id)

    if (!error) {
      fetchGoals()
    }
  }

  const updateProgress = async (goalId: string, newAmount: number) => {
    const { error } = await supabase
      .from('financial_goals')
      .update({ current_amount: newAmount })
      .eq('id', goalId)

    if (!error) {
      fetchGoals()
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const calculateMonthsToGoal = (goal: FinancialGoal) => {
    if (monthlySavings <= 0) return Infinity
    const remaining = goal.target_amount - goal.current_amount
    return Math.ceil(remaining / monthlySavings)
  }

  const getProgressPercentage = (goal: FinancialGoal) => {
    return Math.min((goal.current_amount / goal.target_amount) * 100, 100)
  }

  const totalGoalAmount = goals.reduce((sum, goal) => sum + (goal.target_amount - goal.current_amount), 0)
  const totalSaved = goals.reduce((sum, goal) => sum + goal.current_amount, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Financial Goals</h2>
          <p className="text-gray-600 mt-1">Track your progress towards financial milestones</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Total Goals Value</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(totalGoalAmount + totalSaved)}</p>
            </div>
            <Target className="w-8 h-8 text-purple-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Already Saved</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(totalSaved)}</p>
            </div>
            <PiggyBank className="w-8 h-8 text-green-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-500 to-cyan-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Remaining to Save</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(totalGoalAmount)}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-blue-200" />
          </div>
        </div>
      </div>

      {/* Add Goal Button */}
      <button
        onClick={() => setShowAddModal(true)}
        className="w-full sm:w-auto bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="w-5 h-5" />
        Add Financial Goal
      </button>

      {/* Goals List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading goals...</div>
        ) : goals.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <Target className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No financial goals set yet</p>
            <p className="text-gray-500 text-sm mt-1">Click the button above to add your first goal</p>
          </div>
        ) : (
          goals.map((goal) => {
            const category = goalCategories.find(c => c.value === goal.category)
            const Icon = category?.icon || Target
            const progress = getProgressPercentage(goal)
            const monthsToGoal = calculateMonthsToGoal(goal)
            
            return (
              <div key={goal.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`bg-${category?.color || 'gray'}-100 rounded-full p-2`}>
                      <Icon className={`w-6 h-6 text-${category?.color || 'gray'}-600`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-lg">{goal.name}</h3>
                      <p className="text-sm text-gray-500 capitalize">{goal.category}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setEditingGoal(goal)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <Edit2 className="w-4 h-4 text-gray-500" />
                    </button>
                    <button
                      onClick={() => handleDelete(goal.id)}
                      className="p-1 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Progress</span>
                    <span className="font-semibold">{formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full transition-all duration-500 ${
                        progress >= 100 ? 'bg-green-600' : 'bg-purple-600'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>{progress.toFixed(1)}% complete</span>
                    {progress >= 100 ? (
                      <span className="text-green-600 font-semibold flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Goal Achieved!
                      </span>
                    ) : monthsToGoal !== Infinity ? (
                      <span>~{monthsToGoal} months to go</span>
                    ) : (
                      <span>Set monthly savings to see timeline</span>
                    )}
                  </div>
                </div>

                {/* Goal Details */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {goal.target_date && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>Target: {new Date(goal.target_date).toLocaleDateString()}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-gray-600">
                    <DollarSign className="w-4 h-4" />
                    <span>Remaining: {formatCurrency(goal.target_amount - goal.current_amount)}</span>
                  </div>
                </div>

                {/* Quick Update Buttons */}
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => updateProgress(goal.id, goal.current_amount + 100)}
                    className="flex-1 px-3 py-1 bg-green-50 text-green-700 rounded hover:bg-green-100 text-sm"
                  >
                    +$100
                  </button>
                  <button
                    onClick={() => updateProgress(goal.id, goal.current_amount + 500)}
                    className="flex-1 px-3 py-1 bg-green-50 text-green-700 rounded hover:bg-green-100 text-sm"
                  >
                    +$500
                  </button>
                  <button
                    onClick={() => updateProgress(goal.id, goal.current_amount + 1000)}
                    className="flex-1 px-3 py-1 bg-green-50 text-green-700 rounded hover:bg-green-100 text-sm"
                  >
                    +$1000
                  </button>
                  <button
                    onClick={() => {
                      const amount = prompt('Enter amount to add:')
                      if (amount && !isNaN(parseFloat(amount))) {
                        updateProgress(goal.id, goal.current_amount + parseFloat(amount))
                      }
                    }}
                    className="flex-1 px-3 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 text-sm"
                  >
                    Custom
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || editingGoal) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">
                  {editingGoal ? 'Edit Financial Goal' : 'Add Financial Goal'}
                </h2>
                <button
                  onClick={() => {
                    setShowAddModal(false)
                    setEditingGoal(null)
                  }}
                  className="p-1 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Goal Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    defaultValue={editingGoal?.name}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="e.g., Emergency Fund, Dream Vacation"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target Amount
                  </label>
                  <input
                    type="number"
                    name="target_amount"
                    defaultValue={editingGoal?.target_amount}
                    required
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Amount Saved
                  </label>
                  <input
                    type="number"
                    name="current_amount"
                    defaultValue={editingGoal?.current_amount || 0}
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    name="category"
                    defaultValue={editingGoal?.category || 'other'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {goalCategories.map(cat => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target Date (Optional)
                  </label>
                  <input
                    type="date"
                    name="target_date"
                    defaultValue={editingGoal?.target_date || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority (1-10)
                  </label>
                  <input
                    type="number"
                    name="priority"
                    defaultValue={editingGoal?.priority || 1}
                    min="1"
                    max="10"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="1 (highest priority)"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false)
                      setEditingGoal(null)
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    {editingGoal ? 'Update' : 'Add'} Goal
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