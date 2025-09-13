// app/api/admin/users/[userId]/route.ts
import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'

export const PATCH = withAuth(
  async (req, { params }) => {
    const userId = params.userId
    const updates = await req.json()
    
    const supabase = createClient()
    
    // Update user subscription tier
    const { data, error } = await supabase
      .from('users')
      .update({
        subscription_tier: updates.subscription_tier,
        subscription_status: updates.subscription_status,
      })
      .eq('id', userId)
      .single()
    
    if (error) {
      return Response.json(
        { error: 'Failed to update user' },
        { status: 500 }
      )
    }
    
    return Response.json({ success: true, user: data })
  },
  { requiredRole: 'admin' }
)