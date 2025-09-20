import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all income sources for the user (active and inactive)
    const { data: allIncomeSources, error: allError } = await supabase
      .from('income_sources')
      .select('*')
      .eq('user_id', user.id)

    // Get only active income sources
    const { data: activeIncomeSources, error: activeError } = await supabase
      .from('income_sources')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (allError || activeError) {
      console.error('Error fetching income sources:', allError || activeError)
      return NextResponse.json({
        error: 'Failed to fetch income sources',
        details: allError || activeError
      }, { status: 500 })
    }

    // Calculate expected weekly and monthly income
    const weeklyIncome = activeIncomeSources?.reduce((total: number, source: any) => {
      let weeklyAmount = 0
      switch (source.frequency) {
        case 'weekly':
          weeklyAmount = source.amount
          break
        case 'biweekly':
          weeklyAmount = source.amount / 2
          break
        case 'monthly':
          weeklyAmount = source.amount / 4.33
          break
        case 'quarterly':
          weeklyAmount = source.amount / 13
          break
        case 'annual':
          weeklyAmount = source.amount / 52
          break
        default:
          weeklyAmount = source.amount / 4.33
      }
      return total + weeklyAmount
    }, 0) || 0

    const monthlyIncome = activeIncomeSources?.reduce((total: number, source: any) => {
      let monthlyAmount = 0
      switch (source.frequency) {
        case 'monthly':
          monthlyAmount = source.amount
          break
        case 'biweekly':
          monthlyAmount = source.amount * 2.17
          break
        case 'weekly':
          monthlyAmount = source.amount * 4.33
          break
        case 'quarterly':
          monthlyAmount = source.amount / 3
          break
        case 'annual':
          monthlyAmount = source.amount / 12
          break
        case 'one-time':
          monthlyAmount = source.amount
          break
        default:
          monthlyAmount = source.amount
      }
      return total + monthlyAmount
    }, 0) || 0

    return NextResponse.json({
      success: true,
      data: {
        userId: user.id,
        totalIncomeSources: allIncomeSources?.length || 0,
        activeIncomeSources: activeIncomeSources?.length || 0,
        weeklyIncome: Math.round(weeklyIncome * 100) / 100,
        monthlyIncome: Math.round(monthlyIncome * 100) / 100,
        allSources: allIncomeSources || [],
        activeSources: activeIncomeSources || []
      }
    })

  } catch (error) {
    console.error('Error in debug income sources:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: String(error)
    }, { status: 500 })
  }
}