'use client';

import { useState, useEffect } from 'react';
import { Debt } from '@/types/debt';
import { X, Trash2, Calendar, DollarSign, TrendingDown, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface PaymentHistoryModalProps {
  debt: Debt;
  onClose: () => void;
  onPaymentDeleted: (debtId: string) => void;
}

interface DebtPayment {
  id: string;
  debt_id: string;
  user_id: string;
  payment_date: string;
  amount: number;
  principal_amount?: number;
  interest_amount?: number;
  remaining_balance?: number;
  notes?: string;
  is_extra_payment: boolean;
  created_at: string;
}

export function PaymentHistoryModal({ debt, onClose, onPaymentDeleted }: PaymentHistoryModalProps) {
  const [payments, setPayments] = useState<DebtPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPayments();
  }, [debt.id]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/debt-payments?debt_id=${debt.id}`);
      if (!response.ok) throw new Error('Failed to fetch payments');
      
      const data = await response.json();
      setPayments(data);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('Failed to load payment history');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePayment = async (payment: DebtPayment) => {
    if (!confirm(`Are you sure you want to delete this payment of ${formatCurrency(payment.amount)}? The debt balance will be restored.`)) {
      return;
    }

    setDeletingId(payment.id);
    
    try {
      const response = await fetch(`/api/debt-payments?id=${payment.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete payment');

      // Calculate what the balance should be after removing this payment
      // Add the payment amount back to the remaining balance that was recorded
      const restoredBalance = (payment.remaining_balance || 0) + payment.amount;

      // Update the debt's balance
      const updateResponse = await fetch(`/api/debts?id=${debt.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          current_balance: restoredBalance 
        }),
      });

      if (!updateResponse.ok) {
        console.error('Failed to update debt balance');
      }

      // Remove from local state
      setPayments(payments.filter(p => p.id !== payment.id));
      
      toast.success('Payment deleted and balance restored');
      
      // Notify parent to refresh
      onPaymentDeleted(debt.id);
    } catch (error) {
      console.error('Error deleting payment:', error);
      toast.error('Failed to delete payment');
    } finally {
      setDeletingId(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalPrincipal = payments.reduce((sum, p) => sum + (p.principal_amount || 0), 0);
  const totalInterest = payments.reduce((sum, p) => sum + (p.interest_amount || 0), 0);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Payment History</h2>
              <p className="text-sm text-black dark:text-white mt-1">{debt.creditor_name}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-black dark:text-white" />
            </button>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-black dark:text-white">Total Paid</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatCurrency(totalPaid)}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-black dark:text-white">Principal Paid</p>
              <p className="text-lg font-semibold text-green-600">
                {formatCurrency(totalPrincipal)}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-black dark:text-white">Interest Paid</p>
              <p className="text-lg font-semibold text-orange-600">
                {formatCurrency(totalInterest)}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-black dark:text-white">Current Balance</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatCurrency(debt.current_balance)}
              </p>
            </div>
          </div>

          {/* Payments List */}
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="text-black dark:text-white mt-2">Loading payments...</p>
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <DollarSign className="h-12 w-12 text-black dark:text-white mx-auto mb-3" />
              <p className="text-black dark:text-white">No payments recorded yet</p>
              <p className="text-sm text-black dark:text-white mt-1">
                Click "Record Payment" to add your first payment
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900">Payments ({payments.length})</h3>
                <div className="flex items-center gap-2 text-xs text-orange-600">
                  <AlertCircle className="h-4 w-4" />
                  <span>Click trash icon to delete a payment</span>
                </div>
              </div>
              
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-black dark:text-white" />
                          <span className="font-medium text-gray-900">
                            {formatDate(payment.payment_date)}
                          </span>
                        </div>
                        {payment.is_extra_payment && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                            Extra Payment
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-black dark:text-white">Amount</p>
                          <p className="font-semibold text-gray-900">
                            {formatCurrency(payment.amount)}
                          </p>
                        </div>
                        
                        {payment.principal_amount !== undefined && (
                          <div>
                            <p className="text-xs text-black dark:text-white">Principal</p>
                            <p className="font-medium text-green-600">
                              {formatCurrency(payment.principal_amount)}
                            </p>
                          </div>
                        )}
                        
                        {payment.interest_amount !== undefined && (
                          <div>
                            <p className="text-xs text-black dark:text-white">Interest</p>
                            <p className="font-medium text-orange-600">
                              {formatCurrency(payment.interest_amount)}
                            </p>
                          </div>
                        )}
                        
                        {payment.remaining_balance !== undefined && (
                          <div>
                            <p className="text-xs text-black dark:text-white">Balance After</p>
                            <p className="font-medium text-gray-700">
                              {formatCurrency(payment.remaining_balance)}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      {payment.notes && (
                        <p className="text-sm text-black dark:text-white mt-2 italic">
                          Note: {payment.notes}
                        </p>
                      )}
                    </div>
                    
                    <button
                      onClick={() => handleDeletePayment(payment)}
                      disabled={deletingId === payment.id}
                      className="ml-4 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Delete this payment"
                    >
                      {deletingId === payment.id ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-500"></div>
                      ) : (
                        <Trash2 className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Close Button */}
          <div className="mt-6 pt-6 border-t">
            <Button
              onClick={onClose}
              variant="outline"
              className="w-full"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
