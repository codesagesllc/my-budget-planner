import { Anthropic } from '@anthropic-ai/sdk';
import {
  Debt,
  DebtStrategy,
  FinancialSnapshot,
  AIDebtStrategy,
  DebtPriority,
  AIRecommendation,
  ScenarioSimulation,
  SimulationAssumptions,
  SimulationOutcomes,
  DebtAIAnalysis,
} from '@/types/debt';
import { DebtCalculationService } from './debtService';

export class DebtAIService {
  private anthropic: Anthropic;
  private calculationService: DebtCalculationService;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });
    this.calculationService = new DebtCalculationService();
  }

  // Analyze complete financial situation
  async analyzeFinancialSituation(
    userId: string,
    debts: Debt[],
    monthlyIncome: number,
    monthlyExpenses: number,
    emergencyFund: number = 0
  ): Promise<FinancialSnapshot> {
    const totalDebt = debts.reduce((sum, debt) => sum + debt.current_balance, 0);
    const totalMinimumPayments = debts.reduce((sum, debt) => sum + (debt.minimum_payment || 0), 0);
    const availableForDebt = Math.max(0, monthlyIncome - monthlyExpenses - totalMinimumPayments);
    
    // Calculate weighted average interest
    const weightedInterest = totalDebt > 0
      ? debts.reduce((sum, debt) => {
          const weight = debt.current_balance / totalDebt;
          return sum + ((debt.interest_rate || 0) * weight);
        }, 0)
      : 0;

    return {
      monthly_income: monthlyIncome,
      monthly_expenses: monthlyExpenses,
      available_for_debt: availableForDebt,
      emergency_fund: emergencyFund,
      debt_to_income_ratio: monthlyIncome > 0 ? (totalMinimumPayments / monthlyIncome) * 100 : 0,
      total_debt: totalDebt,
      weighted_avg_interest: weightedInterest,
    };
  }

  // Generate optimal AI strategy
  async generateOptimalStrategy(
    debts: Debt[],
    financialSnapshot: FinancialSnapshot
  ): Promise<AIDebtStrategy> {
    const prompt = `
      Analyze this debt portfolio and create an optimal repayment strategy:
      
      Financial Snapshot:
      - Monthly Income: $${financialSnapshot.monthly_income}
      - Monthly Expenses: $${financialSnapshot.monthly_expenses}
      - Available for Extra Debt Payment: $${financialSnapshot.available_for_debt}
      - Emergency Fund: $${financialSnapshot.emergency_fund}
      - Total Debt: $${financialSnapshot.total_debt}
      - Weighted Average Interest: ${financialSnapshot.weighted_avg_interest.toFixed(2)}%
      - Debt-to-Income Ratio: ${financialSnapshot.debt_to_income_ratio.toFixed(1)}%
      
      Debts:
      ${debts.map(debt => `
        - ${debt.creditor_name} (${debt.debt_type}):
          Balance: $${debt.current_balance}
          Interest Rate: ${debt.interest_rate}%
          Minimum Payment: $${debt.minimum_payment}
      `).join('')}
      
      Consider:
      1. Mathematical optimization (interest savings vs psychological wins)
      2. Cash flow stability and emergency fund adequacy
      3. Risk factors (income stability, unexpected expenses)
      4. Behavioral factors (motivation, stress reduction)
      
      Provide a comprehensive strategy in JSON format with:
      - methodology: string explaining the approach
      - debt_order: array of debt priorities with reasoning
      - recommended monthly extra payment amount
      - risk assessment (0-100 scale)
      - top 3 actionable recommendations
    `;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      // Parse the AI response
      const content = response.content[0].type === 'text' ? response.content[0].text : '';
      const strategy = this.parseAIResponse(content, debts, financialSnapshot);
      
      return strategy;
    } catch (error) {
      console.error('AI Strategy Generation Error:', error);
      // Fallback to hybrid approach
      return this.generateHybridStrategy(debts, financialSnapshot);
    }
  }

  // Parse AI response into structured strategy
  private parseAIResponse(
    aiResponse: string,
    debts: Debt[],
    snapshot: FinancialSnapshot
  ): AIDebtStrategy {
    // Try to extract JSON from the response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    let parsedResponse: any = {};
    
    if (jsonMatch) {
      try {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.error('Failed to parse AI JSON response');
      }
    }

    // Build strategy from parsed response or defaults
    const strategy: AIDebtStrategy = {
      strategy_name: 'AI Optimized Strategy',
      methodology: parsedResponse.methodology || 'Balanced approach considering both mathematical optimization and psychological factors',
      debt_order: this.generateOptimalDebtOrder(debts, snapshot),
      total_interest_saved: 0,
      months_reduced: 0,
      cash_flow_impact: snapshot.available_for_debt,
      risk_score: parsedResponse.risk_score || this.calculateRiskScore(snapshot),
      recommendations: parsedResponse.recommendations || this.generateDefaultRecommendations(snapshot),
      adjustment_triggers: {
        income_change: 10,
        expense_change: 15,
        time_interval: 30,
      },
    };

    // Calculate interest savings
    const calculations = this.calculateStrategyOutcomes(debts, strategy.debt_order);
    strategy.total_interest_saved = calculations.interestSaved;
    strategy.months_reduced = calculations.monthsReduced;

    return strategy;
  }

  // Generate optimal debt order using multi-factor analysis
  private generateOptimalDebtOrder(
    debts: Debt[],
    snapshot: FinancialSnapshot
  ): DebtPriority[] {
    // Score each debt based on multiple factors
    const scoredDebts = debts.map(debt => {
      const interestScore = (debt.interest_rate || 0) / 30 * 40; // 40% weight on interest
      const balanceScore = (1 - debt.current_balance / snapshot.total_debt) * 30; // 30% weight on balance
      const payoffTimeScore = this.calculatePayoffTimeScore(debt) * 20; // 20% weight on quick wins
      const utilizationScore = this.calculateUtilizationScore(debt) * 10; // 10% weight on credit utilization
      
      const totalScore = interestScore + balanceScore + payoffTimeScore + utilizationScore;
      
      return { debt, score: totalScore };
    });

    // Sort by score (highest first)
    scoredDebts.sort((a, b) => b.score - a.score);

    // Generate debt priorities
    return scoredDebts.map((item, index) => {
      const extraPayment = index === 0 ? snapshot.available_for_debt : 0;
      const monthlyPayment = item.debt.minimum_payment || 0;
      const calc = this.calculationService.calculatePayoff(item.debt, monthlyPayment, extraPayment);
      
      const payoffDate = new Date();
      payoffDate.setMonth(payoffDate.getMonth() + calc.months_to_payoff);

      return {
        debt_id: item.debt.id,
        priority: index + 1,
        reasoning: this.generatePriorityReasoning(item.debt, item.score),
        monthly_payment: monthlyPayment,
        extra_payment: extraPayment,
        projected_payoff: payoffDate.toISOString(),
      };
    });
  }

  // Calculate payoff time score (favor debts that can be paid off quickly)
  private calculatePayoffTimeScore(debt: Debt): number {
    if (!debt.minimum_payment || debt.minimum_payment === 0) return 0;
    const monthsToPayoff = debt.current_balance / debt.minimum_payment;
    if (monthsToPayoff <= 6) return 100;
    if (monthsToPayoff <= 12) return 80;
    if (monthsToPayoff <= 24) return 60;
    if (monthsToPayoff <= 36) return 40;
    return 20;
  }

  // Calculate credit utilization score (for credit cards)
  private calculateUtilizationScore(debt: Debt): number {
    if (debt.debt_type !== 'credit_card' || !debt.credit_limit) return 50;
    const utilization = debt.current_balance / debt.credit_limit;
    if (utilization > 0.7) return 100; // High priority to reduce
    if (utilization > 0.5) return 80;
    if (utilization > 0.3) return 60;
    return 40;
  }

  // Generate reasoning for debt priority
  private generatePriorityReasoning(debt: Debt, score: number): string {
    const reasons = [];
    
    if (debt.interest_rate && debt.interest_rate > 20) {
      reasons.push(`High interest rate (${debt.interest_rate}%)`);
    }
    
    if (debt.current_balance < 1000) {
      reasons.push('Quick win opportunity');
    }
    
    if (debt.debt_type === 'credit_card' && debt.credit_limit) {
      const utilization = debt.current_balance / debt.credit_limit;
      if (utilization > 0.7) {
        reasons.push('High credit utilization');
      }
    }
    
    reasons.push(`Optimization score: ${score.toFixed(1)}`);
    
    return reasons.join(', ');
  }

  // Calculate strategy outcomes
  private calculateStrategyOutcomes(
    debts: Debt[],
    debtOrder: DebtPriority[]
  ): { interestSaved: number; monthsReduced: number } {
    let totalInterestSaved = 0;
    let totalMonthsReduced = 0;

    debtOrder.forEach(priority => {
      const debt = debts.find(d => d.id === priority.debt_id);
      if (!debt) return;

      const baseCalc = this.calculationService.calculatePayoff(
        debt,
        debt.minimum_payment || 0
      );
      const optimizedCalc = this.calculationService.calculatePayoff(
        debt,
        priority.monthly_payment,
        priority.extra_payment
      );

      totalInterestSaved += baseCalc.total_interest - optimizedCalc.total_interest;
      totalMonthsReduced += baseCalc.months_to_payoff - optimizedCalc.months_to_payoff;
    });

    return {
      interestSaved: totalInterestSaved,
      monthsReduced: totalMonthsReduced,
    };
  }

  // Calculate risk score
  private calculateRiskScore(snapshot: FinancialSnapshot): number {
    let riskScore = 0;

    // Debt-to-income ratio risk
    if (snapshot.debt_to_income_ratio > 40) riskScore += 30;
    else if (snapshot.debt_to_income_ratio > 30) riskScore += 20;
    else if (snapshot.debt_to_income_ratio > 20) riskScore += 10;

    // Emergency fund risk
    const monthsOfExpenses = snapshot.emergency_fund / (snapshot.monthly_expenses || 1);
    if (monthsOfExpenses < 1) riskScore += 30;
    else if (monthsOfExpenses < 3) riskScore += 20;
    else if (monthsOfExpenses < 6) riskScore += 10;

    // Cash flow risk
    if (snapshot.available_for_debt < 100) riskScore += 20;
    else if (snapshot.available_for_debt < 200) riskScore += 10;

    // High interest debt risk
    if (snapshot.weighted_avg_interest > 20) riskScore += 20;
    else if (snapshot.weighted_avg_interest > 15) riskScore += 10;

    return Math.min(100, riskScore);
  }

  // Generate default recommendations
  private generateDefaultRecommendations(snapshot: FinancialSnapshot): AIRecommendation[] {
    const recommendations: AIRecommendation[] = [];

    // Emergency fund recommendation
    const monthsOfExpenses = snapshot.emergency_fund / (snapshot.monthly_expenses || 1);
    if (monthsOfExpenses < 3) {
      recommendations.push({
        type: 'expense',
        action: 'Build emergency fund to 3 months of expenses before aggressive debt payoff',
        impact: snapshot.monthly_expenses * 3 - snapshot.emergency_fund,
        effort: 'medium',
        priority: 1,
      });
    }

    // High interest debt consolidation
    if (snapshot.weighted_avg_interest > 18) {
      recommendations.push({
        type: 'consolidation',
        action: 'Consider debt consolidation loan or balance transfer to reduce interest rates',
        impact: snapshot.total_debt * (snapshot.weighted_avg_interest - 10) / 100 / 12 * 24, // 2 year savings estimate
        effort: 'medium',
        priority: 2,
      });
    }

    // Income increase recommendation
    if (snapshot.debt_to_income_ratio > 30) {
      recommendations.push({
        type: 'income',
        action: 'Explore side income opportunities to accelerate debt payoff',
        impact: snapshot.monthly_income * 0.2 * 12, // 20% income increase estimate
        effort: 'high',
        priority: 3,
      });
    }

    // Expense reduction
    if (snapshot.available_for_debt < 200) {
      recommendations.push({
        type: 'expense',
        action: 'Review and reduce monthly expenses to free up more for debt payments',
        impact: snapshot.monthly_expenses * 0.1 * 12, // 10% expense reduction estimate
        effort: 'low',
        priority: 2,
      });
    }

    return recommendations.slice(0, 3); // Return top 3 recommendations
  }

  // Generate hybrid strategy (fallback)
  private generateHybridStrategy(
    debts: Debt[],
    snapshot: FinancialSnapshot
  ): AIDebtStrategy {
    // Combine avalanche and snowball approaches
    const avalanchePriorities = this.calculationService.generateAvalancheStrategy(debts, snapshot.available_for_debt);
    const snowballPriorities = this.calculationService.generateSnowballStrategy(debts, snapshot.available_for_debt);

    // Use avalanche for high-interest debts, snowball for small balances
    const hybridOrder = this.generateOptimalDebtOrder(debts, snapshot);

    const calculations = this.calculateStrategyOutcomes(debts, hybridOrder);

    return {
      strategy_name: 'Hybrid Optimization Strategy',
      methodology: 'Combines mathematical optimization with psychological quick wins for sustainable debt reduction',
      debt_order: hybridOrder,
      total_interest_saved: calculations.interestSaved,
      months_reduced: calculations.monthsReduced,
      cash_flow_impact: snapshot.available_for_debt,
      risk_score: this.calculateRiskScore(snapshot),
      recommendations: this.generateDefaultRecommendations(snapshot),
      adjustment_triggers: {
        income_change: 10,
        expense_change: 15,
        time_interval: 30,
      },
    };
  }

  // Simulate scenarios
  async simulateScenarios(
    debts: Debt[],
    baseStrategy: AIDebtStrategy,
    assumptions: SimulationAssumptions[]
  ): Promise<ScenarioSimulation[]> {
    const simulations: ScenarioSimulation[] = [];

    for (const assumption of assumptions) {
      const adjustedDebts = this.adjustDebtsForSimulation(debts, assumption);
      const outcomes = this.calculateSimulationOutcomes(adjustedDebts, baseStrategy, assumption);
      
      simulations.push({
        name: this.generateScenarioName(assumption),
        assumptions: assumption,
        outcomes,
      });
    }

    return simulations;
  }

  // Adjust debts for simulation
  private adjustDebtsForSimulation(
    debts: Debt[],
    assumptions: SimulationAssumptions
  ): Debt[] {
    return debts.map(debt => ({
      ...debt,
      interest_rate: debt.interest_rate 
        ? debt.interest_rate + (assumptions.interest_rate_change || 0)
        : debt.interest_rate,
    }));
  }

  // Calculate simulation outcomes
  private calculateSimulationOutcomes(
    debts: Debt[],
    strategy: AIDebtStrategy,
    assumptions: SimulationAssumptions
  ): SimulationOutcomes {
    let totalPaid = 0;
    let totalInterest = 0;
    let maxMonths = 0;
    const monthlyPayments: number[] = [];

    strategy.debt_order.forEach(priority => {
      const debt = debts.find(d => d.id === priority.debt_id);
      if (!debt) return;

      const adjustedPayment = priority.monthly_payment * (1 + (assumptions.income_change || 0) / 100);
      const adjustedExtra = (priority.extra_payment + assumptions.monthly_extra_payment) * 
        (1 + (assumptions.income_change || 0) / 100);

      const calc = this.calculationService.calculatePayoff(debt, adjustedPayment, adjustedExtra);
      
      totalPaid += calc.total_amount;
      totalInterest += calc.total_interest;
      maxMonths = Math.max(maxMonths, calc.months_to_payoff);
      monthlyPayments.push(adjustedPayment + adjustedExtra);
    });

    const debtFreeDate = new Date();
    debtFreeDate.setMonth(debtFreeDate.getMonth() + maxMonths);

    // Calculate success probability based on assumptions
    let successProbability = 100;
    if (assumptions.income_change && assumptions.income_change < -10) successProbability -= 20;
    if (assumptions.expense_change && assumptions.expense_change > 10) successProbability -= 15;
    if (assumptions.unexpected_expenses && assumptions.unexpected_expenses.length > 0) {
      successProbability -= assumptions.unexpected_expenses.length * 5;
    }

    return {
      debt_free_date: debtFreeDate.toISOString(),
      total_interest_paid: totalInterest,
      total_amount_paid: totalPaid,
      monthly_payment_range: [
        Math.min(...monthlyPayments),
        Math.max(...monthlyPayments),
      ],
      success_probability: Math.max(0, successProbability),
    };
  }

  // Generate scenario name
  private generateScenarioName(assumptions: SimulationAssumptions): string {
    const parts = [];
    
    if (assumptions.income_change) {
      parts.push(assumptions.income_change > 0 ? 'Income Increase' : 'Income Decrease');
    }
    
    if (assumptions.monthly_extra_payment) {
      parts.push('Extra Payments');
    }
    
    if (assumptions.unexpected_expenses && assumptions.unexpected_expenses.length > 0) {
      parts.push('With Emergencies');
    }
    
    return parts.length > 0 ? parts.join(' + ') : 'Base Scenario';
  }

  // Generate natural language insights
  async generateInsight(
    userId: string,
    debts: Debt[],
    strategy: AIDebtStrategy,
    context: string = 'general'
  ): Promise<string> {
    const insights = {
      general: this.generateGeneralInsight(debts, strategy),
      weekly: this.generateWeeklyInsight(debts, strategy),
      monthly: this.generateMonthlyInsight(debts, strategy),
      motivation: this.generateMotivationalInsight(debts, strategy),
    };

    return insights[context as keyof typeof insights] || insights.general;
  }

  private generateGeneralInsight(debts: Debt[], strategy: AIDebtStrategy): string {
    const totalDebt = debts.reduce((sum, debt) => sum + debt.current_balance, 0);
    const monthsToFreedom = Math.max(...strategy.debt_order.map(d => {
      const date = new Date(d.projected_payoff);
      const now = new Date();
      return Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30));
    }));

    return `💡 Based on your current strategy, you'll be debt-free in ${monthsToFreedom} months, ` +
      `saving $${strategy.total_interest_saved.toFixed(0)} in interest. ` +
      `Focus on ${strategy.debt_order[0].reasoning.split(',')[0]} first for optimal results.`;
  }

  private generateWeeklyInsight(debts: Debt[], strategy: AIDebtStrategy): string {
    const weeklyExtra = strategy.cash_flow_impact / 4;
    return `📊 This week, allocating $${weeklyExtra.toFixed(0)} extra toward your highest-priority debt ` +
      `moves you ${(7 / 30 * strategy.months_reduced).toFixed(1)} days closer to freedom. Every payment counts!`;
  }

  private generateMonthlyInsight(debts: Debt[], strategy: AIDebtStrategy): string {
    const nextDebtToClear = strategy.debt_order.find(d => {
      const debt = debts.find(debt => debt.id === d.debt_id);
      return debt && debt.current_balance < 1000;
    });

    if (nextDebtToClear) {
      const debt = debts.find(d => d.id === nextDebtToClear.debt_id);
      return `🎯 You're close to eliminating ${debt?.creditor_name}! ` +
        `Just ${Math.ceil(debt!.current_balance / (nextDebtToClear.monthly_payment + nextDebtToClear.extra_payment))} ` +
        `more payments and you'll free up $${nextDebtToClear.monthly_payment} monthly.`;
    }

    return `📈 Great progress! You've optimized your strategy to save $${(strategy.total_interest_saved / 12).toFixed(0)} ` +
      `per month in unnecessary interest. Keep going!`;
  }

  private generateMotivationalInsight(debts: Debt[], strategy: AIDebtStrategy): string {
    const messages = [
      `🚀 Your optimized strategy beats minimum payments by ${strategy.months_reduced} months!`,
      `💪 Every extra dollar today saves $${(strategy.total_interest_saved / strategy.cash_flow_impact).toFixed(2)} in interest.`,
      `⭐ You're in the top 20% of people actively managing their debt. Keep it up!`,
      `🏆 ${strategy.months_reduced} months faster to financial freedom with your current plan!`,
    ];

    return messages[Math.floor(Math.random() * messages.length)];
  }
}
