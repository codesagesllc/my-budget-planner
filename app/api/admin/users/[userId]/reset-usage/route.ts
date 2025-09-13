// app/api/admin/users/[userId]/reset-usage/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { clearUsageStats } from '@/lib/auth/middleware'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  // Manual auth check since we need params
  const { createClient } = await import('@/lib/supabase/server')
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
  
  // Get the userId from params
  const { userId } = await params
  
  try {
    const result = await clearUsageStats(userId)
    
    return NextResponse.json({
      success: true,
      cleared: result.cleared,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to reset usage stats' },
      { status: 500 }
    )
  }
}