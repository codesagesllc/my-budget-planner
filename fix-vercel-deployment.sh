#!/bin/bash

echo "======================================="
echo "Vercel Deployment Fix Script"
echo "======================================="
echo ""

# Step 1: Ensure all directories exist
echo "Step 1: Creating required directories..."
mkdir -p hooks
mkdir -p lib/config
mkdir -p lib/supabase
mkdir -p lib/utils
mkdir -p components/ui
mkdir -p types

# Step 2: Create useAuth.ts if it doesn't exist
if [ ! -f "hooks/useAuth.ts" ]; then
echo "Creating hooks/useAuth.ts..."
cat > hooks/useAuth.ts << 'EOF'
import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Provider } from '@supabase/supabase-js'

interface AuthResult {
  error: string | null
  data?: any
}

export function useAuth() {
  const supabase = createClient()
  
  const signInWithEmail = useCallback(async (
    email: string, 
    password: string
  ): Promise<AuthResult> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) return { error: error.message }
      return { error: null, data }
    } catch (err) {
      return { error: 'An unexpected error occurred' }
    }
  }, [supabase])

  const signInWithProvider = useCallback(async (
    provider: Provider
  ): Promise<AuthResult> => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: typeof window !== 'undefined' 
            ? `${window.location.origin}/auth/callback`
            : '/auth/callback',
        },
      })
      
      if (error) return { error: error.message }
      return { error: null, data }
    } catch (err) {
      return { error: 'Failed to initiate provider login' }
    }
  }, [supabase])

  const signUp = useCallback(async (
    email: string,
    password: string
  ): Promise<AuthResult> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: typeof window !== 'undefined'
            ? `${window.location.origin}/auth/callback`
            : '/auth/callback',
        },
      })
      
      if (error) return { error: error.message }
      if (data?.user?.identities?.length === 0) {
        return { error: 'This email is already registered. Please sign in instead.' }
      }
      return { error: null, data }
    } catch (err) {
      return { error: 'An unexpected error occurred' }
    }
  }, [supabase])

  const signOut = useCallback(async (): Promise<AuthResult> => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) return { error: error.message }
      return { error: null }
    } catch (err) {
      return { error: 'Failed to sign out' }
    }
  }, [supabase])

  const checkSession = useCallback(async (): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser()
    return !!user
  }, [supabase])

  const resetPassword = useCallback(async (email: string): Promise<AuthResult> => {
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: typeof window !== 'undefined'
          ? `${window.location.origin}/auth/reset-password`
          : '/auth/reset-password',
      })
      
      if (error) return { error: error.message }
      return { error: null, data }
    } catch (err) {
      return { error: 'Failed to send password reset email' }
    }
  }, [supabase])

  return {
    signInWithEmail,
    signInWithProvider,
    signUp,
    signOut,
    checkSession,
    resetPassword,
  }
}
EOF
fi

# Step 3: Create lib/config/app.ts if it doesn't exist
if [ ! -f "lib/config/app.ts" ]; then
echo "Creating lib/config/app.ts..."
cat > lib/config/app.ts << 'EOF'
export const appConfig = {
  getAuthRedirectUrl: (path: string = '/auth/callback') => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}${path}`
    }
    
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` :
                    'http://localhost:3000'
    
    return `${baseUrl}${path}`
  },
  
  stripe: {
    publicKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
  },
  
  plaid: {
    publicKey: process.env.NEXT_PUBLIC_PLAID_PUBLIC_KEY || '',
    environment: process.env.NEXT_PUBLIC_PLAID_ENV || 'sandbox',
  },
  
  app: {
    name: 'My Budget Planner',
    description: 'AI-Powered Personal Finance Management',
    url: process.env.NEXT_PUBLIC_APP_URL || 'https://my-budget-planner.vercel.app',
  }
}
EOF
fi

# Step 4: Update LoginForm.tsx to remove appConfig dependency
echo "Updating LoginForm.tsx..."
sed -i "s/import { appConfig } from '@\/lib\/config\/app'//g" app/\(auth\)/login/LoginForm.tsx
sed -i "s/appConfig.getAuthRedirectUrl('\/auth\/callback')/typeof window !== 'undefined' ? \`\${window.location.origin}\/auth\/callback\` : '\/auth\/callback'/g" app/\(auth\)/login/LoginForm.tsx

# Step 5: Update signup page.tsx to remove appConfig dependency
echo "Updating signup/page.tsx..."
sed -i "s/import { appConfig } from '@\/lib\/config\/app'//g" app/\(auth\)/signup/page.tsx
sed -i "s/appConfig.getAuthRedirectUrl('\/auth\/callback')/typeof window !== 'undefined' ? \`\${window.location.origin}\/auth\/callback\` : '\/auth\/callback'/g" app/\(auth\)/signup/page.tsx

# Step 6: Git status check
echo ""
echo "Step 6: Checking git status..."
git status

echo ""
echo "Step 7: Adding files to git..."
git add hooks/
git add lib/config/
git add app/\(auth\)/
git add components/ui/
git add tsconfig.json
git add next.config.mjs
git add package.json

echo ""
echo "Step 8: Committing changes..."
git commit -m "Fix module resolution for Vercel deployment"

echo ""
echo "======================================="
echo "Fix complete! Now push to GitHub:"
echo "git push origin main"
echo "======================================="
