import { NextRequest, NextResponse } from 'next/server';
import { createServerActionClient } from '@/lib/supabase/server';
import { DebtCalculationService } from '@/lib/services/debtService';
import { DebtAIService } from '@/lib/services/debtAIService';

const calculationService = new DebtCalculationService();
const aiService = new DebtAIService();

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerActionClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { debts, monthlyIncome, monthlyExpenses, emergencyFund, strategyType } = body;

    // Analyze financial situation
    const financialSnapshot = await aiService.analyzeFinancialSituation(
      user.id,
      debts,
      monthlyIncome,
      monthlyExpenses,
      emergencyFund
    );

    let strategy;
    
    if (strategyType === 'ai_optimized') {
      // Generate AI-optimized strategy
      strategy = await aiService.generateOptimalStrategy(debts, financialSnapshot);
    } else if (strategyType === 'avalanche') {
      // Generate avalanche strategy
      const debtOrder = calculationService.generateAvalancheStrategy(
        debts,
        financialSnapshot.available_for_debt
      );
      strategy = {
        strategy_name: 'Avalanche Strategy',
        methodology: 'Pay highest interest rate debts first to minimize total interest paid',
        debt_order: debtOrder,
        total_interest_saved: 0, // Calculate based on comparison
        months_reduced: 0,
        cash_flow_impact: financialSnapshot.available_for_debt,
        risk_score: 30,
        recommendations: [],
        adjustment_triggers: {
          income_change: 10,
          expense_change: 15,
          time_interval: 30,
        },
      };
    } else if (strategyType === 'snowball') {
      // Generate snowball strategy
      const debtOrder = calculationService.generateSnowballStrategy(
        debts,
        financialSnapshot.available_for_debt
      );
      strategy = {
        strategy_name: 'Snowball Strategy',
        methodology: 'Pay smallest balance debts first for psychological wins and momentum',
        debt_order: debtOrder,
        total_interest_saved: 0,
        months_reduced: 0,
        cash_flow_impact: financialSnapshot.available_for_debt,
        risk_score: 35,
        recommendations: [],
        adjustment_triggers: {
          income_change: 10,
          expense_change: 15,
          time_interval: 30,
        },
      };
    } else {
      // Default to AI strategy
      strategy = await aiService.generateOptimalStrategy(debts, financialSnapshot);
    }

    // Generate insights
    const insight = await aiService.generateInsight(user.id, debts, strategy, 'general');

    return NextResponse.json({
      financialSnapshot,
      strategy,
      insight,
    });
  } catch (error) {
    console.error('Error generating strategy:', error);
    return NextResponse.json(
      { error: 'Failed to generate strategy' },
      { status: 500 }
    );
  }
}
