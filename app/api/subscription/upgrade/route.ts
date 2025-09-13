// app/api/subscription/upgrade/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'

export const POST = withAuth(async (req) => {
  const { tier } = await req.json()
  const user = req.user!
  
  // Validate tier
  const validTiers = ['free_trial', 'basic', 'premium']
  if (!validTiers.includes(tier)) {
    return NextResponse.json(
      { error: 'Invalid subscription tier' },
      { status: 400 }
    )
  }
  
  // Don't allow downgrading to free_trial
  if (tier === 'free_trial' && user.role !== 'free_trial') {
    return NextResponse.json(
      { error: 'Cannot downgrade to free trial' },
      { status: 400 }
    )
  }
  
  const supabase = await createClient()
  
  try {
    // In production, you would:
    // 1. Create a Stripe checkout session
    // 2. Process payment
    // 3. Update subscription on successful payment
    
    // For now, we'll simulate the upgrade
    const { data, error } = await supabase
      .from('users')
      .update({
        subscription_tier: tier,
        subscription_status: 'active',
      })
      .eq('id', user.id)
      .single()
    
    if (error) {
      console.error('Subscription update error:', error)
      return NextResponse.json(
        { error: 'Failed to update subscription' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      subscription_tier: tier,
      message: `Successfully upgraded to ${tier}`,
    })
  } catch (error) {
    console.error('Upgrade error:', error)
    return NextResponse.json(
      { error: 'An error occurred during upgrade' },
      { status: 500 }
    )
  }
})
