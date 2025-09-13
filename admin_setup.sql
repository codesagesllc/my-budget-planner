-- Set admin user
UPDATE public.users SET is_admin = true WHERE email = 'carletonj.batten@gmail.com';

-- Set free trial dates for existing users
UPDATE public.users
SET 
  free_trial_start_date = COALESCE(free_trial_start_date, created_at),
  free_trial_end_date = COALESCE(free_trial_end_date, created_at + INTERVAL '14 days')
WHERE subscription_tier = 'free_trial';