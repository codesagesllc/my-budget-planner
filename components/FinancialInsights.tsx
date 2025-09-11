'use client'

import { useState, useEffect } from 'react'
import { Brain, TrendingUp, PiggyBank, AlertCircle, Loader2, Home, ShoppingCart, Car, Coffee, Heart } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/helpers'

interface FinancialInsightsProps {
  transactions: any[]
  bills: any[]
  userId: string
}

export default function FinancialInsights({ transactions, bills, userId }: FinancialInsightsProps) {
  const [insights, setInsights] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [savingsGoal, setSavingsGoal] = useState({
    amount: '',
    deadline: '',
    description: '',
  })

  const generateInsights = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/insights/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          transactions: transactions.slice(0, 50), // Send recent 50 transactions
          bills,
          goal: savingsGoal.amount ? savingsGoal : undefined,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setInsights(data.insights)
      }
    } catch (error) {
      console.error('Error generating insights:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate basic metrics
  const totalSpending = transactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
  const avgDailySpending = totalSpending / 30
  const monthlyBillsTotal = bills.reduce((sum, bill) => {
    if (bill.billing_cycle === 'monthly') return sum + bill.amount
    if (bill.billing_cycle === 'annual') return sum + (bill.amount / 12)
    if (bill.billing_cycle === 'quarterly') return sum + (bill.amount / 3)
    if (bill.billing_cycle === 'weekly') return sum + (bill.amount * 4.33)
    if (bill.billing_cycle === 'biweekly') return sum + (bill.amount * 2.17)
    return sum
  }, 0)

  // Category breakdown with proper typing
  const categorySpending: Record<string, number> = transactions.reduce((acc, tx) => {
    const category = tx.category || 'Other'
    acc[category] = (acc[category] || 0) + Math.abs(tx.amount)
    return acc
  }, {} as Record<string, number>)

  // Sort categories by spending amount - with explicit typing
  const topCategories = Object.entries(categorySpending)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)

  // Helper function to get category icon
  const getCategoryIcon = (category: string) => {
    const categoryLower = category.toLowerCase()
    if (categoryLower.includes('housing') || categoryLower.includes('rent')) return Home
    if (categoryLower.includes('food') || categoryLower.includes('grocery')) return ShoppingCart
    if (categoryLower.includes('transport') || categoryLower.includes('car')) return Car
    if (categoryLower.includes('entertainment') || categoryLower.includes('coffee')) return Coffee
    if (categoryLower.includes('health') || categoryLower.includes('medical')) return Heart
    return ShoppingCart
  }

  return (
    <div className="space-y-6">
      {/* Header with Generate Button */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-blue-900">AI Financial Insights</h2>
        <button
          onClick={generateInsights}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition-colors flex items-center gap-2"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              Analyzing...
            </>
          ) : (
            <>
              <Brain className="w-4 h-4" />
              Generate Insights
            </>
          )}
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600">Monthly Spending</p>
              <p className="text-xl font-bold text-blue-900">{formatCurrency(totalSpending)}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600">Daily Average</p>
              <p className="text-xl font-bold text-green-900">{formatCurrency(avgDailySpending)}</p>
            </div>
            <PiggyBank className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600">Fixed Bills</p>
              <p className="text-xl font-bold text-purple-900">{formatCurrency(monthlyBillsTotal)}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Top Spending Categories */}
      <div className="bg-white rounded-xl p-6 border border-blue-200">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">Top Spending Categories</h3>
        <div className="space-y-4">
          {topCategories.map(({ category, amount }) => {
            const percentage = (amount / totalSpending) * 100
            const Icon = getCategoryIcon(category)
            return (
              <div key={category} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-blue-900 capitalize">{category}</p>
                    <p className="text-sm text-blue-600">{percentage.toFixed(1)}% of spending</p>
                  </div>
                </div>
                <span className="font-semibold text-blue-900">{formatCurrency(amount)}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Savings Goal */}
      <div className="bg-white rounded-xl p-6 border border-blue-200">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">Set a Savings Goal</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="number"
            placeholder="Amount ($)"
            value={savingsGoal.amount}
            onChange={(e) => setSavingsGoal({ ...savingsGoal, amount: e.target.value })}
            className="px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="date"
            placeholder="Deadline"
            value={savingsGoal.deadline}
            onChange={(e) => setSavingsGoal({ ...savingsGoal, deadline: e.target.value })}
            className="px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="What for?"
            value={savingsGoal.description}
            onChange={(e) => setSavingsGoal({ ...savingsGoal, description: e.target.value })}
            className="px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* AI Insights */}
      <div className="bg-white rounded-xl p-6 border border-blue-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-blue-900 flex items-center">
            <Brain className="h-5 w-5 mr-2 text-blue-600" />
            AI Analysis Results
          </h3>
        </div>

        {insights ? (
          <div className="prose max-w-none">
            <div className="whitespace-pre-wrap text-blue-800">{insights}</div>
          </div>
        ) : (
          <p className="text-blue-600 text-center py-8">
            Click "Generate Insights" to get personalized financial advice based on your spending patterns
          </p>
        )}
      </div>
    </div>
  )
}