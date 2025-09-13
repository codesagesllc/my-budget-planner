// app/api/admin/users/[userId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  // Manual auth check since we need params
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
  
  // Check if user is admin
  const { data: userData } = await supabase
    .from('users')
    .select('email, is_admin')
    .eq('id', user.id)
    .single()
  
  const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(e => e.trim()) || []
  const isAdmin = userData?.is_admin || adminEmails.includes(userData?.email || '')
  
  if (!isAdmin) {
    return NextResponse.json(
      { error: 'Admin access required' },
      { status: 403 }
    )
  }
  
  // Get the userId from params and body
  const { userId } = await params
  const updates = await request.json()
  
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
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
  
  return NextResponse.json({ success: true, user: data })
}