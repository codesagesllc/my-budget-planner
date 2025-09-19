import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current month period
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    // Get user's bills with payment status
    const { data: bills, error: billsError } = await supabase
      .from('bills')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (billsError) {
      console.error('Error fetching bills:', billsError)
      return NextResponse.json(
        { error: 'Failed to fetch bills' },
        { status: 500 }
      )
    }

    // Get remaining balance from the remaining balance API
    let availableBalance = 0
    try {
      const balanceResponse = await fetch(`${request.url.replace('/api/bills/prioritization', '')}/api/balance/remaining`, {
        headers: {
          'Cookie': request.headers.get('cookie') || ''
        }
      })
      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json()
        availableBalance = balanceData.data?.remainingBalance || 0
      }
    } catch (error) {
      console.error('Error fetching remaining balance:', error)
      // Continue with 0 balance if API fails
    }

    // Calculate bill priorities and filter for current month
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const prioritizedBills = bills
      .filter((bill: any) => {
        // Include all unpaid bills and bills due this month
        if (!bill.is_paid) return true

        // For paid bills, check if they're in current period
        if (bill.current_period_start && bill.current_period_end) {
          const periodStart = new Date(bill.current_period_start)
          const periodEnd = new Date(bill.current_period_end)
          return today >= periodStart && today <= periodEnd
        }

        return false
      })
      .map((bill: any) => {
        // Calculate days until due
        const dueDate = new Date(bill.due_date)
        let daysUntilDue = 0

        if (bill.billing_cycle === 'one-time' || bill.billing_cycle === 'annual') {
          daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        } else {
          // For recurring bills, calculate next due date
          const storedDate = new Date(bill.due_date)
          const dueDay = storedDate.getDate()
          const nextDueDate = new Date(today.getFullYear(), today.getMonth(), dueDay)

          if (nextDueDate < today) {
            // Already overdue this month
            daysUntilDue = Math.ceil((today.getTime() - nextDueDate.getTime()) / (1000 * 60 * 60 * 24)) * -1
          } else {
            daysUntilDue = Math.ceil((nextDueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          }
        }

        // Calculate priority score (higher = more urgent)
        let priorityScore = 0
        let priorityReason = ''
        let priorityLevel: 'critical' | 'high' | 'medium' | 'low' = 'low'

        // Overdue bills get highest priority
        if (daysUntilDue < 0) {
          priorityScore = 1000 - daysUntilDue // More overdue = higher score
          priorityReason = 'Overdue'
          priorityLevel = 'critical'
        }
        // Due today or tomorrow
        else if (daysUntilDue <= 1) {
          priorityScore = 900 + (1 - daysUntilDue) * 50
          priorityReason = daysUntilDue === 0 ? 'Due today' : 'Due tomorrow'
          priorityLevel = 'critical'
        }
        // Due within 3 days
        else if (daysUntilDue <= 3) {
          priorityScore = 700 + (3 - daysUntilDue) * 50
          priorityReason = 'Due soon'
          priorityLevel = 'high'
        }
        // Due within a week
        else if (daysUntilDue <= 7) {
          priorityScore = 500 + (7 - daysUntilDue) * 20
          priorityReason = 'Due this week'
          priorityLevel = 'medium'
        }
        // Essential services (utilities, housing)
        else {
          const essentialCategories = ['electric', 'gas', 'water', 'rent', 'mortgage', 'internet', 'phone']
          if (essentialCategories.includes(bill.category?.toLowerCase() || '')) {
            priorityScore = 400 + (30 - daysUntilDue)
            priorityReason = 'Essential service'
            priorityLevel = 'medium'
          } else {
            priorityScore = 100 + (30 - daysUntilDue)
            priorityReason = 'Regular bill'
            priorityLevel = 'low'
          }
        }

        // Adjust for amount (higher amounts get slight priority boost)
        if (bill.amount > 500) {
          priorityScore += 50
        } else if (bill.amount > 200) {
          priorityScore += 20
        }

        return {
          id: bill.id,
          name: bill.name,
          amount: bill.amount,
          dueDate: bill.due_date,
          category: bill.category || 'Other',
          billingCycle: bill.billing_cycle,
          isPaid: bill.is_paid || false,
          isOverdue: daysUntilDue < 0,
          daysUntilDue,
          priorityScore,
          priorityReason,
          priorityLevel,
          canAfford: true, // Will be calculated below
          currentPeriodStart: bill.current_period_start,
          currentPeriodEnd: bill.current_period_end
        }
      })
      .sort((a: any, b: any) => {
        // Sort by paid status first (unpaid bills first), then by priority score
        if (a.isPaid !== b.isPaid) {
          return a.isPaid ? 1 : -1
        }
        return b.priorityScore - a.priorityScore
      })

    // Calculate affordability
    let runningBalance = availableBalance
    let totalAffordable = 0
    const unpaidBills = prioritizedBills.filter((bill: any) => !bill.isPaid)

    unpaidBills.forEach((bill: any) => {
      if (runningBalance >= bill.amount) {
        bill.canAfford = true
        runningBalance -= bill.amount
        totalAffordable += bill.amount
      } else {
        bill.canAfford = false
      }
    })

    // Calculate totals and strategy
    const totalUpcoming = unpaidBills.reduce((sum: number, bill: any) => sum + bill.amount, 0)
    const criticalBills = unpaidBills.filter((bill: any) => bill.priorityLevel === 'critical')
    const highPriorityBills = unpaidBills.filter((bill: any) => bill.priorityLevel === 'high')
    const shortfall = Math.max(0, totalUpcoming - availableBalance)

    const paymentStrategy = {
      canAffordAll: totalUpcoming <= availableBalance,
      recommendedOrder: prioritizedBills.filter((bill: any) => !bill.isPaid).map((bill: any) => bill.id),
      totalCritical: criticalBills.length,
      totalHigh: highPriorityBills.length,
      shortfall
    }

    // Estimate next paycheck (simplified - in reality this would come from income tracking)
    const nextPaycheck = availableBalance < totalUpcoming ? {
      estimatedDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks from now
      estimatedAmount: Math.max(1000, shortfall * 1.2) // Estimate based on shortfall
    } : null

    return NextResponse.json({
      success: true,
      data: {
        availableBalance: Math.round(availableBalance * 100) / 100,
        totalUpcoming: Math.round(totalUpcoming * 100) / 100,
        totalAffordable: Math.round(totalAffordable * 100) / 100,
        prioritizedBills,
        paymentStrategy,
        nextPaycheck
      }
    })

  } catch (error) {
    console.error('Error calculating bill prioritization:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}