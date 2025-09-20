-- Migration: Add Webhook Logs Table
-- Date: 2025-09-16
-- Description: Add table for logging Plaid webhooks

-- Create webhook_logs table for monitoring and debugging
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_webhook_logs_type ON webhook_logs(webhook_type);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_item_id ON webhook_logs(item_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_processed_at ON webhook_logs(processed_at DESC);

-- RLS policies (admin only)
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- Only service role can access webhook logs (for security)
CREATE POLICY "Service role can manage webhook logs" ON webhook_logs
    FOR ALL USING (auth.role() = 'service_role');

-- Grant permissions
GRANT SELECT, INSERT ON webhook_logs TO service_role;

-- Create function to clean up old webhook logs (retention policy)
CREATE OR REPLACE FUNCTION cleanup_old_webhook_logs(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM webhook_logs
    WHERE processed_at < (NOW() - INTERVAL '1 day' * days_to_keep);

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution permission
GRANT EXECUTE ON FUNCTION cleanup_old_webhook_logs(INTEGER) TO service_role;