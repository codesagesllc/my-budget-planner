// app/api/admin/users/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'

interface UserData {
  id: string
  email: string
  subscription_tier: string | null
  subscription_status: string | null
  created_at: string
  free_trial_start_date: string | null
  free_trial_end_date: string | null
  subscription_end_date: string | null
  is_admin: boolean | null
}

export const GET = withAuth(
  async (req) => {
    // Create Supabase client
    const supabase = await createClient()
    
    // Get all users from database
    const { data: users, error } = await supabase
      .from('users')
      .select(`
        id,
        email,
        subscription_tier,
        subscription_status,
        created_at,
        free_trial_start_date,
        free_trial_end_date,
        subscription_end_date,
        is_admin
      `)
      .order('created_at', { ascending: false })
    
    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      )
    }
    
    // Get usage stats for each user
    const usersWithStats = await Promise.all(
      users.map(async (user: UserData) => {
        // You could fetch usage stats from Redis here
        return {
          ...user,
          usage_stats: {} // Placeholder for actual stats
        }
      })
    )
    
    return NextResponse.json({ users: usersWithStats })
  },
  { requiredRole: 'admin' }
)