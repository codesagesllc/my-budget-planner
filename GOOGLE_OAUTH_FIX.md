# 🔐 Google OAuth Setup - Quick Fix

## Error: redirect_uri_mismatch

This error means Google doesn't recognize the redirect URL your app is using.

## ✅ Quick Fix Steps:

### 1. Go to Google Cloud Console
https://console.cloud.google.com/apis/credentials

### 2. Edit Your OAuth 2.0 Client

Click on your OAuth client to edit it.

### 3. Add These EXACT URLs:

**Authorized JavaScript origins:**
```
http://localhost:3000
https://ftnihylyezhlzzvolltr.supabase.co
```

**Authorized redirect URIs:**
```
http://localhost:3000/auth/callback
https://ftnihylyezhlzzvolltr.supabase.co/auth/v1/callback
```

⚠️ **IMPORTANT**: Add ALL four URLs exactly as shown above!

### 4. Save Changes in Google Console

Click "SAVE" at the bottom.

### 5. Update Supabase Settings

Go to: https://supabase.com/dashboard/project/ftnihylyezhlzzvolltr/auth/providers

In the Google provider settings, make sure you have:
- ✅ Google enabled (toggle ON)
- ✅ Client ID from Google Console
- ✅ Client Secret from Google Console

### 6. Clear Browser Cache & Restart

```powershell
# Restart your dev server
npm run dev
```

Then try Google login again in an incognito/private browser window.

## 🎯 Complete Google Setup from Scratch

If you haven't set up Google OAuth yet:

### Step 1: Create Google Cloud Project

1. Go to: https://console.cloud.google.com/
2. Create new project: "Budget Planner"
3. Select the project

### Step 2: Configure OAuth Consent Screen

1. Go to "APIs & Services" > "OAuth consent screen"
2. Choose "External" user type
3. Fill in:
   - App name: Budget Planner
   - User support email: your-email@gmail.com
   - Developer contact: your-email@gmail.com
4. Add scopes: email, profile, openid
5. Add test users: your-email@gmail.com

### Step 3: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Application type: "Web application"
4. Name: "Budget Planner Web"
5. Add the URLs from above
6. Create and copy Client ID & Secret

### Step 4: Add to Supabase

1. Go to: https://supabase.com/dashboard/project/ftnihylyezhlzzvolltr/auth/providers
2. Find Google, click to expand
3. Toggle ON
4. Paste Client ID and Client Secret
5. Save

## 🧪 Test It

1. Open private/incognito browser window
2. Go to: http://localhost:3000/login
3. Click "Continue with Google"
4. Should redirect to Google login
5. After login, should redirect back to dashboard

## 💡 Still Not Working?

### Check These:
- ✅ URLs are EXACTLY as shown (no trailing slashes)
- ✅ Both localhost AND Supabase URLs are added
- ✅ Google project is not in "Testing" mode with expired consent
- ✅ Client ID and Secret are correctly copied to Supabase
- ✅ Browser cache is cleared

### Debug URL:
When you click Google login, check the URL it's trying to use.
The `redirect_uri` parameter should be:
```
http://localhost:3000/auth/callback
```

### Alternative: Skip Google for Now

Email/password authentication works fine! You can:
1. Sign up with email at: http://localhost:3000/signup
2. Login with email at: http://localhost:3000/login

Google OAuth is optional - the app works perfectly with email auth!

## Your Status:
- ✅ App running
- ✅ Email auth ready
- ⚠️ Google OAuth needs redirect URIs fixed
- ⚠️ Database tables need to be created

Once you add the redirect URIs to Google Console, OAuth will work!
