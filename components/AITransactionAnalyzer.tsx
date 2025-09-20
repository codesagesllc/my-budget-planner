'use client'

import { useState } from 'react'
import { Brain, Zap, CheckCircle, AlertCircle, Loader2, Search, Filter, Calendar, DollarSign, Tag, X } from 'lucide-react'
import { toast } from 'sonner'
import type { Transaction } from '@/types/financial'

interface DetectedBill {
  name: string
  amount: number
  frequency: 'monthly' | 'weekly' | 'biweekly' | 'quarterly' | 'annual'
  confidence: number
  categories: string[]
  lastDate: string
  occurrences: number
  transactions: Transaction[]
  suggestedDueDate?: number
  isRecurring: boolean
}

interface AITransactionAnalyzerProps {
  userId: string
  transactions: Transaction[]
  onBillsDetected?: (bills: DetectedBill[]) => void
  onCreateBills?: (bills: DetectedBill[]) => void
  onClose?: () => void
}

export default function AITransactionAnalyzer({
  userId,
  transactions,
  onBillsDetected,
  onCreateBills,
  onClose
}: AITransactionAnalyzerProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [detectedBills, setDetectedBills] = useState<DetectedBill[]>([])
  const [selectedBills, setSelectedBills] = useState<Set<number>>(new Set())
  const [analysisComplete, setAnalysisComplete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filterConfidence, setFilterConfidence] = useState(70)
  const [showOnlyRecurring, setShowOnlyRecurring] = useState(true)

  const analyzeTransactions = async () => {
    setIsAnalyzing(true)
    setError(null)
    
    try {
      const response = await fetch('/api/ai/analyze-transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          transactions: transactions.slice(0, 500), // Limit for performance
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to analyze transactions')
      }

      const result = await response.json()
      
      if (result.detectedBills) {
        setDetectedBills(result.detectedBills)
        setAnalysisComplete(true)
        onBillsDetected?.(result.detectedBills)
        
        // Auto-select high confidence recurring bills
        const autoSelected = new Set<number>()
        result.detectedBills.forEach((bill: DetectedBill, index: number) => {
          if (bill.confidence >= 80 && bill.isRecurring) {
            autoSelected.add(index)
          }
        })
        setSelectedBills(autoSelected)

        // Show success message with analysis results
        const recurringCount = result.detectedBills.filter((bill: DetectedBill) => bill.isRecurring).length
        const highConfidenceCount = result.detectedBills.filter((bill: DetectedBill) => bill.confidence >= 80).length

        if (result.detectedBills.length === 0) {
          toast.info('No recurring bill patterns found in your transaction history. This is normal if you don\'t have many recurring transactions or if you pay bills irregularly.')
        } else {
          toast.success(
            `✨ Analysis complete! Found ${result.detectedBills.length} potential bill pattern${result.detectedBills.length > 1 ? 's' : ''}:\n\n` +
            `• ${recurringCount} recurring bill${recurringCount !== 1 ? 's' : ''}\n` +
            `• ${highConfidenceCount} high-confidence detection${highConfidenceCount !== 1 ? 's' : ''}\n` +
            `• ${autoSelected.size} automatically selected for creation\n\n` +
            `Review the results below and create the bills you want to track.`,
            { duration: 6000 }
          )
        }
      }
    } catch (err) {
      console.error('Error analyzing transactions:', err)
      setError(err instanceof Error ? err.message : 'Failed to analyze transactions')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const resetAnalysis = () => {
    setDetectedBills([])
    setSelectedBills(new Set())
    setAnalysisComplete(false)
    setError(null)
  }

  const handleCreateSelectedBills = async () => {
    const billsToCreate = detectedBills.filter((_, index) => selectedBills.has(index))
    
    if (billsToCreate.length === 0) {
      setError('Please select at least one bill to create')
      return
    }

    setIsAnalyzing(true)
    setError(null)

    try {
      const response = await fetch('/api/bills/create-from-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          bills: billsToCreate,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create bills')
      }

      const result = await response.json()

      onCreateBills?.(billsToCreate)

      // Show enhanced success message with details
      const billNames = billsToCreate.map(bill => bill.name).join(', ')
      toast.success(
        `🎉 Successfully created ${billsToCreate.length} bill${billsToCreate.length > 1 ? 's' : ''}!\n\n` +
        `Bills created: ${billNames}\n\n` +
        `These bills are now active in your budget and will be included in financial forecasts.`,
        { duration: 5000 }
      )

      // Reset after successful creation
      setDetectedBills([])
      setSelectedBills(new Set())
      setAnalysisComplete(false)

      // Show success message
      setError(null)
    } catch (err) {
      console.error('Error creating bills:', err)
      setError(err instanceof Error ? err.message : 'Failed to create bills')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const toggleBillSelection = (index: number) => {
    const newSelected = new Set(selectedBills)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedBills(newSelected)
  }

  const selectAll = () => {
    const filtered = getFilteredBills()
    const allIndices = filtered.map((_, index) => index)
    setSelectedBills(new Set(allIndices))
  }

  const deselectAll = () => {
    setSelectedBills(new Set())
  }

  const getFilteredBills = () => {
    return detectedBills.filter(bill => {
      if (showOnlyRecurring && !bill.isRecurring) return false
      if (bill.confidence < filterConfidence) return false
      return true
    })
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-600 bg-green-50'
    if (confidence >= 70) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  const getFrequencyLabel = (frequency: string) => {
    const labels: Record<string, string> = {
      monthly: 'Monthly',
      weekly: 'Weekly',
      biweekly: 'Bi-weekly',
      quarterly: 'Quarterly',
      annual: 'Annual',
    }
    return labels[frequency] || frequency
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(Math.abs(amount))
  }

  const filteredBills = getFilteredBills()

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-100 rounded-lg">
            <Brain className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">AI Transaction Analyzer</h2>
            <p className="text-sm text-gray-600">Automatically detect recurring bills and payments</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Always show analyze button */}
          <button
            onClick={analyzeTransactions}
            disabled={isAnalyzing || transactions.length === 0}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                {analysisComplete ? 'Re-analyze' : 'Analyze Transactions'}
              </>
            )}
          </button>

          {/* Reset button when analysis is complete */}
          {analysisComplete && (
            <button
              onClick={resetAnalysis}
              className="px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              title="Reset analysis"
            >
              <Zap className="h-4 w-4" />
            </button>
          )}


          {/* Close button */}
          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

          {/* Analyzing State */}
          {isAnalyzing && !analysisComplete && (
            <div className="text-center py-12">
              <Loader2 className="h-12 w-12 text-purple-600 animate-spin mx-auto mb-4" />
              <div className="space-y-2">
                <p className="text-gray-700 font-medium">🔍 Analyzing your transaction patterns...</p>
                <div className="space-y-1 text-sm text-gray-600">
                  <p>• Scanning {transactions.length} transactions for recurring patterns</p>
                  <p>• Identifying merchant names and payment frequencies</p>
                  <p>• Calculating confidence scores for bill detection</p>
                  <p>• Categorizing potential recurring expenses</p>
                </div>
                <p className="text-sm text-gray-500 mt-3">This usually takes 5-15 seconds</p>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {analysisComplete && detectedBills.length > 0 && (
        <>
          {/* Filters */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Filters:</span>
              </div>
              
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showOnlyRecurring}
                  onChange={(e) => setShowOnlyRecurring(e.target.checked)}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm text-gray-700">Recurring only</span>
              </label>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">Min confidence:</span>
                <select
                  value={filterConfidence}
                  onChange={(e) => setFilterConfidence(Number(e.target.value))}
                  className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value={50}>50%</option>
                  <option value={70}>70%</option>
                  <option value={80}>80%</option>
                  <option value={90}>90%</option>
                </select>
              </div>
              
              <div className="flex gap-2 ml-auto">
                <button
                  onClick={selectAll}
                  className="text-sm text-purple-600 hover:text-purple-800"
                >
                  Select All
                </button>
                <span className="text-gray-400">|</span>
                <button
                  onClick={deselectAll}
                  className="text-sm text-purple-600 hover:text-purple-800"
                >
                  Deselect All
                </button>
              </div>
            </div>
          </div>

          {/* Results Summary */}
          <div className="mb-4 p-4 bg-purple-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-purple-600" />
                <p className="text-sm text-purple-800">
                  Found <strong>{filteredBills.length}</strong> potential bills
                  {selectedBills.size > 0 && (
                    <> • <strong>{selectedBills.size}</strong> selected</>
                  )}
                </p>
              </div>
              
              {selectedBills.size > 0 && (
                <button
                  onClick={handleCreateSelectedBills}
                  disabled={isAnalyzing}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  title="💰 Create recurring bills from selected detected patterns. These will be added to your bills list and used for budget forecasting."
                >
                  {isAnalyzing && analysisComplete ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating Bills...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Create {selectedBills.size} Bill{selectedBills.size > 1 ? 's' : ''}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Detected Bills List */}
          <div className="space-y-3">
            {filteredBills.map((bill, index) => (
              <div
                key={index}
                className={`border rounded-lg p-4 transition-all ${
                  selectedBills.has(index) 
                    ? 'border-purple-500 bg-purple-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedBills.has(index)}
                    onChange={() => toggleBillSelection(index)}
                    className="mt-1 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900">{bill.name}</h3>
                        <div className="flex flex-wrap items-center gap-3 mt-1">
                          <span className="text-lg font-bold text-gray-900">
                            {formatCurrency(bill.amount)}
                          </span>
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                            {getFrequencyLabel(bill.frequency)}
                          </span>
                          {bill.isRecurring && (
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                              Recurring
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${getConfidenceColor(bill.confidence)}`}>
                        {bill.confidence}% confidence
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Last: {new Date(bill.lastDate).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        {bill.occurrences} transactions
                      </div>
                      {bill.suggestedDueDate && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Due: Day {bill.suggestedDueDate}
                        </div>
                      )}
                    </div>
                    
                    {bill.categories.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {bill.categories.map((category, catIndex) => (
                          <span
                            key={catIndex}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                          >
                            <Tag className="h-3 w-3" />
                            {category}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    {/* Transaction History Preview */}
                    <details className="mt-3">
                      <summary className="text-sm text-purple-600 hover:text-purple-800 cursor-pointer">
                        View transaction history ({bill.transactions.length})
                      </summary>
                      <div className="mt-2 space-y-1 pl-4 border-l-2 border-purple-200">
                        {bill.transactions.slice(0, 5).map((transaction, tIndex) => (
                          <div key={tIndex} className="text-xs text-gray-600 flex justify-between">
                            <span>{new Date(transaction.date).toLocaleDateString()}</span>
                            <span className="font-medium">{formatCurrency(transaction.amount)}</span>
                          </div>
                        ))}
                        {bill.transactions.length > 5 && (
                          <p className="text-xs text-gray-500 italic">
                            +{bill.transactions.length - 5} more transactions
                          </p>
                        )}
                      </div>
                    </details>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredBills.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <AlertCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No bills match your current filters</p>
              <p className="text-sm mt-1">Try adjusting the confidence threshold or filters</p>
            </div>
          )}
          </>
        )}

        {analysisComplete && detectedBills.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Brain className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-lg font-medium">No recurring bills detected</p>
            <p className="text-sm mt-1">The AI couldn't identify any recurring patterns in your transactions</p>
          </div>
        )}

        {!analysisComplete && !isAnalyzing && transactions.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <AlertCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-lg font-medium">No transactions available</p>
            <p className="text-sm mt-1">Connect your bank account to analyze transactions</p>
          </div>
        )}
    </div>
  )
}
