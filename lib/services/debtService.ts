import { createServerActionClient } from '@/lib/supabase/server';
import { 
  Debt, 
  DebtPayment, 
  DebtStrategy, 
  PayoffCalculation, 
  MonthlyPayment, 
  DebtSummary,
  CashFlowImpact,
  FinancialSnapshot,
  AIDebtStrategy,
  DebtPriority
} from '@/types/debt';

// Base service class following SOLID principles
export class DebtService {
  private async getSupabase() {
    return await createServerActionClient();
  }

  // CRUD Operations
  async getDebts(userId: string): Promise<Debt[]> {
    const supabase = await this.getSupabase();
    const { data, error } = await supabase
      .from('debts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('current_balance', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async createDebt(debt: Omit<Debt, 'id' | 'created_at' | 'updated_at'>): Promise<Debt> {
    const supabase = await this.getSupabase();
    const { data, error } = await supabase
      .from('debts')
      .insert(debt)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateDebt(id: string, updates: Partial<Debt>): Promise<Debt> {
    const supabase = await this.getSupabase();
    const { data, error } = await supabase
      .from('debts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteDebt(id: string): Promise<void> {
    const supabase = await this.getSupabase();
    const { error } = await supabase
      .from('debts')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;
  }

  // Payment Operations
  async recordPayment(payment: Omit<DebtPayment, 'id' | 'created_at'>): Promise<DebtPayment> {
    // Calculate principal and interest split
    const debt = await this.getDebtById(payment.debt_id);
    const interestAmount = this.calculateMonthlyInterest(debt.current_balance, debt.interest_rate || 0);
    const principalAmount = payment.amount - interestAmount;
    const remainingBalance = Math.max(0, debt.current_balance - principalAmount);

    const paymentData = {
      ...payment,
      interest_amount: interestAmount,
      principal_amount: principalAmount,
      remaining_balance: remainingBalance,
    };

    const supabase = await this.getSupabase();
    const { data, error } = await supabase
      .from('debt_payments')
      .insert(paymentData)
      .select()
      .single();

    if (error) throw error;

    // Update debt balance
    await this.updateDebt(payment.debt_id, { current_balance: remainingBalance });

    return data;
  }

  async getPaymentHistory(debtId: string): Promise<DebtPayment[]> {
    const supabase = await this.getSupabase();
    const { data, error } = await supabase
      .from('debt_payments')
      .select('*')
      .eq('debt_id', debtId)
      .order('payment_date', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // Strategy Operations
  async getStrategies(userId: string): Promise<DebtStrategy[]> {
    const supabase = await this.getSupabase();
    const { data, error } = await supabase
      .from('debt_strategies')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async createStrategy(strategy: Omit<DebtStrategy, 'id' | 'created_at' | 'updated_at'>): Promise<DebtStrategy> {
    const supabase = await this.getSupabase();
    // Deactivate other strategies
    await supabase
      .from('debt_strategies')
      .update({ is_active: false })
      .eq('user_id', strategy.user_id);

    const { data, error } = await supabase
      .from('debt_strategies')
      .insert({ ...strategy, is_active: true })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async activateStrategy(id: string, userId: string): Promise<void> {
    const supabase = await this.getSupabase();
    // Deactivate all strategies
    await supabase
      .from('debt_strategies')
      .update({ is_active: false })
      .eq('user_id', userId);

    // Activate selected strategy
    const { error } = await supabase
      .from('debt_strategies')
      .update({ is_active: true })
      .eq('id', id);

    if (error) throw error;
  }

  // Helper method
  private async getDebtById(id: string): Promise<Debt> {
    const supabase = await this.getSupabase();
    const { data, error } = await supabase
      .from('debts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  private calculateMonthlyInterest(balance: number, annualRate: number): number {
    return (balance * (annualRate / 100)) / 12;
  }
}

// Calculation service following Single Responsibility Principle
export class DebtCalculationService {
  
  // Calculate payoff for a single debt
  calculatePayoff(
    debt: Debt,
    monthlyPayment: number,
    extraPayment: number = 0
  ): PayoffCalculation {
    const totalPayment = monthlyPayment + extraPayment;
    let balance = debt.current_balance;
    const monthlyRate = (debt.interest_rate || 0) / 100 / 12;
    const payments: MonthlyPayment[] = [];
    let month = 0;
    let totalInterest = 0;

    while (balance > 0.01 && month < 360) { // Max 30 years
      month++;
      const interestAmount = balance * monthlyRate;
      const principalAmount = Math.min(totalPayment - interestAmount, balance);
      balance -= principalAmount;
      totalInterest += interestAmount;

      payments.push({
        month,
        payment_amount: principalAmount + interestAmount,
        principal_amount: principalAmount,
        interest_amount: interestAmount,
        remaining_balance: Math.max(0, balance),
      });

      if (balance <= 0) break;
    }

    return {
      debt_id: debt.id,
      months_to_payoff: month,
      total_interest: totalInterest,
      total_amount: debt.current_balance + totalInterest,
      monthly_payments: payments,
    };
  }

  // Calculate summary statistics for all debts
  calculateDebtSummary(debts: Debt[], monthlyIncome: number = 0): DebtSummary {
    const totalDebt = debts.reduce((sum, debt) => sum + debt.current_balance, 0);
    const totalMinimum = debts.reduce((sum, debt) => sum + (debt.minimum_payment || 0), 0);
    
    // Calculate weighted average interest rate
    const weightedInterest = debts.reduce((sum, debt) => {
      const weight = debt.current_balance / totalDebt;
      return sum + ((debt.interest_rate || 0) * weight);
    }, 0);

    // Simple average interest rate
    const avgInterest = debts.reduce((sum, debt) => sum + (debt.interest_rate || 0), 0) / debts.length;

    // Find specific debts
    const highestInterest = debts.reduce((highest, debt) => {
      if (!highest || (debt.interest_rate || 0) > (highest.interest_rate || 0)) {
        return debt;
      }
      return highest;
    }, null as Debt | null);

    const smallestBalance = debts.reduce((smallest, debt) => {
      if (!smallest || debt.current_balance < smallest.current_balance) {
        return debt;
      }
      return smallest;
    }, null as Debt | null);

    // Calculate total interest (simplified)
    const totalInterestToPay = debts.reduce((sum, debt) => {
      const calc = this.calculatePayoff(debt, debt.minimum_payment || 0);
      return sum + calc.total_interest;
    }, 0);

    // Calculate projected payoff date (using minimum payments)
    const longestPayoff = debts.reduce((longest, debt) => {
      const calc = this.calculatePayoff(debt, debt.minimum_payment || 0);
      return Math.max(longest, calc.months_to_payoff);
    }, 0);

    const payoffDate = new Date();
    payoffDate.setMonth(payoffDate.getMonth() + longestPayoff);

    return {
      total_debt: totalDebt,
      total_minimum_payment: totalMinimum,
      average_interest_rate: avgInterest,
      weighted_average_interest: weightedInterest,
      highest_interest_debt: highestInterest,
      smallest_balance_debt: smallestBalance,
      debt_to_income_ratio: monthlyIncome > 0 ? (totalMinimum / monthlyIncome) * 100 : 0,
      projected_payoff_date: payoffDate.toISOString(),
      total_interest_to_pay: totalInterestToPay,
    };
  }

  // Calculate cash flow impact
  calculateCashFlowImpact(
    monthlyIncome: number,
    monthlyExpenses: number,
    debts: Debt[],
    emergencyFund: number = 0
  ): CashFlowImpact {
    const totalDebtPayments = debts.reduce((sum, debt) => sum + (debt.minimum_payment || 0), 0);
    const remainingAfterExpenses = monthlyIncome - monthlyExpenses;
    const remainingAfterDebt = remainingAfterExpenses - totalDebtPayments;
    const totalMonthlyObligations = monthlyExpenses + totalDebtPayments;
    const emergencyFundCoverage = totalMonthlyObligations > 0 ? emergencyFund / totalMonthlyObligations : 0;

    return {
      available_income: monthlyIncome,
      total_debt_payments: totalDebtPayments,
      remaining_after_debt: remainingAfterDebt,
      emergency_fund_coverage: emergencyFundCoverage,
      discretionary_income: Math.max(0, remainingAfterDebt),
      debt_payment_percentage: monthlyIncome > 0 ? (totalDebtPayments / monthlyIncome) * 100 : 0,
    };
  }

  // Generate avalanche strategy (highest interest first)
  generateAvalancheStrategy(debts: Debt[], extraPayment: number): DebtPriority[] {
    const sortedDebts = [...debts].sort((a, b) => (b.interest_rate || 0) - (a.interest_rate || 0));
    
    return sortedDebts.map((debt, index) => {
      const extra = index === 0 ? extraPayment : 0; // Extra payment goes to first debt
      const calc = this.calculatePayoff(debt, debt.minimum_payment || 0, extra);
      const payoffDate = new Date();
      payoffDate.setMonth(payoffDate.getMonth() + calc.months_to_payoff);

      return {
        debt_id: debt.id,
        priority: index + 1,
        reasoning: `Interest rate: ${debt.interest_rate}% - ${index === 0 ? 'Highest interest debt' : 'Lower priority'}`,
        monthly_payment: debt.minimum_payment || 0,
        extra_payment: extra,
        projected_payoff: payoffDate.toISOString(),
      };
    });
  }

  // Generate snowball strategy (smallest balance first)
  generateSnowballStrategy(debts: Debt[], extraPayment: number): DebtPriority[] {
    const sortedDebts = [...debts].sort((a, b) => a.current_balance - b.current_balance);
    
    return sortedDebts.map((debt, index) => {
      const extra = index === 0 ? extraPayment : 0; // Extra payment goes to first debt
      const calc = this.calculatePayoff(debt, debt.minimum_payment || 0, extra);
      const payoffDate = new Date();
      payoffDate.setMonth(payoffDate.getMonth() + calc.months_to_payoff);

      return {
        debt_id: debt.id,
        priority: index + 1,
        reasoning: `Balance: $${debt.current_balance.toFixed(2)} - ${index === 0 ? 'Smallest balance' : 'Higher balance'}`,
        monthly_payment: debt.minimum_payment || 0,
        extra_payment: extra,
        projected_payoff: payoffDate.toISOString(),
      };
    });
  }

  // Calculate interest savings
  calculateInterestSavings(
    debt: Debt,
    currentPayment: number,
    newPayment: number
  ): { savings: number; monthsReduced: number } {
    const currentCalc = this.calculatePayoff(debt, currentPayment);
    const newCalc = this.calculatePayoff(debt, newPayment);

    return {
      savings: currentCalc.total_interest - newCalc.total_interest,
      monthsReduced: currentCalc.months_to_payoff - newCalc.months_to_payoff,
    };
  }

  // Debt consolidation analysis
  analyzeConsolidation(
    debts: Debt[],
    consolidationRate: number,
    consolidationTerm: number,
    consolidationFee: number = 0
  ): {
    currentTotal: number;
    consolidatedTotal: number;
    monthlySavings: number;
    totalSavings: number;
    breakEvenMonths: number;
  } {
    // Calculate current situation
    const currentTotal = debts.reduce((sum, debt) => {
      const calc = this.calculatePayoff(debt, debt.minimum_payment || 0);
      return sum + calc.total_amount;
    }, 0);
    
    const currentMonthly = debts.reduce((sum, debt) => sum + (debt.minimum_payment || 0), 0);
    const totalBalance = debts.reduce((sum, debt) => sum + debt.current_balance, 0) + consolidationFee;

    // Calculate consolidated loan
    const monthlyRate = consolidationRate / 100 / 12;
    const consolidatedPayment = totalBalance * 
      (monthlyRate * Math.pow(1 + monthlyRate, consolidationTerm)) /
      (Math.pow(1 + monthlyRate, consolidationTerm) - 1);
    
    const consolidatedTotal = consolidatedPayment * consolidationTerm;

    return {
      currentTotal,
      consolidatedTotal,
      monthlySavings: currentMonthly - consolidatedPayment,
      totalSavings: currentTotal - consolidatedTotal,
      breakEvenMonths: consolidationFee > 0 ? Math.ceil(consolidationFee / (currentMonthly - consolidatedPayment)) : 0,
    };
  }
}
