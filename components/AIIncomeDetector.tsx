'use client';

import { useState } from 'react';
import { Brain, Loader2, Check, X, TrendingUp, Calendar, DollarSign, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface DetectedIncome {
  name: string;
  amount: number;
  frequency: 'monthly' | 'biweekly' | 'weekly' | 'quarterly' | 'annual' | 'one-time';
  category: string;
  confidence: number;
  firstSeen: Date;
  lastSeen: Date;
  occurrences: number;
  sourceTransactions: string[];
}

interface AIIncomeDetectorProps {
  userId: string;
  onIncomeCreated: () => void;
  onClose: () => void;
}

export default function AIIncomeDetector({ userId, onIncomeCreated, onClose }: AIIncomeDetectorProps) {
  const [loading, setLoading] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [detectedIncome, setDetectedIncome] = useState<DetectedIncome[]>([]);
  const [selectedIncome, setSelectedIncome] = useState<Set<number>>(new Set());
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedIncome, setEditedIncome] = useState<DetectedIncome[]>([]);

  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    found: number;
    transactionsScanned: number;
  } | null>(null);

  const detectIncome = async () => {
    setDetecting(true);
    setHasAnalyzed(false);
    try {
      const response = await fetch('/api/ai/detect-income', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) throw new Error('Failed to detect income');

      const data = await response.json();
      setDetectedIncome(data.detectedIncome || []);
      setEditedIncome(data.detectedIncome || []);
      setHasAnalyzed(true);
      setAnalysisResult({
        found: data.detectedIncome?.length || 0,
        transactionsScanned: data.incomeTransactionsFound || 0
      });

      // Auto-select high confidence items
      const autoSelected = new Set<number>();
      data.detectedIncome?.forEach((income: DetectedIncome, index: number) => {
        if (income.confidence >= 70) {
          autoSelected.add(index);
        }
      });
      setSelectedIncome(autoSelected);

      if (data.detectedIncome?.length === 0) {
        if (data.incomeTransactionsFound === 0) {
          toast.info('No income transactions found in your history. Make sure you have synced transactions from your bank account.');
        } else {
          toast.info(`Analyzed ${data.incomeTransactionsFound} income transactions but found no recurring patterns.`);
        }
      } else {
        toast.success(`✨ Detected ${data.detectedIncome.length} recurring income pattern(s) from ${data.incomeTransactionsFound} income transactions!`);
      }
    } catch (error) {
      console.error('Error detecting income:', error);
      toast.error('Failed to analyze income patterns');
      setHasAnalyzed(true);
    } finally {
      setDetecting(false);
    }
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
  };

  const handleSaveEdit = (index: number) => {
    setEditingIndex(null);
  };

  const handleToggleSelection = (index: number) => {
    const newSelected = new Set(selectedIncome);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedIncome(newSelected);
  };

  const handleCreateSelected = async () => {
    if (selectedIncome.size === 0) {
      toast.error('Please select at least one income source');
      return;
    }

    setLoading(true);
    try {
      const selectedItems = Array.from(selectedIncome).map(i => editedIncome[i]);
      
      // Create each selected income source
      for (const income of selectedItems) {
        const response = await fetch('/api/income', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: income.name,
            amount: income.amount,
            frequency: income.frequency,
            category: income.category,
            start_date: income.firstSeen,
            is_active: true,
            notes: `Auto-detected from ${income.occurrences} transactions (${income.confidence}% confidence)`
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to create income: ${income.name}`);
        }
      }

      toast.success(`🎉 Successfully created ${selectedIncome.size} income source(s)! Your budget calculations will now include these recurring income streams.`);
      onIncomeCreated();
      onClose();
    } catch (error) {
      console.error('Error creating income sources:', error);
      toast.error('Failed to create some income sources');
    } finally {
      setLoading(false);
    }
  };

  const formatFrequency = (frequency: string) => {
    const labels: Record<string, string> = {
      'weekly': 'Weekly',
      'biweekly': 'Bi-weekly',
      'monthly': 'Monthly',
      'quarterly': 'Quarterly',
      'annual': 'Annual',
      'one-time': 'One-time'
    };
    return labels[frequency] || frequency;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600 bg-green-50';
    if (confidence >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'salary':
        return 'ðŸ’¼';
      case 'freelance':
        return 'ðŸ’»';
      case 'investment':
        return 'ðŸ“ˆ';
      case 'rental':
        return 'ðŸ ';
      case 'business':
        return 'ðŸ¢';
      default:
        return 'ðŸ’°';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            AI Income Detection
          </h3>
          <p className="text-sm text-black dark:text-white mt-1">
            Automatically detect recurring income from your transaction history
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="h-5 w-5 text-black dark:text-white" />
        </button>
      </div>

      {/* Detection Button - Initial State */}
      {detectedIncome.length === 0 && !detecting && !hasAnalyzed && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Brain className="h-12 w-12 text-purple-600 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">
            Analyze Your Income Patterns
          </h4>
          <p className="text-sm text-black dark:text-white mb-6 max-w-md mx-auto">
            Our AI will scan your last 6 months of transactions to identify recurring deposits
            and categorize them as income sources.
          </p>
          <div className="flex gap-3 justify-center">
            <Button
              onClick={detectIncome}
              className="bg-purple-600 hover:bg-purple-700 text-white"
              title="🔍 AI will analyze your Plaid transaction history to automatically detect recurring income patterns like salary, freelance payments, and other regular deposits. It identifies frequency, amounts, and categorizes income sources for easy setup."
            >
              <Brain className="h-4 w-4 mr-2" />
              Start Analysis
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              className="text-black"
            >
              Skip
            </Button>
          </div>
        </div>
      )}

      {/* No Income Found State */}
      {detectedIncome.length === 0 && !detecting && hasAnalyzed && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">
            No Recurring Income Patterns Found
          </h4>
          <p className="text-sm text-black dark:text-white mb-4 max-w-md mx-auto">
            {analysisResult?.transactionsScanned === 0 ? (
              <>
                No income transactions found in your history. Try syncing your bank account
                or manually add your income sources.
              </>
            ) : (
              <>
                Analyzed {analysisResult?.transactionsScanned} income transactions but couldn't
                identify any recurring patterns. You can manually add your income sources instead.
              </>
            )}
          </p>
          <div className="flex gap-3 justify-center">
            <Button
              onClick={detectIncome}
              variant="outline"
              className="text-purple-600 border-purple-300 hover:bg-purple-50"
            >
              <Brain className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <Button
              onClick={onClose}
              className="bg-gray-600 hover:bg-gray-700 text-white"
            >
              Close
            </Button>
          </div>
        </div>
      )}

      {/* Detecting State */}
      {detecting && (
        <div className="text-center py-12">
          <Loader2 className="h-12 w-12 text-purple-600 animate-spin mx-auto mb-4" />
          <div className="space-y-2">
            <p className="text-gray-700 font-medium">🔍 Analyzing your transaction patterns...</p>
            <div className="space-y-1 text-sm text-black dark:text-white">
              <p>• Scanning the last 90 days of transactions</p>
              <p>• Identifying recurring income deposits</p>
              <p>• Calculating frequency and amounts</p>
              <p>• Categorizing income sources</p>
            </div>
            <p className="text-sm text-black dark:text-white mt-3">This usually takes 5-10 seconds</p>
          </div>
        </div>
      )}

      {/* Re-analyze button when income is already detected */}
      {detectedIncome.length > 0 && !detecting && (
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-lg font-semibold text-gray-900">
            Detected Income Sources ({detectedIncome.length})
          </h4>
          <Button
            onClick={detectIncome}
            variant="outline"
            className="text-purple-600 border-purple-300 hover:bg-purple-50"
          >
            <Brain className="h-4 w-4 mr-2" />
            Re-analyze
          </Button>
        </div>
      )}

      {/* Detected Income List */}
      {detectedIncome.length > 0 && !detecting && (
        <>
          <div className="space-y-3">
            {editedIncome.map((income, index) => (
              <div
                key={index}
                className={`border rounded-lg p-4 transition-all ${
                  selectedIncome.has(index) ? 'border-purple-500 bg-purple-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <input
                      type="checkbox"
                      checked={selectedIncome.has(index)}
                      onChange={() => handleToggleSelection(index)}
                      className="mt-1 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                    />
                    
                    <div className="flex-1">
                      {editingIndex === index ? (
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={editedIncome[index].name}
                            onChange={(e) => {
                              const updated = [...editedIncome];
                              updated[index] = { ...updated[index], name: e.target.value };
                              setEditedIncome(updated);
                            }}
                            className="w-full px-3 py-1 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                          />
                          <div className="flex gap-2">
                            <input
                              type="number"
                              value={editedIncome[index].amount}
                              onChange={(e) => {
                                const updated = [...editedIncome];
                                updated[index] = { ...updated[index], amount: parseFloat(e.target.value) };
                                setEditedIncome(updated);
                              }}
                              className="w-32 px-3 py-1 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                              step="0.01"
                            />
                            <select
                              value={editedIncome[index].frequency}
                              onChange={(e) => {
                                const updated = [...editedIncome];
                                updated[index] = { ...updated[index], frequency: e.target.value as any };
                                setEditedIncome(updated);
                              }}
                              className="px-3 py-1 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500"
                            >
                              <option value="weekly">Weekly</option>
                              <option value="biweekly">Bi-weekly</option>
                              <option value="monthly">Monthly</option>
                              <option value="quarterly">Quarterly</option>
                              <option value="annual">Annual</option>
                              <option value="one-time">One-time</option>
                            </select>
                            <button
                              onClick={() => handleSaveEdit(index)}
                              className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">{getCategoryIcon(income.category)}</span>
                            <h4 className="font-medium text-gray-900">{income.name}</h4>
                            <button
                              onClick={() => handleEdit(index)}
                              className="text-sm text-purple-600 hover:text-purple-700"
                            >
                              Edit
                            </button>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-4 text-sm">
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-4 w-4 text-black dark:text-white" />
                              <span className="font-semibold text-gray-900">
                                {formatCurrency(income.amount)}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4 text-black dark:text-white" />
                              <span className="text-black dark:text-white">
                                {formatFrequency(income.frequency)}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-1">
                              <TrendingUp className="h-4 w-4 text-black dark:text-white" />
                              <span className="text-black dark:text-white">
                                {income.occurrences} transactions
                              </span>
                            </div>
                          </div>
                          
                          <div className="mt-2 flex items-center gap-2">
                            <span className={`text-xs px-2 py-1 rounded-full ${getConfidenceColor(income.confidence)}`}>
                              {income.confidence}% confidence
                            </span>
                            <span className="text-xs text-black dark:text-white">
                              From {new Date(income.firstSeen).toLocaleDateString()} to{' '}
                              {new Date(income.lastSeen).toLocaleDateString()}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Review & Confirm</p>
                <p>
                  We've detected these income patterns based on your transaction history.
                  Please review and edit as needed before creating them. High confidence
                  items are pre-selected.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleCreateSelected}
              disabled={loading || selectedIncome.size === 0}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Create {selectedIncome.size} Selected
                </>
              )}
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
