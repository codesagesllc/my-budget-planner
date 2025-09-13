-- ============================================
-- SIMPLE USER ROLE UPDATE SCRIPT
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: First, check your existing users
SELECT id, email, subscription_tier, subscription_status
FROM public.users
LIMIT 10;

-- Step 2: Copy a user ID from above and paste it below

-- ============================================
-- MAKE A USER AN ADMIN (with full access)
-- ============================================
-- Replace the ID below with your actual user ID
UPDATE public.users 
SET 
    is_admin = true,
    subscription_tier = 'premium',
    subscription_status = 'active',
    free_trial_used = true,
    subscription_end_date = NOW() + INTERVAL '1 year'
WHERE id = 'PASTE-YOUR-ADMIN-USER-ID-HERE';

-- ============================================
-- MAKE A USER A BASIC SUBSCRIBER
-- ============================================
-- Replace the ID below with your actual user ID
UPDATE public.users 
SET 
    is_admin = false,
    subscription_tier = 'basic', 
    subscription_status = 'active',
    free_trial_used = true,
    subscription_end_date = NOW() + INTERVAL '30 days'
WHERE id = 'PASTE-YOUR-BASIC-USER-ID-HERE';

-- ============================================
-- VERIFY THE CHANGES
-- ============================================
SELECT 
    id,
    email,
    CASE 
        WHEN is_admin = true THEN '👑 ADMIN'
        WHEN subscription_tier = 'premium' THEN '💎 PREMIUM'
        WHEN subscription_tier = 'basic' THEN '📘 BASIC'
        WHEN subscription_tier = 'free_trial' THEN '🆓 FREE TRIAL'
        ELSE '❌ NO SUBSCRIPTION'
    END as role,
    subscription_status as status,
    subscription_end_date as expires
FROM public.users
WHERE subscription_tier IS NOT NULL OR is_admin = true
ORDER BY is_admin DESC, subscription_tier DESC;