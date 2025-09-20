import { NextRequest, NextResponse } from 'next/server'
import { createServerActionClient } from '@/lib/supabase/server'
import { aiService } from '@/lib/ai/services/ai-service'
import type { SubscriptionTier } from '@/lib/ai/services/ai-service'
import type { DatabaseTransaction, DatabaseBill, DatabaseIncomeSource } from '@/lib/types/database'

export async function POST(request: NextRequest) {
  try {
    const { userId, transactions, bills, incomeSources, goal } = await request.json()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createServerActionClient()

    // Get user subscription tier
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, subscription_tier')
      .eq('id', userId)
      .single()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const tier = (user.subscription_tier || 'free_trial') as SubscriptionTier

    try {
      // Generate insights using optimized AI service
      const insights = await aiService.generateInsights(
        userId,
        transactions,
        bills,
        goal,
        tier
      )

      // Get usage stats for the user
      const usage = await aiService.getUsageStats(userId)

      return NextResponse.json({
        success: true,
        insights,
        usage,
        tier,
      })
    } catch (aiError: any) {
      if (aiError.message.includes('limit reached')) {
        return NextResponse.json(
          { 
            error: aiError.message,
            upgradeRequired: true,
            tier,
          },
          { status: 429 }
        )
      }
      throw aiError
    }
  } catch (error) {
    console.error('Error generating insights:', error)
    return NextResponse.json(
      { error: 'Failed to generate insights' },
      { status: 500 }
    )
  }
}

// GET endpoint to check usage
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createServerActionClient()
    
    // Get user subscription tier
    const { data: user, error } = await supabase
      .from('users')
      .select('subscription_tier')
      .eq('id', userId)
      .single()
    
    if (error || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get usage stats
    const usage = await aiService.getUsageStats(userId)
    
    return NextResponse.json({
      usage,
      tier: user.subscription_tier || 'free_trial',
    })
  } catch (error) {
    console.error('Error getting usage stats:', error)
    return NextResponse.json(
      { error: 'Failed to get usage stats' },
      { status: 500 }
    )
  }
}
