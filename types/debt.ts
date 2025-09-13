// Debt Management Types

export type DebtType = 
  | 'credit_card'
  | 'personal_loan'
  | 'student_loan'
  | 'mortgage'
  | 'auto_loan'
  | 'medical_debt'
  | 'business_loan'
  | 'family_loan'
  | 'other';

export type StrategyType = 
  | 'avalanche'
  | 'snowball'
  | 'custom'
  | 'hybrid'
  | 'ai_optimized';

export type GoalType = 
  | 'payoff_date'
  | 'monthly_payment'
  | 'interest_savings'
  | 'balance_reduction';

export interface Debt {
  id: string;
  user_id: string;
  creditor_name: string;
  debt_type: DebtType;
  original_amount?: number;
  current_balance: number;
  interest_rate?: number;
  minimum_payment?: number;
  due_date?: number; // Day of month
  credit_limit?: number; // For credit cards
  loan_term_months?: number;
  categories?: string[];
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DebtPayment {
  id: string;
  debt_id: string;
  user_id: string;
  payment_date: string;
  amount: number;
  principal_amount?: number;
  interest_amount?: number;
  remaining_balance?: number;
  is_extra_payment: boolean;
  notes?: string;
  created_at: string;
}

export interface DebtStrategy {
  id: string;
  user_id: string;
  strategy_name: string;
  strategy_type: StrategyType;
  extra_payment_amount?: number;
  payment_allocation?: PaymentAllocation;
  is_active: boolean;
  ai_metadata?: AIMetadata;
  created_at: string;
  updated_at: string;
}

export interface PaymentAllocation {
  [debtId: string]: {
    priority: number;
    fixed_amount?: number;
    percentage?: number;
  };
}

export interface DebtGoal {
  id: string;
  user_id: string;
  debt_id?: string; // Null for overall debt goals
  goal_type: GoalType;
  target_value: number;
  target_date?: string;
  current_progress: number; // Percentage (0-100)
  is_achieved: boolean;
  created_at: string;
  updated_at: string;
}

// AI Analysis Types
export interface AIMetadata {
  confidence_score: number;
  analysis_date: string;
  factors_considered: string[];
  optimization_method: string;
}

export interface FinancialSnapshot {
  monthly_income: number;
  monthly_expenses: number;
  available_for_debt: number;
  emergency_fund: number;
  debt_to_income_ratio: number;
  total_debt: number;
  weighted_avg_interest: number;
}

export interface AIDebtStrategy {
  strategy_name: string;
  methodology: string;
  debt_order: DebtPriority[];
  total_interest_saved: number;
  months_reduced: number;
  cash_flow_impact: number;
  risk_score: number; // 0-100 (lower is safer)
  recommendations: AIRecommendation[];
  adjustment_triggers: AdjustmentTriggers;
}

export interface DebtPriority {
  debt_id: string;
  priority: number;
  reasoning: string;
  monthly_payment: number;
  extra_payment: number;
  projected_payoff: string;
}

export interface AIRecommendation {
  type: 'payment' | 'consolidation' | 'negotiation' | 'income' | 'expense';
  action: string;
  impact: number; // Estimated $ saved/earned
  effort: 'low' | 'medium' | 'high';
  priority: number;
}

export interface AdjustmentTriggers {
  income_change: number; // % threshold
  expense_change: number; // % threshold
  time_interval: number; // Days between reviews
}

export interface DebtAIAnalysis {
  id: string;
  user_id: string;
  analysis_date: string;
  financial_snapshot: FinancialSnapshot;
  optimal_strategy: AIDebtStrategy;
  scenario_simulations?: ScenarioSimulation[];
  recommendations: AIRecommendation[];
  confidence_score: number;
  created_at: string;
}

export interface ScenarioSimulation {
  name: string;
  assumptions: SimulationAssumptions;
  outcomes: SimulationOutcomes;
}

export interface SimulationAssumptions {
  monthly_extra_payment: number;
  income_change: number; // % increase/decrease
  expense_change: number; // % increase/decrease
  interest_rate_change?: number;
  unexpected_expenses?: number[];
}

export interface SimulationOutcomes {
  debt_free_date: string;
  total_interest_paid: number;
  total_amount_paid: number;
  monthly_payment_range: [number, number];
  success_probability: number; // 0-100%
}

// Calculation Utilities
export interface PayoffCalculation {
  debt_id: string;
  months_to_payoff: number;
  total_interest: number;
  total_amount: number;
  monthly_payments: MonthlyPayment[];
}

export interface MonthlyPayment {
  month: number;
  payment_amount: number;
  principal_amount: number;
  interest_amount: number;
  remaining_balance: number;
}

export interface DebtSummary {
  total_debt: number;
  total_minimum_payment: number;
  average_interest_rate: number;
  weighted_average_interest: number;
  highest_interest_debt: Debt | null;
  smallest_balance_debt: Debt | null;
  debt_to_income_ratio: number;
  projected_payoff_date: string;
  total_interest_to_pay: number;
}

export interface CashFlowImpact {
  available_income: number;
  total_debt_payments: number;
  remaining_after_debt: number;
  emergency_fund_coverage: number; // months
  discretionary_income: number;
  debt_payment_percentage: number;
}
