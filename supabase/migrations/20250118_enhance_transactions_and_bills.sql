-- Migration: Enhance Transactions and Bills Integration
-- Date: 2025-01-18
-- Description: Add bill_id to transactions, transaction_type, recurring flags, and what-if scenarios

-- 1. Add missing columns to transactions table
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS bill_id UUID REFERENCES bills(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS income_source_id UUID REFERENCES income_sources(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS transaction_type TEXT CHECK (transaction_type IN ('expense', 'income', 'transfer')) DEFAULT 'expense',
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS recurring_pattern JSONB, -- Stores frequency, next_date, etc.
ADD COLUMN IF NOT EXISTS is_bill_payment BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS exclude_from_spending BOOLEAN DEFAULT FALSE;

-- 2. Create what_if_scenarios table for bill impact analysis
CREATE TABLE IF NOT EXISTS what_if_scenarios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scenario_name TEXT NOT NULL,
  scenario_type TEXT CHECK (scenario_type IN ('new_bill', 'bill_change', 'income_change', 'custom')) DEFAULT 'new_bill',
  base_data JSONB NOT NULL, -- Current financial state
  changes JSONB NOT NULL, -- What changes to apply
  results JSONB NOT NULL, -- Calculated impact
  monthly_impact DECIMAL(12,2), -- Net monthly change
  cash_flow_impact DECIMAL(12,2), -- Impact on remaining balance
  affordability_score INTEGER CHECK (affordability_score >= 0 AND affordability_score <= 100),
  recommendations JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create bill_impact_analysis table for storing bill analysis results
CREATE TABLE IF NOT EXISTS bill_impact_analysis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bill_id UUID REFERENCES bills(id) ON DELETE CASCADE,
  scenario_id UUID REFERENCES what_if_scenarios(id) ON DELETE CASCADE,
  analysis_date DATE NOT NULL DEFAULT CURRENT_DATE,
  current_cash_flow DECIMAL(12,2) NOT NULL,
  projected_cash_flow DECIMAL(12,2) NOT NULL,
  affordability_rating TEXT CHECK (affordability_rating IN ('easily_affordable', 'affordable', 'tight', 'concerning', 'not_affordable')) NOT NULL,
  impact_percentage DECIMAL(5,2), -- Percentage of income this bill represents
  recommendations TEXT[],
  risk_factors TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_bill_id ON transactions(bill_id);
CREATE INDEX IF NOT EXISTS idx_transactions_income_source_id ON transactions(income_source_id);
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_type ON transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_is_recurring ON transactions(is_recurring);
CREATE INDEX IF NOT EXISTS idx_transactions_is_bill_payment ON transactions(is_bill_payment);
CREATE INDEX IF NOT EXISTS idx_transactions_exclude_from_spending ON transactions(exclude_from_spending);

CREATE INDEX IF NOT EXISTS idx_what_if_scenarios_user_id ON what_if_scenarios(user_id);
CREATE INDEX IF NOT EXISTS idx_what_if_scenarios_type ON what_if_scenarios(scenario_type);
CREATE INDEX IF NOT EXISTS idx_bill_impact_analysis_user_id ON bill_impact_analysis(user_id);
CREATE INDEX IF NOT EXISTS idx_bill_impact_analysis_bill_id ON bill_impact_analysis(bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_impact_analysis_date ON bill_impact_analysis(analysis_date);

-- 5. Enable Row Level Security
ALTER TABLE what_if_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_impact_analysis ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies
CREATE POLICY "Users can view their own what-if scenarios" ON what_if_scenarios
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own what-if scenarios" ON what_if_scenarios
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own what-if scenarios" ON what_if_scenarios
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own what-if scenarios" ON what_if_scenarios
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own bill impact analysis" ON bill_impact_analysis
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bill impact analysis" ON bill_impact_analysis
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bill impact analysis" ON bill_impact_analysis
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bill impact analysis" ON bill_impact_analysis
  FOR DELETE USING (auth.uid() = user_id);

-- 7. Create function to calculate spending totals excluding bill payments
CREATE OR REPLACE FUNCTION calculate_net_spending(user_uuid UUID, start_date DATE, end_date DATE)
RETURNS DECIMAL(12,2) AS $$
BEGIN
  RETURN (
    SELECT COALESCE(SUM(amount), 0)
    FROM transactions
    WHERE user_id = user_uuid
      AND date >= start_date
      AND date <= end_date
      AND transaction_type = 'expense'
      AND (exclude_from_spending = FALSE OR exclude_from_spending IS NULL)
      AND (is_bill_payment = FALSE OR is_bill_payment IS NULL)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create function to analyze bill affordability
CREATE OR REPLACE FUNCTION analyze_bill_affordability(
  user_uuid UUID,
  new_bill_amount DECIMAL(12,2),
  billing_frequency TEXT DEFAULT 'monthly'
)
RETURNS TABLE (
  affordability_rating TEXT,
  monthly_impact DECIMAL(12,2),
  current_cash_flow DECIMAL(12,2),
  projected_cash_flow DECIMAL(12,2),
  impact_percentage DECIMAL(5,2),
  recommendations TEXT[]
) AS $$
DECLARE
  monthly_income DECIMAL(12,2);
  monthly_spending DECIMAL(12,2);
  current_flow DECIMAL(12,2);
  monthly_bill_amount DECIMAL(12,2);
  projected_flow DECIMAL(12,2);
  impact_pct DECIMAL(5,2);
  rating TEXT;
  recs TEXT[];
BEGIN
  -- Convert bill amount to monthly equivalent
  monthly_bill_amount := CASE
    WHEN billing_frequency = 'weekly' THEN new_bill_amount * 4.33
    WHEN billing_frequency = 'biweekly' THEN new_bill_amount * 2.17
    WHEN billing_frequency = 'quarterly' THEN new_bill_amount / 3
    WHEN billing_frequency = 'annual' THEN new_bill_amount / 12
    ELSE new_bill_amount -- monthly
  END;

  -- Calculate current monthly income
  SELECT COALESCE(SUM(
    CASE
      WHEN frequency = 'biweekly' THEN amount * 2.17
      WHEN frequency = 'weekly' THEN amount * 4.33
      WHEN frequency = 'quarterly' THEN amount / 3
      WHEN frequency = 'annual' THEN amount / 12
      ELSE amount
    END
  ), 0) INTO monthly_income
  FROM income_sources
  WHERE user_id = user_uuid AND is_active = TRUE;

  -- Calculate current monthly spending (excluding bill payments)
  monthly_spending := calculate_net_spending(
    user_uuid,
    DATE_TRUNC('month', CURRENT_DATE)::DATE,
    (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE
  );

  -- Calculate current and projected cash flow
  current_flow := monthly_income - monthly_spending;
  projected_flow := current_flow - monthly_bill_amount;

  -- Calculate impact percentage
  impact_pct := CASE
    WHEN monthly_income > 0 THEN (monthly_bill_amount / monthly_income) * 100
    ELSE 100
  END;

  -- Determine affordability rating
  IF projected_flow < 0 THEN
    rating := 'not_affordable';
    recs := ARRAY['This bill would put you in the red', 'Consider reducing other expenses first', 'Look for ways to increase income'];
  ELSIF impact_pct > 30 THEN
    rating := 'concerning';
    recs := ARRAY['This bill represents a large portion of your income', 'Consider if this is truly necessary', 'Look for cheaper alternatives'];
  ELSIF impact_pct > 20 THEN
    rating := 'tight';
    recs := ARRAY['This bill will significantly impact your budget', 'Ensure you have emergency savings first', 'Monitor spending closely'];
  ELSIF impact_pct > 10 THEN
    rating := 'affordable';
    recs := ARRAY['This bill fits reasonably in your budget', 'Consider automatic payments to avoid late fees'];
  ELSE
    rating := 'easily_affordable';
    recs := ARRAY['This bill should fit comfortably in your budget', 'Good opportunity to increase savings'];
  END IF;

  RETURN QUERY SELECT
    rating,
    monthly_bill_amount,
    current_flow,
    projected_flow,
    impact_pct,
    recs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create function to update transaction spending flags automatically
CREATE OR REPLACE FUNCTION update_transaction_spending_flags()
RETURNS TRIGGER AS $$
BEGIN
  -- If transaction is linked to a bill, mark it as bill payment and exclude from spending
  IF NEW.bill_id IS NOT NULL THEN
    NEW.is_bill_payment := TRUE;
    NEW.exclude_from_spending := TRUE;
  END IF;

  -- If transaction is marked as transfer, exclude from spending
  IF NEW.transaction_type = 'transfer' THEN
    NEW.exclude_from_spending := TRUE;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Create trigger to automatically update spending flags
CREATE TRIGGER update_transaction_flags_trigger
  BEFORE INSERT OR UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_transaction_spending_flags();

-- 11. Create triggers for updated_at
CREATE TRIGGER update_what_if_scenarios_updated_at
  BEFORE UPDATE ON what_if_scenarios
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 12. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON what_if_scenarios TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON bill_impact_analysis TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_net_spending(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION analyze_bill_affordability(UUID, DECIMAL, TEXT) TO authenticated;