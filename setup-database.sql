-- IMPORTANT: Run this SQL in your Supabase SQL Editor to add the new features
-- Go to: https://app.supabase.com/project/YOUR_PROJECT/sql/new

-- 1. Create income_sources table for tracking different income streams
CREATE TABLE IF NOT EXISTS income_sources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  frequency TEXT CHECK (frequency IN ('monthly', 'biweekly', 'weekly', 'quarterly', 'annual', 'one-time')) DEFAULT 'monthly',
  category TEXT DEFAULT 'salary',
  is_active BOOLEAN DEFAULT true,
  start_date DATE,
  end_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 2. Add income-related fields to transactions table (only if they don't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'transactions' 
                 AND column_name = 'transaction_type') THEN
    ALTER TABLE transactions 
    ADD COLUMN transaction_type TEXT DEFAULT 'expense' CHECK (transaction_type IN ('expense', 'income', 'transfer'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'transactions' 
                 AND column_name = 'subcategory') THEN
    ALTER TABLE transactions 
    ADD COLUMN subcategory TEXT;
  END IF;
END $$;

-- 3. Create financial_goals table for forecasting
CREATE TABLE IF NOT EXISTS financial_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  target_amount DECIMAL(10,2) NOT NULL,
  current_amount DECIMAL(10,2) DEFAULT 0,
  target_date DATE,
  category TEXT,
  priority INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 4. Create budget_forecasts table for AI predictions
CREATE TABLE IF NOT EXISTS budget_forecasts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  forecast_date DATE NOT NULL,
  predicted_income DECIMAL(10,2),
  predicted_expenses DECIMAL(10,2),
  predicted_savings DECIMAL(10,2),
  confidence_score DECIMAL(3,2),
  forecast_method TEXT,
  insights JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 5. Create user_preferences table for storing financial settings
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  monthly_net_income DECIMAL(10,2),
  savings_target_percentage DECIMAL(5,2),
  emergency_fund_target DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  fiscal_month_start_day INTEGER DEFAULT 1 CHECK (fiscal_month_start_day >= 1 AND fiscal_month_start_day <= 31),
  notification_preferences JSONB DEFAULT '{"email": true, "push": false}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 6. Enable Row Level Security (RLS)
ALTER TABLE income_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies for income_sources
CREATE POLICY "Users can view own income sources" ON income_sources
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own income sources" ON income_sources
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own income sources" ON income_sources
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own income sources" ON income_sources
  FOR DELETE USING (auth.uid() = user_id);

-- 8. Create RLS policies for financial_goals
CREATE POLICY "Users can view own financial goals" ON financial_goals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own financial goals" ON financial_goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own financial goals" ON financial_goals
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own financial goals" ON financial_goals
  FOR DELETE USING (auth.uid() = user_id);

-- 9. Create RLS policies for budget_forecasts
CREATE POLICY "Users can view own forecasts" ON budget_forecasts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own forecasts" ON budget_forecasts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own forecasts" ON budget_forecasts
  FOR DELETE USING (auth.uid() = user_id);

-- 10. Create RLS policies for user_preferences
CREATE POLICY "Users can view own preferences" ON user_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" ON user_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON user_preferences
  FOR UPDATE USING (auth.uid() = user_id);

-- 11. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_income_sources_user_id ON income_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_goals_user_id ON financial_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_budget_forecasts_user_id ON budget_forecasts(user_id);
CREATE INDEX IF NOT EXISTS idx_budget_forecasts_forecast_date ON budget_forecasts(forecast_date);

-- 12. Create index for transaction_type if it doesn't exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'transactions' 
             AND column_name = 'transaction_type') THEN
    CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);
  END IF;
END $$;

-- Success! Your database is now updated with all the new features.