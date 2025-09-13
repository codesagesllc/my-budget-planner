-- ============================================
-- SQL Script to Update User Roles and Subscriptions
-- ============================================
-- This script will:
-- 1. Make one user an admin with premium access
-- 2. Make another user a basic subscriber
-- 3. Handle null subscription columns properly
-- ============================================

-- First, let's see what users exist in the database
-- Run this to see your users and their IDs:
SELECT id, email, subscription_tier, subscription_status, is_admin 
FROM public.users 
ORDER BY created_at DESC 
LIMIT 10;

-- ============================================
-- OPTION 1: Update users by their UUID
-- Replace these UUIDs with actual user IDs from your database
-- ============================================

-- Make a user an ADMIN with premium subscription
-- Replace 'YOUR-ADMIN-USER-ID-HERE' with the actual UUID
UPDATE public.users 
SET 
    is_admin = true,
    subscription_tier = 'premium',
    subscription_status = 'active',
    free_trial_used = true,
    subscription_end_date = NOW() + INTERVAL '1 year'
WHERE id = 'YOUR-ADMIN-USER-ID-HERE';

-- Make a user a BASIC subscriber
-- Replace 'YOUR-BASIC-USER-ID-HERE' with the actual UUID
UPDATE public.users 
SET 
    is_admin = false,
    subscription_tier = 'basic',
    subscription_status = 'active',
    free_trial_used = true,
    subscription_end_date = NOW() + INTERVAL '1 month'
WHERE id = 'YOUR-BASIC-USER-ID-HERE';

-- ============================================
-- OPTION 2: Update users by email (easier to use)
-- Replace the email addresses with actual ones
-- ============================================

-- Make a user an ADMIN by email
UPDATE public.users 
SET 
    is_admin = true,
    subscription_tier = 'premium',
    subscription_status = 'active',
    free_trial_used = true,
    subscription_end_date = NOW() + INTERVAL '1 year'
WHERE email = 'admin@example.com';

-- Make a user a BASIC subscriber by email
UPDATE public.users 
SET 
    is_admin = false,
    subscription_tier = 'basic',
    subscription_status = 'active',
    free_trial_used = true,
    subscription_end_date = NOW() + INTERVAL '1 month'
WHERE email = 'basicuser@example.com';

-- ============================================
-- OPTION 3: Make the first user an admin and second user basic
-- This uses row numbers to update without knowing IDs
-- ============================================

-- Make the most recently created user an admin
WITH recent_users AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) as rn
    FROM public.users
)
UPDATE public.users 
SET 
    is_admin = true,
    subscription_tier = 'premium',
    subscription_status = 'active',
    free_trial_used = true,
    subscription_end_date = NOW() + INTERVAL '1 year'
WHERE id = (SELECT id FROM recent_users WHERE rn = 1);

-- Make the second most recently created user a basic subscriber
WITH recent_users AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) as rn
    FROM public.users
)
UPDATE public.users 
SET 
    is_admin = false,
    subscription_tier = 'basic',
    subscription_status = 'active',
    free_trial_used = true,
    subscription_end_date = NOW() + INTERVAL '1 month'
WHERE id = (SELECT id FROM recent_users WHERE rn = 2);

-- ============================================
-- Set remaining users to free trial (optional)
-- ============================================

-- Give all other users a free trial
UPDATE public.users 
SET 
    is_admin = false,
    subscription_tier = 'free_trial',
    subscription_status = 'trialing',
    free_trial_used = false,
    free_trial_start_date = NOW(),
    free_trial_end_date = NOW() + INTERVAL '14 days'
WHERE 
    subscription_tier IS NULL 
    OR subscription_status IS NULL;

-- ============================================
-- Verify the updates
-- ============================================

-- Check all users and their new roles
SELECT 
    id,
    email,
    subscription_tier,
    subscription_status,
    is_admin,
    free_trial_used,
    free_trial_end_date,
    subscription_end_date,
    CASE 
        WHEN is_admin = true THEN 'ADMIN'
        WHEN subscription_tier = 'premium' THEN 'PREMIUM'
        WHEN subscription_tier = 'basic' THEN 'BASIC'
        WHEN subscription_tier = 'free_trial' THEN 'FREE TRIAL'
        ELSE 'NO SUBSCRIPTION'
    END as role_display
FROM public.users
ORDER BY is_admin DESC, subscription_tier DESC;

-- ============================================
-- QUICK COPY-PASTE COMMANDS
-- ============================================

-- If you know the user IDs, use these (replace the UUIDs):

-- Quick Admin Setup:
UPDATE public.users SET is_admin = true, subscription_tier = 'premium', subscription_status = 'active' WHERE id = 'PASTE-USER-ID-HERE';

-- Quick Basic Setup:
UPDATE public.users SET is_admin = false, subscription_tier = 'basic', subscription_status = 'active' WHERE id = 'PASTE-USER-ID-HERE';

-- Quick Free Trial Setup:
UPDATE public.users SET is_admin = false, subscription_tier = 'free_trial', subscription_status = 'trialing', free_trial_start_date = NOW(), free_trial_end_date = NOW() + INTERVAL '14 days' WHERE id = 'PASTE-USER-ID-HERE';

-- ============================================
-- TROUBLESHOOTING
-- ============================================

-- If the is_admin column doesn't exist yet, add it:
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- If subscription columns don't exist, add them:
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS subscription_tier text CHECK (subscription_tier IN ('free_trial', 'basic', 'premium')),
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive', 'trialing', 'canceled', 'past_due'));

-- Check if columns exist:
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'users'
AND column_name IN ('is_admin', 'subscription_tier', 'subscription_status')
ORDER BY ordinal_position;