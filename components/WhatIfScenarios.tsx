'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert/Alert'
import { Progress } from '@/components/ui/progress'
import {
  Calculator,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  DollarSign,
  Calendar,
  Plus,
  X,
  Save,
  RefreshCw,
  Target,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface WhatIfScenariosProps {
  userId: string
  className?: string
}

interface NewBillScenario {
  billName: string
  amount: string
  frequency: 'monthly' | 'weekly' | 'biweekly' | 'quarterly' | 'annual'
  category: string
}

interface ScenarioResult {
  affordability_rating: string
  monthly_impact: number
  current_cash_flow: number
  projected_cash_flow: number
  impact_percentage: number
  recommendations: string[]
}

export default function WhatIfScenarios({ userId, className }: WhatIfScenariosProps) {
  const [showNewBillForm, setShowNewBillForm] = useState(false)
  const [scenarios, setScenarios] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [currentCashFlow, setCurrentCashFlow] = useState<number | null>(null)

  const supabase = createClient()

  useEffect(() => {
    if (userId) {
      loadScenarios()
      loadCurrentCashFlow()
    }
  }, [userId])

  const loadScenarios = async () => {
    try {
      const { data, error } = await supabase
        .from('what_if_scenarios')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setScenarios(data || [])
    } catch (error) {
      console.error('Error loading scenarios:', error)
    }
  }

  const loadCurrentCashFlow = async () => {
    try {
      // Calculate current monthly cash flow
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

      // Get monthly income
      const { data: incomeSources } = await supabase
        .from('income_sources')
        .select('amount, frequency')
        .eq('user_id', userId)
        .eq('is_active', true)

      const monthlyIncome = (incomeSources || []).reduce((total, source) => {
        let monthlyAmount = source.amount
        switch (source.frequency) {
          case 'biweekly': monthlyAmount = source.amount * 2.17; break
          case 'weekly': monthlyAmount = source.amount * 4.33; break
          case 'quarterly': monthlyAmount = source.amount / 3; break
          case 'annual': monthlyAmount = source.amount / 12; break
        }
        return total + monthlyAmount
      }, 0)

      // Get monthly spending (excluding bill payments)
      const { data: transactions } = await supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', userId)
        .eq('transaction_type', 'expense')
        .or('exclude_from_spending.is.null,exclude_from_spending.eq.false')
        .gte('date', startOfMonth.toISOString())
        .lte('date', endOfMonth.toISOString())

      const monthlySpending = (transactions || []).reduce((total, t) => total + t.amount, 0)
      const cashFlow = monthlyIncome - monthlySpending

      setCurrentCashFlow(cashFlow)
    } catch (error) {
      console.error('Error calculating cash flow:', error)
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Calculator className="h-5 w-5 text-green-500" />
          What-If Bill Scenarios
        </h3>
        <Button onClick={() => setShowNewBillForm(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          New Scenario
        </Button>
      </div>

      {currentCashFlow !== null && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-black dark:text-white">Current Monthly Cash Flow</p>
                <p className={`text-2xl font-bold ${currentCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${currentCashFlow.toFixed(2)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-black dark:text-white">Available for New Bills</p>
                <p className="text-lg font-semibold text-blue-600">
                  ${Math.max(0, currentCashFlow * 0.7).toFixed(2)}
                </p>
                <p className="text-xs text-black dark:text-white">70% of cash flow (recommended)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {scenarios.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Calculator className="h-12 w-12 text-black dark:text-white mx-auto mb-4" />
            <h4 className="text-lg font-medium text-black dark:text-white mb-2">No Scenarios Created</h4>
            <p className="text-black dark:text-white mb-4">
              Create "what-if" scenarios to see how new bills would impact your budget.
            </p>
            <Button onClick={() => setShowNewBillForm(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Create First Scenario
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {scenarios.map(scenario => (
            <ScenarioCard key={scenario.id} scenario={scenario} onDelete={loadScenarios} />
          ))}
        </div>
      )}

      {showNewBillForm && (
        <NewBillScenarioForm
          userId={userId}
          onSuccess={() => {
            setShowNewBillForm(false)
            loadScenarios()
          }}
          onCancel={() => setShowNewBillForm(false)}
        />
      )}
    </div>
  )
}

// Individual Scenario Card Component
interface ScenarioCardProps {
  scenario: any
  onDelete: () => void
}

function ScenarioCard({ scenario, onDelete }: ScenarioCardProps) {
  const results: ScenarioResult = scenario.results
  const changes = scenario.changes

  const getAffordabilityColor = (rating: string) => {
    switch (rating) {
      case 'easily_affordable': return 'text-green-600 bg-green-50 border-green-200'
      case 'affordable': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'tight': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'concerning': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'not_affordable': return 'text-red-600 bg-red-50 border-red-200'
      default: return 'text-black dark:text-white bg-gray-50 border-gray-200'
    }
  }

  const getAffordabilityIcon = (rating: string) => {
    switch (rating) {
      case 'easily_affordable': return <CheckCircle className="h-4 w-4" />
      case 'affordable': return <CheckCircle className="h-4 w-4" />
      case 'tight': return <AlertTriangle className="h-4 w-4" />
      case 'concerning': return <AlertTriangle className="h-4 w-4" />
      case 'not_affordable': return <XCircle className="h-4 w-4" />
      default: return <Target className="h-4 w-4" />
    }
  }

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this scenario?')) {
      try {
        const supabase = createClient()
        const { error } = await supabase
          .from('what_if_scenarios')
          .delete()
          .eq('id', scenario.id)

        if (error) throw error
        onDelete()
      } catch (error) {
        console.error('Error deleting scenario:', error)
      }
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{scenario.scenario_name}</CardTitle>
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs border ${getAffordabilityColor(results.affordability_rating)}`}>
              {getAffordabilityIcon(results.affordability_rating)}
              <span className="capitalize">{results.affordability_rating.replace('_', ' ')}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleDelete}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Bill Details */}
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-black dark:text-white">Bill Amount</p>
              <p className="font-semibold">${changes.amount}/month</p>
            </div>
            <div>
              <p className="text-black dark:text-white">Category</p>
              <p className="font-semibold capitalize">{changes.category}</p>
            </div>
          </div>
        </div>

        {/* Impact Analysis */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-black dark:text-white">Current Cash Flow:</span>
              <span className="font-medium">${results.current_cash_flow.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-black dark:text-white">After New Bill:</span>
              <span className={`font-medium ${results.projected_cash_flow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${results.projected_cash_flow.toFixed(2)}
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-black dark:text-white">Monthly Impact:</span>
              <span className="font-medium text-red-600">-${results.monthly_impact.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-black dark:text-white">% of Income:</span>
              <span className="font-medium">{results.impact_percentage.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span>Budget Impact</span>
            <span>{results.impact_percentage.toFixed(1)}%</span>
          </div>
          <Progress
            value={Math.min(100, results.impact_percentage)}
            className="h-2"
          />
        </div>

        {/* Recommendations */}
        {results.recommendations && results.recommendations.length > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <ul className="list-disc list-inside space-y-1">
                {results.recommendations.slice(0, 2).map((rec, index) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}

// New Bill Scenario Form Component
interface NewBillScenarioFormProps {
  userId: string
  onSuccess: () => void
  onCancel: () => void
}

function NewBillScenarioForm({ userId, onSuccess, onCancel }: NewBillScenarioFormProps) {
  const [formData, setFormData] = useState<NewBillScenario>({
    billName: '',
    amount: '',
    frequency: 'monthly',
    category: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<ScenarioResult | null>(null)

  const supabase = createClient()

  const handleAnalyze = async () => {
    setError('')

    if (!formData.billName || !formData.amount || !formData.category) {
      setError('Please fill in all required fields')
      return
    }

    if (isNaN(Number(formData.amount)) || Number(formData.amount) <= 0) {
      setError('Please enter a valid amount')
      return
    }

    setLoading(true)

    try {
      // Call the affordability analysis function
      const { data, error: analysisError } = await supabase
        .rpc('analyze_bill_affordability', {
          user_uuid: userId,
          new_bill_amount: Number(formData.amount),
          billing_frequency: formData.frequency
        })

      if (analysisError) throw analysisError

      if (data && data.length > 0) {
        setResult(data[0])
      }
    } catch (error) {
      console.error('Error analyzing affordability:', error)
      setError('Failed to analyze bill affordability. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!result) return

    setLoading(true)

    try {
      const { error } = await supabase
        .from('what_if_scenarios')
        .insert({
          user_id: userId,
          scenario_name: `${formData.billName} - $${formData.amount}/${formData.frequency}`,
          scenario_type: 'new_bill',
          base_data: {
            current_cash_flow: result.current_cash_flow
          },
          changes: {
            bill_name: formData.billName,
            amount: result.monthly_impact,
            frequency: formData.frequency,
            category: formData.category
          },
          results: result,
          monthly_impact: result.monthly_impact,
          cash_flow_impact: result.projected_cash_flow - result.current_cash_flow,
          affordability_score: getAffordabilityScore(result.affordability_rating)
        })

      if (error) throw error
      onSuccess()
    } catch (error) {
      console.error('Error saving scenario:', error)
      setError('Failed to save scenario. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getAffordabilityScore = (rating: string): number => {
    switch (rating) {
      case 'easily_affordable': return 90
      case 'affordable': return 70
      case 'tight': return 50
      case 'concerning': return 30
      case 'not_affordable': return 10
      default: return 50
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            New Bill Scenario
          </h2>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4 space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Bill Name *</label>
            <input
              type="text"
              value={formData.billName}
              onChange={(e) => setFormData(prev => ({ ...prev, billName: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Netflix Subscription, Car Insurance"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Amount *</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-black dark:text-white" />
              <input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                className="w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Billing Frequency</label>
            <select
              value={formData.frequency}
              onChange={(e) => setFormData(prev => ({ ...prev, frequency: e.target.value as any }))}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="monthly">Monthly</option>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Bi-weekly</option>
              <option value="quarterly">Quarterly</option>
              <option value="annual">Annual</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Category *</label>
            <input
              type="text"
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Entertainment, Utilities, Insurance"
            />
          </div>

          {result && <ScenarioResultDisplay result={result} />}

          <div className="flex gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
            {!result ? (
              <Button onClick={handleAnalyze} disabled={loading} className="flex-1">
                {loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Calculator className="h-4 w-4 mr-1" />
                )}
                Analyze
              </Button>
            ) : (
              <Button onClick={handleSave} disabled={loading} className="flex-1">
                {loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                Save Scenario
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Scenario Result Display Component
interface ScenarioResultDisplayProps {
  result: ScenarioResult
}

function ScenarioResultDisplay({ result }: ScenarioResultDisplayProps) {
  const getAffordabilityColor = (rating: string) => {
    switch (rating) {
      case 'easily_affordable': return 'text-green-600 bg-green-50 border-green-200'
      case 'affordable': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'tight': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'concerning': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'not_affordable': return 'text-red-600 bg-red-50 border-red-200'
      default: return 'text-black dark:text-white bg-gray-50 border-gray-200'
    }
  }

  return (
    <div className="space-y-3 border-t pt-4">
      <h4 className="font-medium">Impact Analysis</h4>

      <div className={`p-3 rounded-lg border ${getAffordabilityColor(result.affordability_rating)}`}>
        <p className="font-medium capitalize">{result.affordability_rating.replace('_', ' ')}</p>
        <p className="text-sm">This bill represents {result.impact_percentage.toFixed(1)}% of your income</p>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-black dark:text-white">Current Cash Flow</p>
          <p className="font-semibold">${result.current_cash_flow.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-black dark:text-white">After This Bill</p>
          <p className={`font-semibold ${result.projected_cash_flow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ${result.projected_cash_flow.toFixed(2)}
          </p>
        </div>
      </div>

      {result.recommendations && result.recommendations.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <p className="font-medium mb-1">Recommendations:</p>
            <ul className="list-disc list-inside space-y-1">
              {result.recommendations.slice(0, 2).map((rec, index) => (
                <li key={index}>{rec}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}