import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { mapSubscriptionToRole } from '@/lib/auth/rbac'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile with subscription info
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Error fetching profile:', profileError)
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
    }

    // Check admin status
    const role = mapSubscriptionToRole(
      profile?.subscription_tier || null,
      user.email,
      profile?.is_admin,
      profile?.free_trial_start_date,
      profile?.free_trial_end_date
    )

    // Environment variables for admin access
    const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(e => e.trim()) || []
    const adminDomains = process.env.NEXT_PUBLIC_ADMIN_DOMAINS?.split(',').map(d => d.trim()) || []

    return NextResponse.json({
      success: true,
      data: {
        userId: user.id,
        email: user.email,
        role,
        isAdmin: profile?.is_admin || false,
        subscriptionTier: profile?.subscription_tier,
        adminEmails: adminEmails.length > 0 ? adminEmails : ['No admin emails configured'],
        adminDomains: adminDomains.length > 0 ? adminDomains : ['No admin domains configured'],
        hasAdminAccess: role === 'admin',
        debugInfo: {
          emailInAdminList: adminEmails.includes(user.email || ''),
          domainInAdminList: user.email ? adminDomains.includes(user.email.split('@')[1]) : false,
          profileIsAdmin: profile?.is_admin,
          envAdminEmails: process.env.NEXT_PUBLIC_ADMIN_EMAILS || 'Not set',
          envAdminDomains: process.env.NEXT_PUBLIC_ADMIN_DOMAINS || 'Not set'
        }
      }
    })

  } catch (error) {
    console.error('Error checking admin status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}