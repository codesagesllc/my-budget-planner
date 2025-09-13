'use client';

import { useState } from 'react';
import { Debt, DebtType } from '@/types/debt';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';

interface AddDebtModalProps {
  onClose: () => void;
  onAdd: (debt: Omit<Debt, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => void;
}

export function AddDebtModal({ onClose, onAdd }: AddDebtModalProps) {
  const [formData, setFormData] = useState({
    creditor_name: '',
    debt_type: 'credit_card' as DebtType,
    original_amount: '',
    current_balance: '',
    interest_rate: '',
    minimum_payment: '',
    due_date: '',
    credit_limit: '',
    loan_term_months: '',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const debtTypes: { value: DebtType; label: string }[] = [
    { value: 'credit_card', label: 'Credit Card' },
    { value: 'personal_loan', label: 'Personal Loan' },
    { value: 'student_loan', label: 'Student Loan' },
    { value: 'mortgage', label: 'Mortgage' },
    { value: 'auto_loan', label: 'Auto Loan' },
    { value: 'medical_debt', label: 'Medical Debt' },
    { value: 'business_loan', label: 'Business Loan' },
    { value: 'family_loan', label: 'Family/Friend Loan' },
    { value: 'other', label: 'Other' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    const newErrors: Record<string, string> = {};
    if (!formData.creditor_name) newErrors.creditor_name = 'Creditor name is required';
    if (!formData.current_balance) newErrors.current_balance = 'Current balance is required';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Convert string values to numbers where needed
    const debtData: Omit<Debt, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
      creditor_name: formData.creditor_name,
      debt_type: formData.debt_type,
      original_amount: formData.original_amount ? parseFloat(formData.original_amount) : undefined,
      current_balance: parseFloat(formData.current_balance),
      interest_rate: formData.interest_rate ? parseFloat(formData.interest_rate) : undefined,
      minimum_payment: formData.minimum_payment ? parseFloat(formData.minimum_payment) : undefined,
      due_date: formData.due_date ? parseInt(formData.due_date) : undefined,
      credit_limit: formData.credit_limit ? parseFloat(formData.credit_limit) : undefined,
      loan_term_months: formData.loan_term_months ? parseInt(formData.loan_term_months) : undefined,
      notes: formData.notes || undefined,
      categories: [],
      is_active: true,
    };

    onAdd(debtData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">Add New Debt</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Creditor Name *
                </label>
                <Input
                  name="creditor_name"
                  value={formData.creditor_name}
                  onChange={handleInputChange}
                  placeholder="e.g., Chase Bank"
                  className={errors.creditor_name ? 'border-red-500' : ''}
                />
                {errors.creditor_name && (
                  <p className="text-red-500 text-xs mt-1">{errors.creditor_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Debt Type *
                </label>
                <select
                  name="debt_type"
                  value={formData.debt_type}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {debtTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Balance Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Balance Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Balance *
                </label>
                <Input
                  type="number"
                  name="current_balance"
                  value={formData.current_balance}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className={errors.current_balance ? 'border-red-500' : ''}
                />
                {errors.current_balance && (
                  <p className="text-red-500 text-xs mt-1">{errors.current_balance}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Original Amount
                </label>
                <Input
                  type="number"
                  name="original_amount"
                  value={formData.original_amount}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                />
              </div>

              {formData.debt_type === 'credit_card' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Credit Limit
                  </label>
                  <Input
                    type="number"
                    name="credit_limit"
                    value={formData.credit_limit}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Payment Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Interest Rate (APR %)
                </label>
                <Input
                  type="number"
                  name="interest_rate"
                  value={formData.interest_rate}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  max="100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Payment
                </label>
                <Input
                  type="number"
                  name="minimum_payment"
                  value={formData.minimum_payment}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Due Date (Day of Month)
                </label>
                <Input
                  type="number"
                  name="due_date"
                  value={formData.due_date}
                  onChange={handleInputChange}
                  placeholder="15"
                  min="1"
                  max="31"
                />
              </div>

              {(formData.debt_type === 'personal_loan' || 
                formData.debt_type === 'auto_loan' || 
                formData.debt_type === 'mortgage') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Loan Term (Months)
                  </label>
                  <Input
                    type="number"
                    name="loan_term_months"
                    value={formData.loan_term_months}
                    onChange={handleInputChange}
                    placeholder="60"
                    min="1"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Any additional information..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Add Debt
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
