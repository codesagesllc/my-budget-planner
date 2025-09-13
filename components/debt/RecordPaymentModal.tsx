'use client';

import { useState } from 'react';
import { Debt } from '@/types/debt';
import { X, DollarSign, Calendar, CreditCard, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';

interface RecordPaymentModalProps {
  debt: Debt;
  onClose: () => void;
  onPaymentRecorded: (debtId: string, paymentAmount: number, newBalance: number) => void;
}

export function RecordPaymentModal({ debt, onClose, onPaymentRecorded }: RecordPaymentModalProps) {
  const [paymentAmount, setPaymentAmount] = useState<string>(debt.minimum_payment?.toString() || '');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');
  const [isExtraPayment, setIsExtraPayment] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const calculateNewBalance = () => {
    const payment = parseFloat(paymentAmount) || 0;
    return Math.max(0, debt.current_balance - payment);
  };

  const calculateInterestPortion = () => {
    if (!debt.interest_rate) return 0;
    // Simple interest calculation (monthly)
    const monthlyRate = debt.interest_rate / 100 / 12;
    return debt.current_balance * monthlyRate;
  };

  const calculatePrincipalPortion = () => {
    const payment = parseFloat(paymentAmount) || 0;
    const interest = calculateInterestPortion();
    return Math.max(0, payment - interest);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const payment = parseFloat(paymentAmount);
    if (payment <= 0) {
      toast.error('Payment amount must be greater than 0');
      return;
    }

    if (payment > debt.current_balance) {
      toast.error('Payment amount cannot exceed current balance');
      return;
    }

    setLoading(true);

    try {
      // Record the payment in the database
      const response = await fetch('/api/debt-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          debt_id: debt.id,
          payment_date: paymentDate,
          amount: payment,
          principal_amount: calculatePrincipalPortion(),
          interest_amount: calculateInterestPortion(),
          remaining_balance: calculateNewBalance(),
          notes: notes || null,
          is_extra_payment: isExtraPayment,
        }),
      });

      if (!response.ok) throw new Error('Failed to record payment');

      const newBalance = calculateNewBalance();
      await onPaymentRecorded(debt.id, payment, newBalance);
      
      toast.success(`Payment of ${formatCurrency(payment)} recorded successfully`);
      onClose();
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAmount = (amount: number) => {
    setPaymentAmount(amount.toString());
    if (amount > (debt.minimum_payment || 0)) {
      setIsExtraPayment(true);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Record Payment</h2>
              <p className="text-sm text-gray-600 mt-1">{debt.creditor_name}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Current Balance Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Current Balance</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatCurrency(debt.current_balance)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Minimum Payment</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatCurrency(debt.minimum_payment || 0)}
                </p>
              </div>
            </div>
            {debt.interest_rate && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-sm text-gray-600">Interest Rate: {debt.interest_rate}% APR</p>
              </div>
            )}
          </div>

          {/* Payment Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Payment Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Amount
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  required
                />
              </div>
              
              {/* Quick Amount Buttons */}
              <div className="flex gap-2 mt-2">
                {debt.minimum_payment && (
                  <button
                    type="button"
                    onClick={() => handleQuickAmount(debt.minimum_payment!)}
                    className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                  >
                    Min: {formatCurrency(debt.minimum_payment)}
                  </button>
                )}
                {debt.minimum_payment && (
                  <button
                    type="button"
                    onClick={() => handleQuickAmount(debt.minimum_payment! * 2)}
                    className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                  >
                    2x Min: {formatCurrency(debt.minimum_payment * 2)}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleQuickAmount(debt.current_balance)}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  Pay Off: {formatCurrency(debt.current_balance)}
                </button>
              </div>
            </div>

            {/* Payment Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            {/* Extra Payment Toggle */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="extraPayment"
                checked={isExtraPayment}
                onChange={(e) => setIsExtraPayment(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="extraPayment" className="text-sm text-gray-700">
                This is an extra payment (above minimum)
              </label>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Add any notes about this payment..."
              />
            </div>

            {/* Payment Breakdown */}
            {paymentAmount && parseFloat(paymentAmount) > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">Payment Breakdown</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-700">Payment Amount:</span>
                    <span className="font-medium text-blue-900">
                      {formatCurrency(parseFloat(paymentAmount))}
                    </span>
                  </div>
                  {debt.interest_rate && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-blue-700">Interest Portion:</span>
                        <span className="text-blue-900">
                          {formatCurrency(calculateInterestPortion())}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-700">Principal Portion:</span>
                        <span className="text-blue-900">
                          {formatCurrency(calculatePrincipalPortion())}
                        </span>
                      </div>
                    </>
                  )}
                  <div className="pt-2 mt-2 border-t border-blue-200">
                    <div className="flex justify-between">
                      <span className="text-blue-700 font-medium">New Balance:</span>
                      <span className="font-semibold text-blue-900">
                        {formatCurrency(calculateNewBalance())}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Warning for large payments */}
            {paymentAmount && parseFloat(paymentAmount) > debt.current_balance * 0.5 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-800">
                  This is a large payment. Please double-check the amount before confirming.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                disabled={loading}
              >
                {loading ? 'Recording...' : 'Record Payment'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
