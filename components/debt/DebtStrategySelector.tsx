'use client';

import { useState } from 'react';
import { Debt, AIDebtStrategy, FinancialSnapshot, StrategyType } from '@/types/debt';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { 
  Brain, 
  TrendingUp, 
  Snowflake, 
  Zap,
  DollarSign,
  Loader2,
  Info
} from 'lucide-react';
import { toast } from 'sonner';

interface DebtStrategySelectorProps {
  debts: Debt[];
  onStrategyGenerated: (strategy: AIDebtStrategy, snapshot: FinancialSnapshot) => void;
}

export function DebtStrategySelector({ debts, onStrategyGenerated }: DebtStrategySelectorProps) {
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyType>('ai_optimized');
  const [financialInfo, setFinancialInfo] = useState({
    monthlyIncome: '',
    monthlyExpenses: '',
    emergencyFund: '',
  });
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const strategies = [
    {
      id: 'ai_optimized',
      name: 'AI Optimized',
      description: 'Uses machine learning to create the perfect balance of math and psychology',
      icon: Brain,
      color: 'bg-purple-500',
      badge: 'Recommended',
    },
    {
      id: 'avalanche',
      name: 'Avalanche',
      description: 'Pay highest interest rate first to minimize total interest paid',
      icon: TrendingUp,
      color: 'bg-red-500',
      badge: 'Most Savings',
    },
    {
      id: 'snowball',
      name: 'Snowball',
      description: 'Pay smallest balance first for quick wins and momentum',
      icon: Snowflake,
      color: 'bg-blue-500',
      badge: 'Quick Wins',
    },
    {
      id: 'hybrid',
      name: 'Hybrid',
      description: 'Combines avalanche and snowball for optimal results',
      icon: Zap,
      color: 'bg-yellow-500',
      badge: 'Balanced',
    },
  ];

  const handleGenerateStrategy = async () => {
    // Validate inputs
    if (!financialInfo.monthlyIncome || !financialInfo.monthlyExpenses) {
      toast.error('Please enter your monthly income and expenses');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/debts/strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          debts,
          monthlyIncome: parseFloat(financialInfo.monthlyIncome),
          monthlyExpenses: parseFloat(financialInfo.monthlyExpenses),
          emergencyFund: parseFloat(financialInfo.emergencyFund) || 0,
          strategyType: selectedStrategy,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate strategy');

      const data = await response.json();
      onStrategyGenerated(data.strategy, data.financialSnapshot);
      
      // Show AI insight
      if (data.insight) {
        toast.success(data.insight);
      }
      
      setShowForm(false);
    } catch (error) {
      console.error('Error generating strategy:', error);
      toast.error('Failed to generate strategy');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: string) => {
    const num = parseFloat(amount) || 0;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num);
  };

  if (!showForm) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Payoff Strategy</h2>
          <p className="text-gray-600">
            Select a strategy that aligns with your financial goals and personality
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {strategies.map((strategy) => {
            const Icon = strategy.icon;
            const isSelected = selectedStrategy === strategy.id;

            return (
              <button
                key={strategy.id}
                onClick={() => setSelectedStrategy(strategy.id as StrategyType)}
                className={`relative p-4 rounded-lg border-2 transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {strategy.badge && (
                  <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                    {strategy.badge}
                  </span>
                )}
                
                <div className={`${strategy.color} text-white p-3 rounded-lg w-fit mx-auto mb-3`}>
                  <Icon className="h-6 w-6" />
                </div>
                
                <h3 className="font-semibold text-gray-900 mb-1">{strategy.name}</h3>
                <p className="text-xs text-gray-600">{strategy.description}</p>
              </button>
            );
          })}
        </div>

        <div className="flex justify-center">
          <Button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Continue with {strategies.find(s => s.id === selectedStrategy)?.name}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Financial Information</h2>
        <p className="text-gray-600">
          Enter your financial details to generate an optimized strategy
        </p>
      </div>

      <div className="space-y-6">
        {/* Selected Strategy Display */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start">
          <Info className="h-5 w-5 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-blue-900">
              <span className="font-semibold">Selected Strategy:</span>{' '}
              {strategies.find(s => s.id === selectedStrategy)?.name}
            </p>
            <p className="text-xs text-blue-700 mt-1">
              {strategies.find(s => s.id === selectedStrategy)?.description}
            </p>
          </div>
        </div>

        {/* Financial Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Monthly Income *
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="number"
                value={financialInfo.monthlyIncome}
                onChange={(e) => setFinancialInfo(prev => ({ ...prev, monthlyIncome: e.target.value }))}
                placeholder="5000"
                className="pl-10"
                step="100"
                min="0"
              />
            </div>
            {financialInfo.monthlyIncome && (
              <p className="text-xs text-gray-500 mt-1">
                {formatCurrency(financialInfo.monthlyIncome)}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Monthly Expenses *
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="number"
                value={financialInfo.monthlyExpenses}
                onChange={(e) => setFinancialInfo(prev => ({ ...prev, monthlyExpenses: e.target.value }))}
                placeholder="3000"
                className="pl-10"
                step="100"
                min="0"
              />
            </div>
            {financialInfo.monthlyExpenses && (
              <p className="text-xs text-gray-500 mt-1">
                {formatCurrency(financialInfo.monthlyExpenses)}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Emergency Fund
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="number"
                value={financialInfo.emergencyFund}
                onChange={(e) => setFinancialInfo(prev => ({ ...prev, emergencyFund: e.target.value }))}
                placeholder="1000"
                className="pl-10"
                step="100"
                min="0"
              />
            </div>
            {financialInfo.emergencyFund && (
              <p className="text-xs text-gray-500 mt-1">
                {formatCurrency(financialInfo.emergencyFund)}
              </p>
            )}
          </div>
        </div>

        {/* Available for Debt Display */}
        {financialInfo.monthlyIncome && financialInfo.monthlyExpenses && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-green-900">
              Available for Extra Debt Payments
            </p>
            <p className="text-2xl font-bold text-green-700 mt-1">
              {formatCurrency(
                (parseFloat(financialInfo.monthlyIncome) - parseFloat(financialInfo.monthlyExpenses)).toString()
              )}
            </p>
            <p className="text-xs text-green-600 mt-1">
              After covering expenses, this amount can accelerate your debt payoff
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between pt-4 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={() => setShowForm(false)}
            disabled={loading}
          >
            Back
          </Button>
          
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={() => setSelectedStrategy('ai_optimized' as StrategyType)}
              disabled={loading}
            >
              Change Strategy
            </Button>
            
            <Button
              onClick={handleGenerateStrategy}
              disabled={loading || !financialInfo.monthlyIncome || !financialInfo.monthlyExpenses}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Strategy'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
