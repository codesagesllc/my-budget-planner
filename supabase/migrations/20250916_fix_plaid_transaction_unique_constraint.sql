-- Fix unique constraint for plaid_transaction_id
-- This ensures the ON CONFLICT clause works properly for transaction upserts

-- First, remove any potential duplicate transactions based on plaid_transaction_id
-- Keep only the most recent one for each plaid_transaction_id
DELETE FROM transactions
WHERE id NOT IN (
    SELECT DISTINCT ON (plaid_transaction_id) id
    FROM transactions
    WHERE plaid_transaction_id IS NOT NULL
    ORDER BY plaid_transaction_id, created_at DESC
);

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
    -- Check if unique constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'transactions_plaid_transaction_id_key'
    ) THEN
        -- Add unique constraint
        ALTER TABLE transactions
        ADD CONSTRAINT transactions_plaid_transaction_id_key
        UNIQUE (plaid_transaction_id);
    END IF;
END $$;

-- Also ensure the column exists (in case migrations were run out of order)
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS plaid_transaction_id TEXT;

-- Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_transactions_plaid_transaction_id_unique
ON transactions(plaid_transaction_id)
WHERE plaid_transaction_id IS NOT NULL;