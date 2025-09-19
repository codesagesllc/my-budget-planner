-- Migration: Add Plaid Integration Tables
-- Date: 2025-09-16
-- Description: Add tables for Plaid items, enhanced accounts, and transactions

-- 1. Create plaid_items table to store Plaid connections
CREATE TABLE IF NOT EXISTS plaid_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL UNIQUE,
    access_token TEXT NOT NULL, -- In production, encrypt this field
    institution_id TEXT,
    institution_name TEXT,
    status TEXT DEFAULT 'connected' CHECK (status IN ('connected', 'login_required', 'error', 'disconnected')),
    sync_cursor TEXT, -- For incremental transaction sync
    last_sync TIMESTAMPTZ,
    error_code TEXT,
    error_message TEXT,
    consent_expiration_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add Plaid-specific columns to existing accounts table
ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS plaid_item_id UUID REFERENCES plaid_items(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS plaid_account_id TEXT,
ADD COLUMN IF NOT EXISTS official_name TEXT,
ADD COLUMN IF NOT EXISTS subtype TEXT,
ADD COLUMN IF NOT EXISTS mask TEXT,
ADD COLUMN IF NOT EXISTS available_balance DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'closed'));

-- 3. Enhance transactions table for Plaid data
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS plaid_transaction_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS merchant_name TEXT,
ADD COLUMN IF NOT EXISTS type TEXT CHECK (type IN ('credit', 'debit')),
ADD COLUMN IF NOT EXISTS authorized_date DATE,
ADD COLUMN IF NOT EXISTS subcategory TEXT,
ADD COLUMN IF NOT EXISTS plaid_category TEXT,
ADD COLUMN IF NOT EXISTS pending BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS account_owner TEXT,
ADD COLUMN IF NOT EXISTS iso_currency_code TEXT DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS location JSONB,
ADD COLUMN IF NOT EXISTS payment_meta JSONB;

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
CREATE TRIGGER update_plaid_items_updated_at
    BEFORE UPDATE ON plaid_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. Create function to get user's Plaid connection status
CREATE OR REPLACE FUNCTION get_plaid_connection_status(user_uuid UUID)
RETURNS TABLE (
    total_items INTEGER,
    connected_items INTEGER,
    error_items INTEGER,
    total_accounts INTEGER,
    last_sync TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::INTEGER as total_items,
        COUNT(CASE WHEN status = 'connected' THEN 1 END)::INTEGER as connected_items,
        COUNT(CASE WHEN status = 'error' THEN 1 END)::INTEGER as error_items,
        COALESCE((
            SELECT COUNT(*)::INTEGER
            FROM accounts a
            JOIN plaid_items pi ON a.plaid_item_id = pi.id
            WHERE pi.user_id = user_uuid AND a.status = 'active'
        ), 0) as total_accounts,
        MAX(last_sync) as last_sync
    FROM plaid_items
    WHERE user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create function to clean up old transactions (for maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_transactions(days_to_keep INTEGER DEFAULT 1095) -- 3 years default
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM transactions
    WHERE date < (CURRENT_DATE - INTERVAL '1 day' * days_to_keep)
    AND plaid_transaction_id IS NOT NULL; -- Only cleanup Plaid transactions

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Create view for transaction enrichment
CREATE OR REPLACE VIEW enriched_transactions AS
SELECT
    t.*,
    a.name as account_name,
    a.type as account_type,
    a.subtype as account_subtype,
    pi.institution_name,
    CASE
        WHEN t.type = 'credit' THEN 'income'
        WHEN t.category IN ('Food and Drink', 'Restaurants') THEN 'dining'
        WHEN t.category IN ('Shops', 'General Merchandise') THEN 'shopping'
        WHEN t.category IN ('Transportation', 'Gas Stations') THEN 'transportation'
        WHEN t.category IN ('Bills', 'Utilities') THEN 'bills'
        ELSE 'other'
    END as simplified_category
FROM transactions t
LEFT JOIN accounts a ON t.account_id = a.id
LEFT JOIN plaid_items pi ON a.plaid_item_id = pi.id;

-- 11. Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON plaid_items TO authenticated;
GRANT SELECT ON enriched_transactions TO authenticated;
GRANT EXECUTE ON FUNCTION get_plaid_connection_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_transactions(INTEGER) TO service_role;