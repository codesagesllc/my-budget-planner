-- Create budget_limits table for category spending limits
CREATE TABLE budget_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  monthly_limit DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  current_spending DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  percentage_used DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  warning_threshold INTEGER NOT NULL DEFAULT 80,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create savings_goals table for tracking savings targets
CREATE TABLE savings_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  current_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  deadline DATE NOT NULL,
  progress_percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  monthly_required DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  on_track BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Note: debts table already exists from 20250111_debt_management.sql migration with comprehensive schema

-- Create indexes for better performance
CREATE INDEX idx_budget_limits_user_id ON budget_limits(user_id);
CREATE INDEX idx_budget_limits_category ON budget_limits(category);
CREATE INDEX idx_budget_limits_active ON budget_limits(is_active);
CREATE UNIQUE INDEX idx_budget_limits_user_category ON budget_limits(user_id, category) WHERE is_active = true;

CREATE INDEX idx_savings_goals_user_id ON savings_goals(user_id);
CREATE INDEX idx_savings_goals_deadline ON savings_goals(deadline);
CREATE INDEX idx_savings_goals_active ON savings_goals(is_active);

-- Enable Row Level Security (RLS)
ALTER TABLE budget_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for budget_limits
CREATE POLICY "Users can view their own budget limits" ON budget_limits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own budget limits" ON budget_limits
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own budget limits" ON budget_limits
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own budget limits" ON budget_limits
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for savings_goals
CREATE POLICY "Users can view their own savings goals" ON savings_goals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own savings goals" ON savings_goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own savings goals" ON savings_goals
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own savings goals" ON savings_goals
  FOR DELETE USING (auth.uid() = user_id);

-- Note: RLS policies for debts already exist in 20250111_debt_management.sql migration

-- Note: update_updated_at_column() function already exists from 20250111_debt_management.sql migration

-- Create triggers for updated_at
CREATE TRIGGER update_budget_limits_updated_at
  BEFORE UPDATE ON budget_limits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_savings_goals_updated_at
  BEFORE UPDATE ON savings_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data for demonstration (optional)
-- Uncomment the following if you want sample data:

/*
-- Sample budget limits
INSERT INTO budget_limits (user_id, category, monthly_limit, warning_threshold) VALUES
(auth.uid(), 'Food and Drink', 800.00, 80),
(auth.uid(), 'Transportation', 400.00, 80),
(auth.uid(), 'Entertainment', 300.00, 75),
(auth.uid(), 'Shopping', 500.00, 85);

-- Sample savings goal
INSERT INTO savings_goals (user_id, name, target_amount, current_amount, deadline, monthly_required) VALUES
(auth.uid(), 'Emergency Fund', 5000.00, 1200.00, '2025-12-31', 316.67);

-- Note: Sample debt data exists in 20250111_debt_management.sql migration
*/