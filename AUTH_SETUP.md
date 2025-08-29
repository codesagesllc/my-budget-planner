# 🔐 Authentication Setup Guide

## Current Status
Your app now has TWO authentication methods:
1. **Email/Password** - Traditional signup/login
2. **Google OAuth** - One-click Google sign-in

## Setting Up Google Authentication

### Step 1: Enable Google Provider in Supabase

1. **Go to your Supabase Auth Providers:**
   https://supabase.com/dashboard/project/ftnihylyezhlzzvolltr/auth/providers

2. **Find Google in the list and click to expand**

3. **Enable Google provider** (toggle it ON)

### Step 2: Get Google OAuth Credentials

1. **Go to Google Cloud Console:**
   https://console.cloud.google.com/

2. **Create a new project or select existing**

3. **Enable Google+ API:**
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API"
   - Click and Enable it

4. **Create OAuth 2.0 Credentials:**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application"
   - Name: "Budget Planner"
   
5. **Add Authorized URLs:**
   - **Authorized JavaScript origins:**
     ```
     https://ftnihylyezhlzzvolltr.supabase.co
     ```
   
   - **Authorized redirect URIs:**
     ```
     https://ftnihylyezhlzzvolltr.supabase.co/auth/v1/callback
     ```

6. **Copy your credentials:**
   - Client ID
   - Client Secret

### Step 3: Add Credentials to Supabase

1. **Go back to Supabase Google provider settings**

2. **Paste your:**
   - Google Client ID
   - Google Client Secret

3. **Save the configuration**

## Debugging Login Issues

### Check These Common Problems:

1. **Database Tables Not Created**
   ```sql
   -- Check if tables exist
   SELECT * FROM information_schema.tables 
   WHERE table_schema = 'public';
   ```
   
   If empty, run the migration from `supabase/migrations/001_initial_schema.sql`

2. **Email Confirmation Required**
   - Go to: https://supabase.com/dashboard/project/ftnihylyezhlzzvolltr/auth/configuration
   - Under "Email Auth"
   - **Disable** "Confirm email" for testing

3. **Check Auth Logs**
   - Go to: https://supabase.com/dashboard/project/ftnihylyezhlzzvolltr/logs-explorer
   - Run this query:
   ```sql
   select * from auth.audit_log_entries 
   order by created_at desc 
   limit 20;
   ```

4. **Service Role Key Missing**
   - Get it from: https://supabase.com/dashboard/project/ftnihylyezhlzzvolltr/settings/api
   - Add to `.env.local`:
   ```
   SUPABASE_SERVICE_ROLE_KEY=your_actual_key_here
   ```

## Test Authentication

### Method 1: Email/Password
1. Go to http://localhost:3000/signup
2. Create account with email/password
3. Check email if confirmation enabled
4. Login at http://localhost:3000/login

### Method 2: Google OAuth
1. Click "Continue with Google" button
2. Select your Google account
3. Automatically redirected to dashboard

## Troubleshooting

### "Invalid authentication credentials"
- Check if your Supabase URL and anon key are correct in `.env.local`
- Verify the database tables exist

### "User already registered"
- Try logging in instead of signing up
- Or use a different email

### Google login not working
- Ensure Google provider is enabled in Supabase
- Check if Google OAuth credentials are added
- Verify redirect URLs are correct

### Login successful but not redirecting
- Clear your browser cookies
- Try hard refresh (Ctrl+Shift+R)
- Check browser console for errors

## Quick SQL Debug Commands

Run these in Supabase SQL Editor:

```sql
-- Check if user exists
SELECT * FROM auth.users WHERE email = 'your-email@example.com';

-- Check user profile
SELECT * FROM public.users;

-- Check recent auth attempts
SELECT * FROM auth.audit_log_entries 
ORDER BY created_at DESC 
LIMIT 10;

-- Manually create user profile if missing
INSERT INTO public.users (id, email)
SELECT id, email FROM auth.users
WHERE id NOT IN (SELECT id FROM public.users);
```

## Next Steps

1. ✅ Run database migration
2. ✅ Get service role key
3. ✅ Test email/password signup
4. ✅ Setup Google OAuth (optional)
5. ✅ Disable email confirmation (for development)

Once these are done, authentication will work perfectly!
