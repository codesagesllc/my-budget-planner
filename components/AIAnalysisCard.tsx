'use client'

/**
 * AIAnalysisCard Component
 *
 * Parses and displays AI financial analysis in a user-friendly card format.
 * Handles JSON responses that include insights, budget breakdown, savings plan, and tips.
 *
 * Example usage:
 * ```tsx
 * const analysisText = `Here is the comprehensive financial analysis for the provided profile:
 * [
 *   {
 *     "insights": "Your analysis text here...",
 *     "monthlyBudget": { "income": 1299, "bills": 1301, "spending": 1301, "recommended_savings": 0 },
 *     "savingsPlan": { "per_paycheck": 0, "monthly_total": 0, "percentage": 0 },
 *     "tips": ["Tip 1", "Tip 2", "Tip 3"]
 *   }
 * ]`
 *
 * <AIAnalysisCard analysisText={analysisText} />
 * ```
 */

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert/Alert'
import {
  Brain,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  PiggyBank,
  Lightbulb
} from 'lucide-react'

interface MonthlyBudget {
  income: number
  bills: number
  spending: number
  recommended_savings: number
}

interface SavingsPlan {
  per_paycheck: number
  monthly_total: number
  percentage: number
}

interface AIAnalysisData {
  insights: string
  monthlyBudget: MonthlyBudget
  savingsPlan: SavingsPlan
  tips: string[]
}

interface AIAnalysisCardProps {
  analysisText: string
  className?: string
}

function parseAIAnalysis(analysisText: string): AIAnalysisData | null {
  try {
    // Remove the prefix text and extract JSON
    const jsonStart = analysisText.indexOf('[')
    if (jsonStart === -1) return null

    const jsonString = analysisText.substring(jsonStart)
    const parsed = JSON.parse(jsonString)

    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed[0] as AIAnalysisData
    }

    return null
  } catch (error) {
    console.error('Failed to parse AI analysis:', error)
    return null
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function getBudgetStatus(budget: MonthlyBudget) {
  const netIncome = budget.income - budget.spending
  if (netIncome > 0) {
    return { status: 'positive', color: 'text-green-600 dark:text-green-400', icon: TrendingUp }
  } else if (netIncome === 0) {
    return { status: 'neutral', color: 'text-yellow-600 dark:text-yellow-400', icon: AlertCircle }
  } else {
    return { status: 'negative', color: 'text-red-600 dark:text-red-400', icon: TrendingDown }
  }
}

export default function AIAnalysisCard({ analysisText, className }: AIAnalysisCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const analysis = parseAIAnalysis(analysisText)

  if (!analysis) {
    return (
      <Alert className={className}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Unable to parse AI analysis. Please try generating a new analysis.
        </AlertDescription>
      </Alert>
    )
  }

  const budgetStatus = getBudgetStatus(analysis.monthlyBudget)
  const StatusIcon = budgetStatus.icon

  return (
    <Card className={`${className} bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700`}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-black dark:text-white">
          <Brain className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          AI Financial Analysis
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Main Insights */}
        <div className="space-y-3">
          <h4 className="font-medium text-black dark:text-white flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            Key Insights
          </h4>
          <div className="text-sm text-black dark:text-white leading-relaxed">
            {analysis.insights}
          </div>
        </div>

        {/* Budget Overview */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-black dark:text-white flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
              Monthly Budget
            </h4>
            <div className={`flex items-center gap-1 text-sm ${budgetStatus.color}`}>
              <StatusIcon className="h-4 w-4" />
              <span className="font-medium">
                {analysis.monthlyBudget.income - analysis.monthlyBudget.spending > 0 ? '+' : ''}
                {formatCurrency(analysis.monthlyBudget.income - analysis.monthlyBudget.spending)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
              <p className="text-xs text-black dark:text-white dark:text-black dark:text-white mb-1">Income</p>
              <p className="text-lg font-semibold text-black dark:text-white">
                {formatCurrency(analysis.monthlyBudget.income)}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
              <p className="text-xs text-black dark:text-white dark:text-black dark:text-white mb-1">Bills</p>
              <p className="text-lg font-semibold text-black dark:text-white">
                {formatCurrency(analysis.monthlyBudget.bills)}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
              <p className="text-xs text-black dark:text-white dark:text-black dark:text-white mb-1">Spending</p>
              <p className="text-lg font-semibold text-black dark:text-white">
                {formatCurrency(analysis.monthlyBudget.spending)}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
              <p className="text-xs text-black dark:text-white dark:text-black dark:text-white mb-1">Savings</p>
              <p className="text-lg font-semibold text-black dark:text-white">
                {formatCurrency(analysis.monthlyBudget.recommended_savings)}
              </p>
            </div>
          </div>
        </div>

        {/* Savings Plan */}
        {analysis.savingsPlan.monthly_total > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-black dark:text-white flex items-center gap-2">
              <PiggyBank className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              Recommended Savings Plan
            </h4>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">Per Paycheck</p>
                  <p className="font-semibold text-blue-900 dark:text-blue-100">
                    {formatCurrency(analysis.savingsPlan.per_paycheck)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">Monthly Total</p>
                  <p className="font-semibold text-blue-900 dark:text-blue-100">
                    {formatCurrency(analysis.savingsPlan.monthly_total)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">Of Income</p>
                  <p className="font-semibold text-blue-900 dark:text-blue-100">
                    {analysis.savingsPlan.percentage.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tips */}
        <div className="space-y-3">
          <h4 className="font-medium text-black dark:text-white flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            Action Items ({analysis.tips.length})
          </h4>
          <div className="space-y-2">
            {analysis.tips.slice(0, isExpanded ? undefined : 3).map((tip, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="w-5 h-5 rounded-full bg-green-600 dark:bg-green-500 text-white flex items-center justify-center text-xs font-medium mt-0.5">
                  {index + 1}
                </div>
                <p className="text-sm text-green-800 dark:text-green-200 leading-relaxed">
                  {tip}
                </p>
              </div>
            ))}
            {analysis.tips.length > 3 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
              >
                {isExpanded ? 'Show less' : `Show ${analysis.tips.length - 3} more tips`}
              </button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}