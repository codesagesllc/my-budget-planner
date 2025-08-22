# Deployment Guide for Budget Planner

## Quick Start Deployment to Vercel

### Prerequisites
1. ✅ Code is already in GitHub repository
2. ✅ Vercel project is already created
3. ⚠️ Need to set up Supabase and get API keys
4. ⚠️ Need to get Anthropic API key

### Step 1: Set up Supabase

1. **Create Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Save your database password

2. **Run Database Migration**
   - In Supabase Dashboard, go to SQL Editor
   - Click "New Query"
   - Copy contents from `supabase/migrations/001_initial_schema.sql`
   - Run the query

3. **Get API Keys**
   - Go to Settings > API
   - Copy:
     - Project URL
     - anon public key
     - service_role secret key

### Step 2: Get Anthropic API Key

1. Sign up at [console.anthropic.com](https://console.anthropic.com)
2. Go to API Keys
3. Create a new key
4. Copy the key (starts with `sk-ant-`)

### Step 3: Configure Vercel Environment Variables

1. **Go to Vercel Dashboard**
   ```
   https://vercel.com/code-sages/my-budget-planner/settings/environment-variables
   ```

2. **Add the following environment variables:**

   | Name | Value | Environment |
   |------|-------|-------------|
   | `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase URL | All |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your anon key | All |
   | `SUPABASE_SERVICE_ROLE_KEY` | Your service role key | All |
   | `PLAID_CLIENT_ID` | `68a75bb19009c300280ac2d2` | All |
   | `PLAID_SECRET` | `sandbox-bf9c138604472a806c192c7ed6bf41` | All |
   | `PLAID_ENV` | `sandbox` | All |
   | `PLAID_PRODUCTS` | `transactions,accounts,liabilities` | All |
   | `PLAID_COUNTRY_CODES` | `US` | All |
   | `ANTHROPIC_API_KEY` | Your Anthropic API key | All |
   | `NEXT_PUBLIC_APP_URL` | `https://my-budget-planner.vercel.app` | Production |

### Step 4: Deploy

1. **Push your changes to GitHub**
   ```bash
   git add .
   git commit -m "Complete budget planner implementation"
   git push origin main
   ```

2. **Vercel will automatically deploy**
   - Check deployment at: https://vercel.com/code-sages/my-budget-planner
   - Your app will be live at: https://my-budget-planner.vercel.app

### Step 5: Test Your Deployment

1. Visit your deployed app
2. Create a test account
3. Try connecting a Plaid sandbox account:
   - Username: `user_good`
   - Password: `pass_good`
4. Upload a sample bills spreadsheet
5. Generate AI insights

## Production Checklist

Before going to production:

- [ ] Replace Plaid sandbox credentials with production credentials
- [ ] Set up custom domain in Vercel
- [ ] Enable Supabase email verification
- [ ] Set up monitoring (Vercel Analytics)
- [ ] Configure rate limiting for API routes
- [ ] Set up error tracking (Sentry)
- [ ] Review and tighten RLS policies
- [ ] Set up database backups
- [ ] Configure spend alerts for Anthropic API

## Troubleshooting Common Deployment Issues

### Build Fails
- Check all environment variables are set
- Verify TypeScript has no errors: `npm run type-check`
- Check build logs in Vercel dashboard

### Database Connection Issues
- Verify Supabase URL is correct
- Check if RLS policies are enabled
- Ensure migrations have been run

### Plaid Not Working
- For production, update to production credentials
- Verify webhook URL if using webhooks
- Check Plaid dashboard for errors

### AI Features Not Working
- Verify Anthropic API key is valid
- Check API usage limits
- Monitor function timeouts in Vercel

## Support

For deployment issues:
- Check Vercel logs: https://vercel.com/code-sages/my-budget-planner/logs
- Review Supabase logs: Dashboard > Logs
- Monitor API usage: Anthropic Console & Plaid Dashboard

## Useful Links

- **Live App**: https://my-budget-planner.vercel.app
- **Vercel Dashboard**: https://vercel.com/code-sages/my-budget-planner
- **GitHub Repo**: https://github.com/codesagesllc/my-budget-planner
- **Supabase Dashboard**: https://app.supabase.com
- **Plaid Dashboard**: https://dashboard.plaid.com
- **Anthropic Console**: https://console.anthropic.com
