# 🚀 Budget Planner - Quick Setup Guide

## Your Supabase Project
- **Project URL**: https://ftnihylyezhlzzvolltr.supabase.co
- **Dashboard**: https://supabase.com/dashboard/project/ftnihylyezhlzzvolltr

## Setup Steps:

### 1. Get Service Role Key
- Go to: https://supabase.com/dashboard/project/ftnihylyezhlzzvolltr/settings/api
- Copy the `service_role` secret key
- Add it to your `.env.local` file

### 2. Run Database Migration
- Go to: https://supabase.com/dashboard/project/ftnihylyezhlzzvolltr/sql/new
- Copy ALL contents from: `supabase/migrations/001_initial_schema.sql`
- Paste and click "Run"

### 3. Configure Auth (Optional)
- Go to: https://supabase.com/dashboard/project/ftnihylyezhlzzvolltr/auth/configuration
- Disable "Confirm email" for easier development

### 4. Create Your Account
- Go to: http://localhost:3000/signup
- Sign up with email/password
- Then login at: http://localhost:3000/login

## Test Credentials (After Setup)
- Create a test account with any email
- No email confirmation needed if disabled

## Verify Everything Works:
1. ✅ Sign up creates account
2. ✅ Login redirects to dashboard
3. ✅ Dashboard shows empty state
4. ✅ Can connect Plaid account (sandbox)
5. ✅ Can upload bills spreadsheet

## Troubleshooting:

### Login not working?
- Check if tables are created in Supabase
- Verify service role key is added
- Try signing up first

### "User not found" error?
- The user profile trigger might not have fired
- Try creating a new account

### Still having issues?
- Check Supabase logs: https://supabase.com/dashboard/project/ftnihylyezhlzzvolltr/logs-explorer
- Restart dev server: `npm run dev`

## Your App Status:
- Frontend: ✅ Running at http://localhost:3000
- npm audit: ✅ 0 vulnerabilities
- Database: ⚠️ Needs migration run
- Auth: ⚠️ Needs service role key

Once you complete the setup steps above, everything will be working!
