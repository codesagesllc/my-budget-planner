'use client';

import { useState } from 'react';
import { DebtSummary, FinancialSnapshot } from '@/types/debt';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar,
  Percent,
  AlertCircle,
  Edit2,
  Save,
  X
} from 'lucide-react';

interface DebtDashboardProps {
  summary: DebtSummary;
  financialSnapshot?: FinancialSnapshot | null;
  onUpdateSnapshot?: (snapshot: FinancialSnapshot) => void;
}

export function DebtDashboard({ summary, financialSnapshot, onUpdateSnapshot }: DebtDashboardProps) {
  const [isEditingSnapshot, setIsEditingSnapshot] = useState(false);
  const [editedSnapshot, setEditedSnapshot] = useState<FinancialSnapshot | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    });
  };

  const handleEditSnapshot = () => {
    if (financialSnapshot) {
      setEditedSnapshot({ ...financialSnapshot });
      setIsEditingSnapshot(true);
    }
  };

  const handleSaveSnapshot = () => {
    if (editedSnapshot && onUpdateSnapshot) {
      // Recalculate available_for_debt based on income and expenses
      const updatedSnapshot = {
        ...editedSnapshot,
        available_for_debt: editedSnapshot.monthly_income - editedSnapshot.monthly_expenses
      };
      onUpdateSnapshot(updatedSnapshot);
      setIsEditingSnapshot(false);
      setEditedSnapshot(null);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingSnapshot(false);
    setEditedSnapshot(null);
  };

  const handleInputChange = (field: keyof FinancialSnapshot, value: string) => {
    if (!editedSnapshot) return;
    
    const numValue = parseFloat(value) || 0;
    const updatedSnapshot = {
      ...editedSnapshot,
      [field]: numValue
    };
    
    // Auto-calculate available_for_debt when income or expenses change
    if (field === 'monthly_income' || field === 'monthly_expenses') {
      updatedSnapshot.available_for_debt = updatedSnapshot.monthly_income - updatedSnapshot.monthly_expenses;
    }
    
    setEditedSnapshot(updatedSnapshot);
  };

  const cards = [
    {
      title: 'Total Debt',
      value: formatCurrency(summary.total_debt),
      icon: DollarSign,
      color: 'bg-red-500',
      description: 'Outstanding balance',
    },
    {
      title: 'Monthly Payment',
      value: formatCurrency(summary.total_minimum_payment),
      icon: Calendar,
      color: 'bg-blue-500',
      description: 'Minimum required',
    },
    {
      title: 'Avg Interest Rate',
      value: `${summary.weighted_average_interest.toFixed(2)}%`,
      icon: Percent,
      color: 'bg-yellow-500',
      description: 'Weighted average',
    },
    {
      title: 'Payoff Date',
      value: formatDate(summary.projected_payoff_date),
      icon: Calendar,
      color: 'bg-green-500',
      description: 'With current payments',
    },
  ];

  const insights = [];

  if (summary.debt_to_income_ratio > 40) {
    insights.push({
      type: 'warning',
      message: `Your debt-to-income ratio is ${summary.debt_to_income_ratio.toFixed(1)}%. Consider strategies to reduce this below 40%.`,
    });
  }

  if (summary.highest_interest_debt && summary.highest_interest_debt.interest_rate! > 20) {
    insights.push({
      type: 'alert',
      message: `${summary.highest_interest_debt.creditor_name} has a ${summary.highest_interest_debt.interest_rate}% interest rate. Prioritize paying this off.`,
    });
  }

  if (financialSnapshot && financialSnapshot.available_for_debt > 100) {
    insights.push({
      type: 'success',
      message: `You have ${formatCurrency(financialSnapshot.available_for_debt)} available for extra debt payments each month.`,
    });
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, index) => (
          <div key={index} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`${card.color} text-white p-3 rounded-lg`}>
                <card.icon className="h-6 w-6" />
              </div>
              {summary.total_debt > 0 && index === 0 && (
                <TrendingDown className="h-5 w-5 text-green-500" />
              )}
            </div>
            <h3 className="text-sm font-medium text-gray-600">{card.title}</h3>
            <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
            <p className="text-xs text-gray-500 mt-1">{card.description}</p>
          </div>
        ))}
      </div>

      {/* Key Insights */}
      {insights.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            Key Insights
          </h3>
          <div className="space-y-3">
            {insights.map((insight, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg flex items-start ${
                  insight.type === 'warning'
                    ? 'bg-yellow-50 text-yellow-800'
                    : insight.type === 'alert'
                    ? 'bg-red-50 text-red-800'
                    : 'bg-green-50 text-green-800'
                }`}
              >
                <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                <p className="text-sm">{insight.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Financial Health - Editable */}
      {financialSnapshot && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Financial Health</h3>
            {!isEditingSnapshot ? (
              <button
                onClick={handleEditSnapshot}
                className="text-blue-600 hover:text-blue-800 transition-colors p-2"
                title="Edit financial snapshot"
              >
                <Edit2 className="h-5 w-5" />
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleSaveSnapshot}
                  className="text-green-600 hover:text-green-800 transition-colors p-2"
                  title="Save changes"
                >
                  <Save className="h-5 w-5" />
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="text-red-600 hover:text-red-800 transition-colors p-2"
                  title="Cancel"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Monthly Income</p>
              {isEditingSnapshot && editedSnapshot ? (
                <input
                  type="number"
                  value={editedSnapshot.monthly_income}
                  onChange={(e) => handleInputChange('monthly_income', e.target.value)}
                  className="w-full mt-1 px-2 py-1 text-lg font-semibold border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  step="100"
                  min="0"
                />
              ) : (
                <p className="text-lg font-semibold">{formatCurrency(financialSnapshot.monthly_income)}</p>
              )}
            </div>
            
            <div>
              <p className="text-sm text-gray-600">Monthly Expenses</p>
              {isEditingSnapshot && editedSnapshot ? (
                <input
                  type="number"
                  value={editedSnapshot.monthly_expenses}
                  onChange={(e) => handleInputChange('monthly_expenses', e.target.value)}
                  className="w-full mt-1 px-2 py-1 text-lg font-semibold border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  step="100"
                  min="0"
                />
              ) : (
                <p className="text-lg font-semibold">{formatCurrency(financialSnapshot.monthly_expenses)}</p>
              )}
            </div>
            
            <div>
              <p className="text-sm text-gray-600">Available for Debt</p>
              {isEditingSnapshot && editedSnapshot ? (
                <p className="text-lg font-semibold text-green-600">
                  {formatCurrency(editedSnapshot.available_for_debt)}
                </p>
              ) : (
                <p className="text-lg font-semibold text-green-600">
                  {formatCurrency(financialSnapshot.available_for_debt)}
                </p>
              )}
            </div>
            
            <div>
              <p className="text-sm text-gray-600">Emergency Fund</p>
              {isEditingSnapshot && editedSnapshot ? (
                <input
                  type="number"
                  value={editedSnapshot.emergency_fund}
                  onChange={(e) => handleInputChange('emergency_fund', e.target.value)}
                  className="w-full mt-1 px-2 py-1 text-lg font-semibold border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  step="100"
                  min="0"
                />
              ) : (
                <p className="text-lg font-semibold">{formatCurrency(financialSnapshot.emergency_fund)}</p>
              )}
            </div>
          </div>
          
          {isEditingSnapshot && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Available for Debt is automatically calculated as Monthly Income minus Monthly Expenses.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
