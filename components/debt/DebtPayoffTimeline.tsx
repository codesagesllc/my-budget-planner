'use client';

import { AIDebtStrategy, Debt } from '@/types/debt';
import { Calendar, TrendingDown, Clock, DollarSign } from 'lucide-react';

interface DebtPayoffTimelineProps {
  strategy: AIDebtStrategy;
  debts: Debt[];
}

export function DebtPayoffTimeline({ strategy, debts }: DebtPayoffTimelineProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate timeline data
  const timelineData = strategy.debt_order.map(priority => {
    const debt = debts.find(d => d.id === priority.debt_id);
    if (!debt) return null;

    const payoffDate = new Date(priority.projected_payoff);
    const today = new Date();
    const monthsToPayoff = Math.ceil(
      (payoffDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30)
    );

    return {
      debt,
      priority,
      monthsToPayoff,
      payoffDate,
      totalPayment: priority.monthly_payment + priority.extra_payment,
    };
  }).filter(Boolean);

  // Find the longest timeline for scaling
  const maxMonths = Math.max(...timelineData.map(d => d!.monthsToPayoff));

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Debt Payoff Timeline</h2>
        <p className="text-gray-600">
          Visualize your journey to becoming debt-free with {strategy.strategy_name}
        </p>
      </div>

      {/* Strategy Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <DollarSign className="h-5 w-5 text-blue-600 mr-2" />
            <span className="text-sm font-medium text-blue-900">Interest Saved</span>
          </div>
          <p className="text-2xl font-bold text-blue-700">
            {formatCurrency(strategy.total_interest_saved)}
          </p>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <Clock className="h-5 w-5 text-green-600 mr-2" />
            <span className="text-sm font-medium text-green-900">Time Saved</span>
          </div>
          <p className="text-2xl font-bold text-green-700">
            {strategy.months_reduced} months
          </p>
        </div>

        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <TrendingDown className="h-5 w-5 text-purple-600 mr-2" />
            <span className="text-sm font-medium text-purple-900">Risk Score</span>
          </div>
          <p className="text-2xl font-bold text-purple-700">
            {strategy.risk_score}/100
          </p>
        </div>

        <div className="bg-yellow-50 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <Calendar className="h-5 w-5 text-yellow-600 mr-2" />
            <span className="text-sm font-medium text-yellow-900">Debt Free</span>
          </div>
          <p className="text-xl font-bold text-yellow-700">
            {formatDate(timelineData[timelineData.length - 1]?.payoffDate.toISOString() || '')}
          </p>
        </div>
      </div>

      {/* Timeline Visualization */}
      <div className="space-y-4">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Today</span>
          <span>{maxMonths} months</span>
        </div>

        {timelineData.map((item, index) => {
          if (!item) return null;
          const progressWidth = (item.monthsToPayoff / maxMonths) * 100;

          return (
            <div key={item.debt.id} className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <span className="font-semibold text-gray-900">
                        {item.debt.creditor_name}
                      </span>
                      <span className="ml-2 text-sm text-gray-600">
                        Priority #{item.priority.priority}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium">
                        {formatCurrency(item.totalPayment)}/mo
                      </span>
                      {item.priority.extra_payment > 0 && (
                        <span className="ml-2 text-xs text-green-600">
                          (+{formatCurrency(item.priority.extra_payment)} extra)
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="relative">
                    <div className="w-full bg-gray-200 rounded-full h-8">
                      <div
                        className={`h-8 rounded-full flex items-center justify-end pr-2 transition-all duration-500 ${
                          index === 0 ? 'bg-green-500' : 
                          index === 1 ? 'bg-blue-500' : 
                          index === 2 ? 'bg-purple-500' : 
                          'bg-gray-400'
                        }`}
                        style={{ width: `${progressWidth}%` }}
                      >
                        <span className="text-xs text-white font-medium">
                          {item.monthsToPayoff} mo
                        </span>
                      </div>
                    </div>
                    
                    {/* Milestone markers */}
                    <div className="absolute top-0 left-0 w-full h-8 flex items-center">
                      {[25, 50, 75].map(percent => (
                        <div
                          key={percent}
                          className="absolute h-8 border-l border-gray-400 border-dashed"
                          style={{ left: `${percent}%` }}
                        />
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>{item.priority.reasoning}</span>
                    <span>Payoff: {formatDate(item.payoffDate.toISOString())}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Methodology Explanation */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-gray-900 mb-2">Strategy Methodology</h3>
        <p className="text-sm text-gray-600">{strategy.methodology}</p>
      </div>

      {/* Recommendations */}
      {strategy.recommendations.length > 0 && (
        <div className="mt-6">
          <h3 className="font-semibold text-gray-900 mb-3">AI Recommendations</h3>
          <div className="space-y-2">
            {strategy.recommendations.map((rec, index) => (
              <div key={index} className="flex items-start p-3 bg-blue-50 rounded-lg">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-semibold">
                  {index + 1}
                </span>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-blue-900">{rec.action}</p>
                  <div className="flex items-center mt-1 space-x-4">
                    <span className="text-xs text-blue-700">
                      Impact: {formatCurrency(rec.impact)}
                    </span>
                    <span className="text-xs text-blue-700">
                      Effort: {rec.effort}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
