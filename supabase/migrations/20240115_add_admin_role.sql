-- Add admin role support to users table
-- This migration adds an is_admin column and updates RLS policies

-- Add is_admin column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- Create index for admin users
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON public.users(is_admin);

-- Update RLS policies to allow admin access to all data
-- First, drop existing policies if they exist
DO $$ 
BEGIN
    -- Drop existing policies safely
    DROP POLICY IF EXISTS "Users can view own record" ON public.users;
    DROP POLICY IF EXISTS "Users can update own record" ON public.users;
    DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
    DROP POLICY IF EXISTS "Admins can update all users" ON public.users;
EXCEPTION
    WHEN undefined_object THEN
        NULL;
END $$;

-- Create new policies with admin support
-- Users can view their own record
CREATE POLICY "Users can view own record" ON public.users
    FOR SELECT USING (auth.uid() = id);

-- Users can update their own record
CREATE POLICY "Users can update own record" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Admins can view all users
CREATE POLICY "Admins can view all users" ON public.users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- Admins can update all users
CREATE POLICY "Admins can update all users" ON public.users
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND is_admin = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply admin policies to other tables
-- Transactions
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Admins can view all transactions" ON public.transactions;
EXCEPTION
    WHEN undefined_object THEN
        NULL;
END $$;

CREATE POLICY "Admins can view all transactions" ON public.transactions
    FOR SELECT USING (public.is_admin());

-- Bills
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Admins can view all bills" ON public.bills;
EXCEPTION
    WHEN undefined_object THEN
        NULL;
END $$;

CREATE POLICY "Admins can view all bills" ON public.bills
    FOR SELECT USING (public.is_admin());

-- Accounts
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Admins can view all accounts" ON public.accounts;
EXCEPTION
    WHEN undefined_object THEN
        NULL;
END $$;

CREATE POLICY "Admins can view all accounts" ON public.accounts
    FOR SELECT USING (public.is_admin());

-- Comment on the new column
COMMENT ON COLUMN public.users.is_admin IS 'Indicates if the user has admin privileges. Set manually or through environment configuration.';

-- Create a trigger to automatically set admin status based on email
CREATE OR REPLACE FUNCTION public.check_admin_email()
RETURNS TRIGGER AS $$
DECLARE
    admin_emails text[];
    admin_domains text[];
    user_domain text;
BEGIN
    -- Get admin emails and domains from app_settings (you'll need to create this table)
    -- For now, we'll just return the user as-is
    -- In production, you'd check against a settings table or environment config
    
    -- Extract domain from email
    user_domain := split_part(NEW.email, '@', 2);
    
    -- You can manually update specific users to be admins
    -- UPDATE public.users SET is_admin = true WHERE email = 'admin@example.com';
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS check_admin_on_insert ON public.users;
CREATE TRIGGER check_admin_on_insert
    BEFORE INSERT ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.check_admin_email();

-- Create app_settings table for storing configuration
CREATE TABLE IF NOT EXISTS public.app_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    key text UNIQUE NOT NULL,
    value jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Insert default admin settings (can be updated later)
INSERT INTO public.app_settings (key, value) VALUES 
    ('admin_emails', '["admin@example.com"]'::jsonb),
    ('admin_domains', '["company.com"]'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Enable RLS on app_settings
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can view and update app_settings
CREATE POLICY "Admins can manage app_settings" ON public.app_settings
    FOR ALL USING (public.is_admin());

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.app_settings TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_admin_email() TO authenticated;