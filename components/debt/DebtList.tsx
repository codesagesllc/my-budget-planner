'use client';

import { useState } from 'react';
import { Debt } from '@/types/debt';
import { RecordPaymentModal } from './RecordPaymentModal';
import { PaymentHistoryModal } from './PaymentHistoryModal';
import { 
  CreditCard, 
  Home, 
  Car, 
  GraduationCap,
  Briefcase,
  Heart,
  Users,
  MoreHorizontal,
  Edit,
  Trash2,
  ChevronDown,
  ChevronUp,
  History
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DebtListProps {
  debts: Debt[];
  loading: boolean;
  onUpdate: (debtId: string, updates: Partial<Debt>) => void;
  onDelete: (debtId: string) => void;
}

export function DebtList({ debts, loading, onUpdate, onDelete }: DebtListProps) {
  const [expandedDebt, setExpandedDebt] = useState<string | null>(null);
  const [editingDebt, setEditingDebt] = useState<string | null>(null);
  const [paymentDebt, setPaymentDebt] = useState<Debt | null>(null);
  const [historyDebt, setHistoryDebt] = useState<Debt | null>(null);

  const getDebtIcon = (debtType: string) => {
    const icons = {
      credit_card: CreditCard,
      mortgage: Home,
      auto_loan: Car,
      student_loan: GraduationCap,
      business_loan: Briefcase,
      medical_debt: Heart,
      family_loan: Users,
      personal_loan: MoreHorizontal,
      other: MoreHorizontal,
    };
    return icons[debtType as keyof typeof icons] || MoreHorizontal;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const calculateProgress = (debt: Debt) => {
    if (!debt.original_amount || debt.original_amount === 0) return 0;
    const paid = debt.original_amount - debt.current_balance;
    return (paid / debt.original_amount) * 100;
  };

  const handleQuickPayment = (debt: Debt) => {
    setPaymentDebt(debt);
  };

  const handlePaymentComplete = async (debtId: string, paymentAmount: number, newBalance: number) => {
    // Update the debt with the new balance
    await onUpdate(debtId, { current_balance: newBalance });
    setPaymentDebt(null);
  };

  const handlePaymentDeleted = async (debtId: string) => {
    // Refresh the debt data
    window.location.reload(); // Simple refresh for now
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (debts.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-12 text-center">
        <div className="max-w-md mx-auto">
          <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Debts Added</h3>
          <p className="text-gray-600">
            Start by adding your debts to track payments and optimize your payoff strategy.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">Your Debts</h2>
        <p className="text-sm text-gray-600 mt-1">
          {debts.length} active {debts.length === 1 ? 'debt' : 'debts'}
        </p>
      </div>

      <div className="divide-y divide-gray-200">
        {debts.map((debt) => {
          const Icon = getDebtIcon(debt.debt_type);
          const progress = calculateProgress(debt);
          const isExpanded = expandedDebt === debt.id;

          return (
            <div key={debt.id} className="p-6 hover:bg-gray-50 transition-colors">
              {/* Main Debt Row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 flex-1">
                  <div className={`p-3 rounded-lg bg-gray-100`}>
                    <Icon className="h-6 w-6 text-gray-600" />
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{debt.creditor_name}</h3>
                    <p className="text-sm text-gray-600">
                      {debt.debt_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatCurrency(debt.current_balance)}</p>
                    {debt.interest_rate && (
                      <p className="text-sm text-gray-600">{debt.interest_rate}% APR</p>
                    )}
                  </div>

                  <div className="text-right">
                    <p className="text-sm text-gray-600">Min Payment</p>
                    <p className="font-semibold text-gray-900">{formatCurrency(debt.minimum_payment || 0)}</p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      className="bg-gray-900 text-white hover:bg-gray-800"
                      onClick={() => handleQuickPayment(debt)}
                    >
                      Record Payment
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setHistoryDebt(debt)}
                      title="View payment history"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <History className="h-4 w-4" />
                    </Button>
                    
                    <button
                      onClick={() => setExpandedDebt(isExpanded ? null : debt.id)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-gray-600" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-600" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              {debt.original_amount && (
                <div className="mt-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Progress</span>
                    <span>{progress.toFixed(1)}% paid</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Original: {formatCurrency(debt.original_amount)}</span>
                    <span>Remaining: {formatCurrency(debt.current_balance)}</span>
                  </div>
                </div>
              )}

              {/* Expanded Details */}
              {isExpanded && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {debt.credit_limit && (
                      <div>
                        <p className="text-sm text-gray-600">Credit Limit</p>
                        <p className="font-semibold text-gray-900">{formatCurrency(debt.credit_limit)}</p>
                        <p className="text-xs text-gray-500">
                          {((debt.current_balance / debt.credit_limit) * 100).toFixed(1)}% utilized
                        </p>
                      </div>
                    )}
                    
                    {debt.due_date && (
                      <div>
                        <p className="text-sm text-gray-600">Due Date</p>
                        <p className="font-semibold text-gray-900">Day {debt.due_date} of month</p>
                      </div>
                    )}
                    
                    {debt.loan_term_months && (
                      <div>
                        <p className="text-sm text-gray-600">Loan Term</p>
                        <p className="font-semibold text-gray-900">{debt.loan_term_months} months</p>
                      </div>
                    )}
                    
                    <div>
                      <p className="text-sm text-gray-600">Added</p>
                      <p className="font-semibold text-gray-900">
                        {new Date(debt.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {debt.notes && (
                    <div className="mt-4">
                      <p className="text-sm text-gray-600">Notes</p>
                      <p className="text-gray-900 mt-1">{debt.notes}</p>
                    </div>
                  )}

                  <div className="flex justify-end space-x-2 mt-6">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingDebt(debt.id)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => {
                        if (confirm('Are you sure you want to remove this debt?')) {
                          onDelete(debt.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Record Payment Modal */}
      {paymentDebt && (
        <RecordPaymentModal
          debt={paymentDebt}
          onClose={() => setPaymentDebt(null)}
          onPaymentRecorded={handlePaymentComplete}
        />
      )}

      {/* Payment History Modal */}
      {historyDebt && (
        <PaymentHistoryModal
          debt={historyDebt}
          onClose={() => setHistoryDebt(null)}
          onPaymentDeleted={handlePaymentDeleted}
        />
      )}
    </div>
  );
}
