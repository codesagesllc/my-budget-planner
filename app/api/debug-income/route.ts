import { NextRequest, NextResponse } from 'next/server'
import { createServerComponentClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerComponentClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Check if income_sources table exists and fetch data
    const { data: incomeSources, error: incomeError } = await supabase
      .from('income_sources')
      .select('*')
      .eq('user_id', user.id)

    // Check if bills exist
    const { data: bills, error: billsError } = await supabase
      .from('bills')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)

    // Enhanced monthly income calculation with detailed debugging
    const calculateMonthlyIncome = (sources: any[]) => {
      if (!sources || sources.length === 0) return { total: 0, breakdown: [] }
      
      const currentDate = new Date()
      const currentMonth = currentDate.getMonth()
      const currentYear = currentDate.getFullYear()
      const monthStart = new Date(currentYear, currentMonth, 1)
      const monthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999)
      
      const breakdown: any[] = []
      let total = 0
      
      sources.forEach(income => {
        if (!income.is_active) {
          breakdown.push({
            name: income.name,
            amount: income.amount,
            frequency: income.frequency,
            calculated: 0,
            reason: 'Inactive'
          })
          return
        }
        
        // Handle one-time income with date range
        if (income.frequency === 'one-time') {
          if (!income.start_date) {
            breakdown.push({
              name: income.name,
              amount: income.amount,
              frequency: income.frequency,
              calculated: 0,
              reason: 'No start date'
            })
            return
          }
          
          const startDate = new Date(income.start_date)
          
          if (income.end_date) {
            const endDate = new Date(income.end_date)
            
            // Check if this income period overlaps with current month
            if (startDate <= monthEnd && endDate >= monthStart) {
              // Calculate the overlap period
              const effectiveStart = startDate > monthStart ? startDate : monthStart
              const effectiveEnd = endDate < monthEnd ? endDate : monthEnd
              
              // Calculate days
              const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
              const monthDays = Math.ceil((effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
              
              // Prorate the amount
              const proratedAmount = (Number(income.amount) * monthDays) / totalDays
              
              breakdown.push({
                name: income.name,
                amount: income.amount,
                frequency: income.frequency,
                calculated: proratedAmount,
                reason: `Prorated: ${monthDays}/${totalDays} days`,
                dates: {
                  start: income.start_date,
                  end: income.end_date,
                  effectiveStart: effectiveStart.toISOString(),
                  effectiveEnd: effectiveEnd.toISOString()
                }
              })
              
              total += proratedAmount
            } else {
              breakdown.push({
                name: income.name,
                amount: income.amount,
                frequency: income.frequency,
                calculated: 0,
                reason: 'Outside current month',
                dates: {
                  start: income.start_date,
                  end: income.end_date,
                  monthStart: monthStart.toISOString(),
                  monthEnd: monthEnd.toISOString()
                }
              })
            }
          } else {
            // No end date, check if start is in current month
            if (startDate >= monthStart && startDate <= monthEnd) {
              breakdown.push({
                name: income.name,
                amount: income.amount,
                frequency: income.frequency,
                calculated: Number(income.amount),
                reason: 'One-time in current month'
              })
              total += Number(income.amount)
            } else {
              breakdown.push({
                name: income.name,
                amount: income.amount,
                frequency: income.frequency,
                calculated: 0,
                reason: 'Not in current month'
              })
            }
          }
        } else {
          // Handle recurring income
          const multipliers: Record<string, number> = {
            'monthly': 1,
            'biweekly': 2.16667,
            'weekly': 4.33333,
            'quarterly': 0.33333,
            'annual': 0.08333,
          }
          
          const multiplier = multipliers[income.frequency] || 0
          const calculated = Number(income.amount) * multiplier
          
          breakdown.push({
            name: income.name,
            amount: income.amount,
            frequency: income.frequency,
            calculated: calculated,
            reason: `Recurring ${income.frequency}`,
            multiplier: multiplier
          })
          
          total += calculated
        }
      })
      
      return { total, breakdown }
    }

    const incomeCalc = incomeSources ? calculateMonthlyIncome(incomeSources) : { total: 0, breakdown: [] }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email
      },
      currentDate: {
        now: new Date().toISOString(),
        month: new Date().getMonth(),
        year: new Date().getFullYear(),
        monthName: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      },
      incomeSources: {
        count: incomeSources?.length || 0,
        data: incomeSources || [],
        error: incomeError?.message || null,
        monthlyTotal: incomeCalc.total,
        breakdown: incomeCalc.breakdown
      },
      bills: {
        count: bills?.length || 0,
        data: bills || [],
        error: billsError?.message || null
      },
      debug: {
        tableExists: !incomeError || incomeError.code !== 'PGRST204',
        errorCode: incomeError?.code,
        errorMessage: incomeError?.message
      }
    })
  } catch (error) {
    console.error('Debug endpoint error:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}