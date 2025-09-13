// hooks/useUser.ts
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'

interface UserData extends User {
  subscription_tier?: string
  subscription_status?: string
  is_admin?: boolean
  free_trial_start_date?: string | null
  free_trial_end_date?: string | null
}

export function useUser() {
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchUser = async () => {
      try {
        // Get authenticated user
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
        
        if (authError || !authUser) {
          setUser(null)
          setLoading(false)
          return
        }

        // Get user data from users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('subscription_tier, subscription_status, is_admin, email, free_trial_start_date, free_trial_end_date')
          .eq('id', authUser.id)
          .single()

        if (userError) {
          console.error('Error fetching user data:', userError)
          setUser(authUser) // Fall back to auth user
        } else {
          // Merge auth user with database user data
          setUser({
            ...authUser,
            ...userData,
            email: userData.email || authUser.email,
          })
        }
      } catch (error) {
        console.error('Error in fetchUser:', error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    fetchUser()

    // Set up listener for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchUser()
      } else {
        setUser(null)
        setLoading(false)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return { user, loading }
}