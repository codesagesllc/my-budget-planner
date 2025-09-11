# Authentication URL Configuration

## Overview
This application uses dynamic URL configuration to handle authentication redirects properly across different environments (local development, Vercel deployment, and custom domains).

## Setup Instructions

### 1. Environment Variables

#### For Local Development
In your `.env.local` file:
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

#### For Vercel Deployment
In your Vercel dashboard environment variables:
```env
NEXT_PUBLIC_APP_URL=https://my-budget-planner-seven.vercel.app
```

#### For Custom Domain (when you purchase one)
Update in Vercel dashboard:
```env
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXT_PUBLIC_CUSTOM_DOMAIN=https://yourdomain.com
```

### 2. Supabase Configuration

You need to add the redirect URLs to your Supabase project:

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Authentication** → **URL Configuration**
4. Add these URLs to **Redirect URLs** (one per line):

```
http://localhost:3000/auth/callback
http://localhost:3000/auth/reset-password
https://my-budget-planner-seven.vercel.app/auth/callback
https://my-budget-planner-seven.vercel.app/auth/reset-password
```

When you get a custom domain, also add:
```
https://yourdomain.com/auth/callback
https://yourdomain.com/auth/reset-password
```

### 3. How It Works

The `lib/config/app.ts` file automatically determines the correct URL based on:

1. **NEXT_PUBLIC_APP_URL** - If set, uses this (highest priority)
2. **NEXT_PUBLIC_VERCEL_URL** - Automatically set by Vercel
3. **Fallback** - Uses `http://localhost:3000` for local development

### 4. Testing

To verify the configuration is working:

1. **Local Development**: 
   - Sign up should send emails with `http://localhost:3000/?code=...`
   
2. **Vercel Deployment**:
   - Sign up should send emails with `https://my-budget-planner-seven.vercel.app/?code=...`

3. **Custom Domain** (when configured):
   - Sign up should send emails with `https://yourdomain.com/?code=...`

### 5. Troubleshooting

If redirect URLs are not working:

1. **Check Supabase Dashboard**: Ensure all URLs are added to Redirect URLs
2. **Check Environment Variables**: Verify `NEXT_PUBLIC_APP_URL` is set correctly
3. **Clear Browser Cache**: Sometimes old redirects are cached
4. **Check Vercel Environment**: Ensure environment variables are set in Vercel dashboard

### 6. Security Notes

- Always use HTTPS in production
- Don't expose service role keys in frontend code
- Keep development and production URLs separate
- Regularly rotate API keys

## Code Structure

- `lib/config/app.ts` - Central configuration for URLs
- `hooks/useAuth.ts` - Authentication hook using the config
- All auth-related components use `appConfig.getAuthRedirectUrl()`

This ensures consistent URL handling across the entire application.
