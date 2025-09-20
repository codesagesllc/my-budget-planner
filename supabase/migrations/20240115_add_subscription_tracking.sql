-- Add columns to track subscription and free trial status
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS stripe_customer_id text,
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive', 'trialing', 'canceled', 'past_due')),
ADD COLUMN IF NOT EXISTS subscription_tier text CHECK (subscription_tier IN ('free_trial', 'basic', 'premium')),
ADD COLUMN IF NOT EXISTS free_trial_used boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS free_trial_start_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS free_trial_end_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS subscription_id text,
ADD COLUMN IF NOT EXISTS subscription_end_date timestamp with time zone;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON public.users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON public.users(subscription_status);
CREATE INDEX IF NOT EXISTS idx_users_free_trial_end_date ON public.users(free_trial_end_date);

-- Function to automatically deactivate expired free trials
CREATE OR REPLACE FUNCTION deactivate_expired_free_trials()
RETURNS void AS $$
BEGIN
  UPDATE public.users
  SET 
    subscription_status = 'inactive',
    subscription_tier = NULL
  WHERE 
    subscription_tier = 'free_trial' 
    AND free_trial_end_date < NOW()
    AND subscription_status = 'trialing';
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to run daily (you'll need to set this up in your backend or use pg_cron)
-- This is just a comment for reference, actual scheduling depends on your setup
-- SELECT cron.schedule('deactivate-expired-trials', '0 0 * * *', 'SELECT deactivate_expired_free_trials();');
