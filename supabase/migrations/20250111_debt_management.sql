-- Create debt types enum
CREATE TYPE debt_type AS ENUM (
  'credit_card',
  'personal_loan',
  'student_loan',
  'mortgage',
  'auto_loan',
  'medical_debt',
  'business_loan',
  'family_loan',
  'other'
);

-- Create strategy types enum
CREATE TYPE strategy_type AS ENUM (
  'avalanche',
  'snowball',
  'custom',
  'hybrid',
  'ai_optimized'
);

-- Debts table
CREATE TABLE IF NOT EXISTS public.debts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creditor_name TEXT NOT NULL,
  debt_type debt_type NOT NULL,
  original_amount DECIMAL(12, 2),
  current_balance DECIMAL(12, 2) NOT NULL,
  interest_rate DECIMAL(5, 2),
  minimum_payment DECIMAL(10, 2),
  due_date INTEGER CHECK (due_date >= 1 AND due_date <= 31), -- Day of month
  credit_limit DECIMAL(12, 2), -- For credit cards
  loan_term_months INTEGER,
  categories JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Debt payments table
CREATE TABLE IF NOT EXISTS public.debt_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debt_id UUID NOT NULL REFERENCES public.debts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  principal_amount DECIMAL(10, 2),
  interest_amount DECIMAL(10, 2),
  remaining_balance DECIMAL(10, 2),
  is_extra_payment BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Debt strategies table
CREATE TABLE IF NOT EXISTS public.debt_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  strategy_name TEXT NOT NULL,
  strategy_type strategy_type NOT NULL,
  extra_payment_amount DECIMAL(10, 2),
  payment_allocation JSONB, -- Custom priority for debts
  is_active BOOLEAN DEFAULT false,
  ai_metadata JSONB, -- For storing AI analysis results
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI debt analysis table
CREATE TABLE IF NOT EXISTS public.debt_ai_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_date DATE NOT NULL DEFAULT CURRENT_DATE,
  financial_snapshot JSONB NOT NULL, -- Income, expenses, debts at time of analysis
  optimal_strategy JSONB NOT NULL, -- AI-generated strategy
  scenario_simulations JSONB, -- Multiple scenarios analyzed
  recommendations JSONB, -- Actionable recommendations
  confidence_score DECIMAL(3, 2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Debt goals table
CREATE TABLE IF NOT EXISTS public.debt_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  debt_id UUID REFERENCES public.debts(id) ON DELETE CASCADE, -- Null for overall debt goals
  goal_type TEXT CHECK (goal_type IN ('payoff_date', 'monthly_payment', 'interest_savings', 'balance_reduction')),
  target_value DECIMAL(12, 2),
  target_date DATE,
  current_progress DECIMAL(5, 2), -- Percentage
  is_achieved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_debts_user_id ON public.debts(user_id);
CREATE INDEX idx_debts_is_active ON public.debts(is_active);
CREATE INDEX idx_debt_payments_debt_id ON public.debt_payments(debt_id);
CREATE INDEX idx_debt_payments_user_id ON public.debt_payments(user_id);
CREATE INDEX idx_debt_payments_date ON public.debt_payments(payment_date);
CREATE INDEX idx_debt_strategies_user_id ON public.debt_strategies(user_id);
CREATE INDEX idx_debt_strategies_is_active ON public.debt_strategies(is_active);
CREATE INDEX idx_debt_ai_analysis_user_id ON public.debt_ai_analysis(user_id);
CREATE INDEX idx_debt_ai_analysis_date ON public.debt_ai_analysis(analysis_date);
CREATE INDEX idx_debt_goals_user_id ON public.debt_goals(user_id);
CREATE INDEX idx_debt_goals_debt_id ON public.debt_goals(debt_id);

-- Create RLS policies
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debt_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debt_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debt_ai_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debt_goals ENABLE ROW LEVEL SECURITY;

-- Policies for debts
CREATE POLICY "Users can view their own debts" ON public.debts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own debts" ON public.debts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own debts" ON public.debts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own debts" ON public.debts
  FOR DELETE USING (auth.uid() = user_id);

-- Policies for debt_payments
CREATE POLICY "Users can view their own debt payments" ON public.debt_payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own debt payments" ON public.debt_payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own debt payments" ON public.debt_payments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own debt payments" ON public.debt_payments
  FOR DELETE USING (auth.uid() = user_id);

-- Policies for debt_strategies
CREATE POLICY "Users can view their own debt strategies" ON public.debt_strategies
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own debt strategies" ON public.debt_strategies
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own debt strategies" ON public.debt_strategies
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own debt strategies" ON public.debt_strategies
  FOR DELETE USING (auth.uid() = user_id);

-- Policies for debt_ai_analysis
CREATE POLICY "Users can view their own AI analysis" ON public.debt_ai_analysis
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AI analysis" ON public.debt_ai_analysis
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policies for debt_goals
CREATE POLICY "Users can view their own debt goals" ON public.debt_goals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own debt goals" ON public.debt_goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own debt goals" ON public.debt_goals
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own debt goals" ON public.debt_goals
  FOR DELETE USING (auth.uid() = user_id);

-- Create update trigger for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_debts_updated_at BEFORE UPDATE ON public.debts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_debt_strategies_updated_at BEFORE UPDATE ON public.debt_strategies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_debt_goals_updated_at BEFORE UPDATE ON public.debt_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
