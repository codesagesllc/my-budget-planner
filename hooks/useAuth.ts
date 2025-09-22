import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Provider } from '@supabase/supabase-js'

interface AuthResult {
  error: string | null
  data?: any
}

function getRedirectUrl(path: string = '/auth/callback'): string {
  // Always use pocketwiseai.com for OAuth redirects to maintain consistent Supabase config
  return `https://www.pocketwiseai.com${path}`

  // Check if running on Vercel
  if (process.env.VERCEL_URL) {
    // Running on Vercel
    return `https://${process.env.VERCEL_URL}${path}`
  }

  // Production with custom domain
  return `https://www.pocketwiseai.com${path}`
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
      // Get current origin to include in callback
      const currentOrigin = typeof window !== 'undefined' ? window.location.origin : ''

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${getRedirectUrl('/auth/callback')}?origin=${encodeURIComponent(currentOrigin)}`,
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
      // Get current origin to include in callback
      const currentOrigin = typeof window !== 'undefined' ? window.location.origin : ''

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${getRedirectUrl('/auth/callback')}?origin=${encodeURIComponent(currentOrigin)}`,
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
        redirectTo: getRedirectUrl('/auth/reset-password'),
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
