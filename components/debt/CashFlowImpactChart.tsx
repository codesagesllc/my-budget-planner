'use client';

import { FinancialSnapshot, Debt } from '@/types/debt';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface CashFlowImpactChartProps {
  snapshot: FinancialSnapshot;
  debts: Debt[];
}

export function CashFlowImpactChart({ snapshot, debts }: CashFlowImpactChartProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  // Prepare data for cash flow waterfall chart
  const cashFlowData = [
    {
      name: 'Income',
      value: snapshot.monthly_income,
      fill: '#10b981',
    },
    {
      name: 'Expenses',
      value: -snapshot.monthly_expenses,
      fill: '#ef4444',
    },
    {
      name: 'Debt Payments',
      value: -debts.reduce((sum, debt) => sum + (debt.minimum_payment || 0), 0),
      fill: '#f59e0b',
    },
    {
      name: 'Available',
      value: snapshot.available_for_debt,
      fill: '#3b82f6',
    },
  ];

  // Prepare data for debt allocation pie chart
  const debtAllocationData = debts.map(debt => ({
    name: debt.creditor_name,
    value: debt.minimum_payment || 0,
  }));

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  // Calculate percentages
  const expensePercentage = (snapshot.monthly_expenses / snapshot.monthly_income) * 100;
  const debtPercentage = (debts.reduce((sum, debt) => sum + (debt.minimum_payment || 0), 0) / snapshot.monthly_income) * 100;
  const availablePercentage = (snapshot.available_for_debt / snapshot.monthly_income) * 100;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Cash Flow Impact Analysis</h2>
        <p className="text-gray-600">
          Understanding how debt payments affect your monthly cash flow
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cash Flow Waterfall */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Cash Flow</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={cashFlowData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={formatCurrency} />
              <Tooltip formatter={(value: number) => formatCurrency(Math.abs(value))} />
              <Bar dataKey="value">
                {cashFlowData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          
          {/* Cash Flow Summary */}
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Monthly Income</span>
              <span className="font-semibold">{formatCurrency(snapshot.monthly_income)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Expenses</span>
              <span className="font-semibold text-red-600">
                -{formatCurrency(snapshot.monthly_expenses)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Debt Payments</span>
              <span className="font-semibold text-orange-600">
                -{formatCurrency(debts.reduce((sum, debt) => sum + (debt.minimum_payment || 0), 0))}
              </span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t">
              <span className="text-gray-600 font-semibold">Available for Extra Payments</span>
              <span className="font-bold text-green-600">
                {formatCurrency(snapshot.available_for_debt)}
              </span>
            </div>
          </div>
        </div>

        {/* Debt Payment Distribution */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Debt Payment Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={debtAllocationData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {debtAllocationData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
            </PieChart>
          </ResponsiveContainer>
          
          {/* Debt Payment Details */}
          <div className="mt-4 space-y-2">
            {debts.slice(0, 5).map((debt, index) => (
              <div key={debt.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <div
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-gray-600">{debt.creditor_name}</span>
                </div>
                <span className="font-semibold">{formatCurrency(debt.minimum_payment || 0)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Income Allocation Breakdown */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Income Allocation</h3>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Expenses</span>
              <span className="font-semibold">{expensePercentage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-red-500 h-3 rounded-full"
                style={{ width: `${expensePercentage}%` }}
              />
            </div>
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Debt Payments</span>
              <span className="font-semibold">{debtPercentage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-orange-500 h-3 rounded-full"
                style={{ width: `${debtPercentage}%` }}
              />
            </div>
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Available for Extra Payments</span>
              <span className="font-semibold">{availablePercentage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-green-500 h-3 rounded-full"
                style={{ width: `${availablePercentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Financial Health Indicators */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <p className="text-sm font-medium text-blue-900 mb-1">Debt-to-Income Ratio</p>
          <p className="text-2xl font-bold text-blue-700">
            {snapshot.debt_to_income_ratio.toFixed(1)}%
          </p>
          <p className="text-xs text-blue-600 mt-1">
            {snapshot.debt_to_income_ratio < 20 ? 'Excellent' :
             snapshot.debt_to_income_ratio < 30 ? 'Good' :
             snapshot.debt_to_income_ratio < 40 ? 'Fair' : 'High'}
          </p>
        </div>
        
        <div className="bg-green-50 rounded-lg p-4">
          <p className="text-sm font-medium text-green-900 mb-1">Emergency Fund</p>
          <p className="text-2xl font-bold text-green-700">
            {formatCurrency(snapshot.emergency_fund)}
          </p>
          <p className="text-xs text-green-600 mt-1">
            {(snapshot.emergency_fund / snapshot.monthly_expenses).toFixed(1)} months coverage
          </p>
        </div>
        
        <div className="bg-purple-50 rounded-lg p-4">
          <p className="text-sm font-medium text-purple-900 mb-1">Weighted Avg Interest</p>
          <p className="text-2xl font-bold text-purple-700">
            {snapshot.weighted_avg_interest.toFixed(2)}%
          </p>
          <p className="text-xs text-purple-600 mt-1">
            Across all debts
          </p>
        </div>
      </div>
    </div>
  );
}
