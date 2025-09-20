-- Run this in your Supabase SQL Editor to add Plaid integration tables

-- 1. Create plaid_items table to store Plaid connections
CREATE TABLE IF NOT EXISTS plaid_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL UNIQUE,
    access_token TEXT NOT NULL -- In production, encrypt this field
);

-- Add missing columns to plaid_items table if they don't exist
ALTER TABLE plaid_items
ADD COLUMN IF NOT EXISTS institution_id TEXT,
ADD COLUMN IF NOT EXISTS institution_name TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'connected',
ADD COLUMN IF NOT EXISTS sync_cursor TEXT,
ADD COLUMN IF NOT EXISTS last_sync TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS error_code TEXT,
ADD COLUMN IF NOT EXISTS error_message TEXT,
ADD COLUMN IF NOT EXISTS consent_expiration_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add constraint for plaid_items status column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'plaid_items_status_check'
        AND table_name = 'plaid_items'
    ) THEN
        ALTER TABLE plaid_items ADD CONSTRAINT plaid_items_status_check
        CHECK (status IN ('connected', 'login_required', 'error', 'disconnected'));
    END IF;
END $$;

-- 2. Add Plaid-specific columns to existing accounts table
ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS plaid_item_id UUID REFERENCES plaid_items(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS plaid_account_id TEXT,
ADD COLUMN IF NOT EXISTS official_name TEXT,
ADD COLUMN IF NOT EXISTS subtype TEXT,
ADD COLUMN IF NOT EXISTS mask TEXT,
ADD COLUMN IF NOT EXISTS available_balance DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Add constraint for status column after column is created (ignore if it already exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'accounts_status_check'
        AND table_name = 'accounts'
    ) THEN
        ALTER TABLE accounts ADD CONSTRAINT accounts_status_check
        CHECK (status IN ('active', 'inactive', 'closed'));
    END IF;
END $$;

-- 3. Enhance transactions table for Plaid data
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS plaid_transaction_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS merchant_name TEXT,
ADD COLUMN IF NOT EXISTS type TEXT,
ADD COLUMN IF NOT EXISTS authorized_date DATE,
ADD COLUMN IF NOT EXISTS subcategory TEXT,
ADD COLUMN IF NOT EXISTS plaid_category TEXT,
ADD COLUMN IF NOT EXISTS pending BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS account_owner TEXT,
ADD COLUMN IF NOT EXISTS iso_currency_code TEXT DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS location JSONB,
ADD COLUMN IF NOT EXISTS payment_meta JSONB;

-- Add constraint for type column after column is created
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'transactions_type_check'
        AND table_name = 'transactions'
    ) THEN
        ALTER TABLE transactions ADD CONSTRAINT transactions_type_check
        CHECK (type IN ('credit', 'debit'));
    END IF;
END $$;

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_plaid_items_user_id ON plaid_items(user_id);
CREATE INDEX IF NOT EXISTS idx_plaid_items_item_id ON plaid_items(item_id);
CREATE INDEX IF NOT EXISTS idx_plaid_items_status ON plaid_items(status);

CREATE INDEX IF NOT EXISTS idx_accounts_plaid_item_id ON accounts(plaid_item_id);
CREATE INDEX IF NOT EXISTS idx_accounts_plaid_account_id ON accounts(plaid_account_id);
CREATE INDEX IF NOT EXISTS idx_accounts_user_status ON accounts(user_id, status);

CREATE INDEX IF NOT EXISTS idx_transactions_plaid_id ON transactions(plaid_transaction_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_pending ON transactions(user_id, pending);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);

-- 5. Create RLS (Row Level Security) policies
ALTER TABLE plaid_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "Users can view own plaid items" ON plaid_items;
DROP POLICY IF EXISTS "Users can insert own plaid items" ON plaid_items;
DROP POLICY IF EXISTS "Users can update own plaid items" ON plaid_items;
DROP POLICY IF EXISTS "Users can delete own plaid items" ON plaid_items;

-- Users can only access their own Plaid items
CREATE POLICY "Users can view own plaid items" ON plaid_items
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own plaid items" ON plaid_items
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own plaid items" ON plaid_items
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own plaid items" ON plaid_items
    FOR DELETE USING (auth.uid() = user_id);

-- 6. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 7. Create triggers for updated_at
DROP TRIGGER IF EXISTS update_plaid_items_updated_at ON plaid_items;
CREATE TRIGGER update_plaid_items_updated_at
    BEFORE UPDATE ON plaid_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. Create webhook_logs table for monitoring and debugging
CREATE TABLE IF NOT EXISTS webhook_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    webhook_type TEXT NOT NULL,
    webhook_code TEXT NOT NULL,
    item_id TEXT,
    environment TEXT,
    data JSONB,
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for webhook logs
CREATE INDEX IF NOT EXISTS idx_webhook_logs_type ON webhook_logs(webhook_type);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_item_id ON webhook_logs(item_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_processed_at ON webhook_logs(processed_at DESC);

-- RLS policies for webhook logs (admin only)
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists and recreate
DROP POLICY IF EXISTS "Service role can manage webhook logs" ON webhook_logs;

-- Only service role can access webhook logs (for security)
CREATE POLICY "Service role can manage webhook logs" ON webhook_logs
    FOR ALL USING (auth.role() = 'service_role');

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON plaid_items TO authenticated;
GRANT SELECT, INSERT ON webhook_logs TO service_role;