'use client';

import { useState, useEffect } from 'react';
import { Debt, DebtSummary, AIDebtStrategy, FinancialSnapshot } from '@/types/debt';
import { DebtDashboard } from './DebtDashboard';
import { DebtList } from './DebtList';
import { AddDebtModal } from './AddDebtModal';
import { DebtStrategySelector } from './DebtStrategySelector';
import { DebtPayoffTimeline } from './DebtPayoffTimeline';
import { CashFlowImpactChart } from './CashFlowImpactChart';
import { Button } from '@/components/ui';
import { toast } from 'sonner';

export function DebtManagement() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<AIDebtStrategy | null>(null);
  const [financialSnapshot, setFinancialSnapshot] = useState<FinancialSnapshot | null>(null);
  const [debtSummary, setDebtSummary] = useState<DebtSummary | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch debts on component mount
  useEffect(() => {
    fetchDebts();
  }, [refreshKey]);

  const fetchDebts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/debts');
      if (!response.ok) throw new Error('Failed to fetch debts');
      
      const data = await response.json();
      setDebts(data);
      
      // Calculate summary if we have debts
      if (data.length > 0) {
        calculateDebtSummary(data);
      }
    } catch (error) {
      console.error('Error fetching debts:', error);
      toast.error('Failed to load debts');
    } finally {
      setLoading(false);
    }
  };

  const calculateDebtSummary = (debtList: Debt[]) => {
    const totalDebt = debtList.reduce((sum, debt) => sum + debt.current_balance, 0);
    const totalMinimum = debtList.reduce((sum, debt) => sum + (debt.minimum_payment || 0), 0);
    const weightedInterest = debtList.reduce((sum, debt) => {
      const weight = debt.current_balance / totalDebt;
      return sum + ((debt.interest_rate || 0) * weight);
    }, 0);

    const summary: DebtSummary = {
      total_debt: totalDebt,
      total_minimum_payment: totalMinimum,
      average_interest_rate: debtList.reduce((sum, debt) => sum + (debt.interest_rate || 0), 0) / debtList.length,
      weighted_average_interest: weightedInterest,
      highest_interest_debt: debtList.reduce((highest, debt) => 
        (!highest || (debt.interest_rate || 0) > (highest.interest_rate || 0)) ? debt : highest, 
        null as Debt | null
      ),
      smallest_balance_debt: debtList.reduce((smallest, debt) => 
        (!smallest || debt.current_balance < smallest.current_balance) ? debt : smallest,
        null as Debt | null
      ),
      debt_to_income_ratio: 0, // Will be calculated with income data
      projected_payoff_date: new Date().toISOString(), // Will be calculated with strategy
      total_interest_to_pay: 0, // Will be calculated with strategy
    };

    setDebtSummary(summary);
  };

  const handleAddDebt = async (debtData: Omit<Debt, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      const response = await fetch('/api/debts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(debtData),
      });

      if (!response.ok) throw new Error('Failed to add debt');
      
      const newDebt = await response.json();
      setDebts([...debts, newDebt]);
      setShowAddModal(false);
      toast.success('Debt added successfully');
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Error adding debt:', error);
      toast.error('Failed to add debt');
    }
  };

  const handleUpdateDebt = async (debtId: string, updates: Partial<Debt>) => {
    try {
      const response = await fetch(`/api/debts?id=${debtId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error('Failed to update debt');
      
      const updatedDebt = await response.json();
      setDebts(debts.map(debt => debt.id === debtId ? updatedDebt : debt));
      toast.success('Debt updated successfully');
    } catch (error) {
      console.error('Error updating debt:', error);
      toast.error('Failed to update debt');
    }
  };

  const handleDeleteDebt = async (debtId: string) => {
    try {
      const response = await fetch(`/api/debts?id=${debtId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete debt');
      
      setDebts(debts.filter(debt => debt.id !== debtId));
      toast.success('Debt removed successfully');
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Error deleting debt:', error);
      toast.error('Failed to remove debt');
    }
  };

  const handleStrategyGeneration = async (strategy: AIDebtStrategy, snapshot: FinancialSnapshot) => {
    setSelectedStrategy(strategy);
    setFinancialSnapshot(snapshot);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Debt Management</h1>
          <p className="text-gray-600 mt-1">Track, manage, and eliminate your debts strategically</p>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          + Add Debt
        </Button>
      </div>

      {/* Dashboard Summary */}
      {debtSummary && (
        <DebtDashboard 
          summary={debtSummary}
          financialSnapshot={financialSnapshot}
        />
      )}

      {/* Strategy Selector */}
      {debts.length > 0 && (
        <DebtStrategySelector
          debts={debts}
          onStrategyGenerated={handleStrategyGeneration}
        />
      )}

      {/* Payoff Timeline */}
      {selectedStrategy && (
        <DebtPayoffTimeline
          strategy={selectedStrategy}
          debts={debts}
        />
      )}

      {/* Cash Flow Impact */}
      {financialSnapshot && (
        <CashFlowImpactChart
          snapshot={financialSnapshot}
          debts={debts}
        />
      )}

      {/* Debt List */}
      <DebtList
        debts={debts}
        loading={loading}
        onUpdate={handleUpdateDebt}
        onDelete={handleDeleteDebt}
      />

      {/* Add Debt Modal */}
      {showAddModal && (
        <AddDebtModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddDebt}
        />
      )}
    </div>
  );
}
