import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { DatabaseBill } from '@/lib/types/database'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all bills for the user
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

    // Get payment history (we'll simulate this for now since we need to track payment dates over time)
    // In a production app, you'd have a payment_history table
    const paymentPatterns = bills.map((bill: DatabaseBill) => {
      // Simulate payment history analysis
      const totalCycles = 6 // Assume we're tracking for 6 months
      const onTimePayments = Math.floor(Math.random() * totalCycles) // Random for demo
      const latePayments = totalCycles - onTimePayments
      const onTimePercentage = totalCycles > 0 ? (onTimePayments / totalCycles) * 100 : 0
      const averageDaysLate = latePayments > 0 ? Math.floor(Math.random() * 5) + 1 : 0

      // Determine risk level
      let riskLevel: 'low' | 'medium' | 'high' = 'low'
      if (onTimePercentage < 50) riskLevel = 'high'
      else if (onTimePercentage < 80) riskLevel = 'medium'

      // Determine trend (simplified)
      const recentPerformance = Math.random()
      let trend: 'improving' | 'stable' | 'declining' = 'stable'
      if (recentPerformance > 0.6) trend = 'improving'
      else if (recentPerformance < 0.4) trend = 'declining'

      return {
        billId: bill.id,
        billName: bill.name,
        category: bill.category || 'Other',
        amount: bill.amount,
        totalPayments: totalCycles,
        onTimePayments,
        latePayments,
        onTimePercentage,
        averageDaysLate,
        lastPaymentDate: bill.payment_date,
        nextDueDate: bill.due_date,
        riskLevel,
        trend,
        billingCycle: bill.billing_cycle
      }
    })

    // Calculate overall statistics
    const totalPayments = paymentPatterns.reduce((sum: number, p: any) => sum + p.totalPayments, 0)
    const totalOnTime = paymentPatterns.reduce((sum: number, p: any) => sum + p.onTimePayments, 0)
    const overallOnTimeRate = totalPayments > 0 ? (totalOnTime / totalPayments) * 100 : 0

    // Find most reliable bills (top on-time performers)
    const mostReliableBills = paymentPatterns
      .filter((p: any) => p.onTimePercentage >= 80 && p.totalPayments > 2)
      .sort((a: any, b: any) => b.onTimePercentage - a.onTimePercentage)
      .slice(0, 5)

    // Find difficult bills (low on-time rate or high risk)
    const difficultBills = paymentPatterns
      .filter((p: any) => p.onTimePercentage < 80 || p.riskLevel === 'high')
      .sort((a: any, b: any) => a.onTimePercentage - b.onTimePercentage)
      .slice(0, 5)

    // Determine recent trend
    const trendCounts = paymentPatterns.reduce((acc: any, p: any) => {
      acc[p.trend]++
      return acc
    }, { improving: 0, stable: 0, declining: 0 })

    let recentTrend: 'improving' | 'stable' | 'declining' = 'stable'
    if (trendCounts.improving > trendCounts.declining) recentTrend = 'improving'
    else if (trendCounts.declining > trendCounts.improving) recentTrend = 'declining'

    // Generate monthly stats (simplified)
    const monthlyStats = [
      { month: 'Current', onTimeRate: overallOnTimeRate, totalPaid: totalOnTime },
      { month: 'Last Month', onTimeRate: Math.max(0, overallOnTimeRate + (Math.random() - 0.5) * 20), totalPaid: totalOnTime - Math.floor(Math.random() * 3) },
      { month: '2 Months Ago', onTimeRate: Math.max(0, overallOnTimeRate + (Math.random() - 0.5) * 30), totalPaid: totalOnTime - Math.floor(Math.random() * 5) }
    ]

    return NextResponse.json({
      success: true,
      data: {
        overallOnTimeRate: Math.round(overallOnTimeRate * 100) / 100,
        totalBillsPaid: paymentPatterns.length,
        mostReliableBills,
        difficultBills,
        recentTrend,
        monthlyStats
      }
    })

  } catch (error) {
    console.error('Error calculating payment tracking:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}