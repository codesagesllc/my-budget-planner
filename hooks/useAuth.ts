import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Provider } from '@supabase/supabase-js'
import { appConfig } from '@/lib/config/app'

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
          redirectTo: appConfig.getAuthRedirectUrl('/auth/callback'),
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
          emailRedirectTo: appConfig.getAuthRedirectUrl('/auth/callback'),
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
        redirectTo: appConfig.getAuthRedirectUrl('/auth/reset-password'),
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
