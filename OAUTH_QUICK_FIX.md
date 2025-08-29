# ⚡ Quick OAuth Fix - 2 Minutes

## The Problem
Google says: `redirect_uri_mismatch` 

This means the redirect URL doesn't match what's in Google Console.

## The Solution - Add These URLs to Google

### 1. Open Google Cloud Console
https://console.cloud.google.com/apis/credentials

### 2. Click on your OAuth 2.0 Client ID

### 3. Add ALL these URLs exactly:

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

### 4. Click SAVE

### 5. Also Update Supabase Site URL

Go to: https://supabase.com/dashboard/project/ftnihylyezhlzzvolltr/auth/url-configuration

Set **Site URL** to:
```
http://localhost:3000
```

Set **Redirect URLs** to:
```
http://localhost:3000/**
https://**
```

### 6. Test Again

Try Google login in a new incognito window.

---

## 🚀 Or Just Use Email Login!

Email authentication is already working:

1. **Sign up:** http://localhost:3000/signup
2. **Login:** http://localhost:3000/login

You don't need Google OAuth - it's optional!

---

## Still Issues?

The most common mistakes:
- ❌ Wrong URLs (even one character off breaks it)
- ❌ Missing http:// or https://
- ❌ Trailing slashes
- ❌ Not saving in Google Console

Double-check the URLs are EXACTLY as shown above!
