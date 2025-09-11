-- Create income_sources table
CREATE TABLE IF NOT EXISTS public.income_sources (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  amount numeric NOT NULL,
  frequency text DEFAULT 'monthly'::text CHECK (frequency IN ('monthly', 'biweekly', 'weekly', 'quarterly', 'annual', 'one-time')),
  category text DEFAULT 'salary'::text,
  start_date date,
  end_date date,
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT income_sources_pkey PRIMARY KEY (id),
  CONSTRAINT income_sources_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_income_sources_user_id ON public.income_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_income_sources_is_active ON public.income_sources(is_active);
CREATE INDEX IF NOT EXISTS idx_income_sources_frequency ON public.income_sources(frequency);

-- Enable Row Level Security
ALTER TABLE public.income_sources ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own income sources" ON public.income_sources
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own income sources" ON public.income_sources
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own income sources" ON public.income_sources
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own income sources" ON public.income_sources
  FOR DELETE USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_income_sources_updated_at BEFORE UPDATE ON public.income_sources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add some comments for documentation
COMMENT ON TABLE public.income_sources IS 'Stores all income sources for users including salary, freelance, investments, etc.';
COMMENT ON COLUMN public.income_sources.frequency IS 'How often the income is received: monthly, biweekly, weekly, quarterly, annual, or one-time';
COMMENT ON COLUMN public.income_sources.category IS 'Type of income: salary, freelance, investment, rental, business, pension, benefits, other';
