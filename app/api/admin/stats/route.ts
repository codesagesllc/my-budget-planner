// app/api/admin/stats/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'
import { redis } from '@/lib/redis'

export const GET = withAuth(
  async (req) => {
    // Create Supabase client
    const supabase = await createClient()
    
    // Get user statistics
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('subscription_tier, subscription_status')
    
    if (usersError) {
      return NextResponse.json(
        { error: 'Failed to fetch stats' },
        { status: 500 }
      )
    }
    
    // Calculate subscription breakdown
    const subscriptionBreakdown = {
      free_trial: 0,
      basic: 0,
      premium: 0,
    }
    
    let activeUsers = 0
    users.forEach(user => {
      if (user.subscription_tier) {
        subscriptionBreakdown[user.subscription_tier as keyof typeof subscriptionBreakdown]++
      }
      if (user.subscription_status === 'active') {
        activeUsers++
      }
    })
    
    // Calculate revenue (simplified)
    const totalRevenue = 
      subscriptionBreakdown.basic * 9.99 + 
      subscriptionBreakdown.premium * 29.99
    
    // Get AI usage stats from Redis (aggregated)
    const month = new Date().toISOString().slice(0, 7)
    let aiUsage = {
      insights: 0,
      billParsing: 0,
      incomeDetection: 0,
      debtStrategies: 0,
    }
    
    try {
      // This is simplified - in production you'd want to aggregate across all users
      const patterns = [
        `ai:usage:*:monthly_insights:${month}`,
        `ai:usage:*:bill_parsing:${month}`,
        `ai:usage:*:income_detection:${month}`,
        `ai:usage:*:debt_strategies:${month}`,
      ]
      
      for (const pattern of patterns) {
        const keys = await redis.keys(pattern)
        let total = 0
        for (const key of keys) {
          const value = await redis.get(key)
          total += parseInt(value as string || '0', 10)
        }
        
        if (pattern.includes('monthly_insights')) aiUsage.insights = total
        if (pattern.includes('bill_parsing')) aiUsage.billParsing = total
        if (pattern.includes('income_detection')) aiUsage.incomeDetection = total
        if (pattern.includes('debt_strategies')) aiUsage.debtStrategies = total
      }
    } catch (error) {
      console.error('Error fetching AI usage:', error)
    }
    
    return NextResponse.json({
      totalUsers: users.length,
      activeUsers,
      totalRevenue,
      subscriptionBreakdown,
      aiUsage,
    })
  },
  { requiredRole: 'admin' }
)
