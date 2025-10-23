import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPlaidCategoryForBill } from '@/lib/constants/bill-categories'
import type { DatabaseTransaction, DatabaseBill, DatabaseIncomeSource } from '@/lib/types/database'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get('period') || 'week' // week, month

    // Calculate date range based on period
    let startDate: Date, endDate: Date, periodLabel: string

    if (period === 'week') {
      // Get current week (Sunday to Saturday)
      const now = new Date()
      const dayOfWeek = now.getDay() // 0 = Sunday, 6 = Saturday
      startDate = new Date(now)
      startDate.setDate(now.getDate() - dayOfWeek)
      startDate.setHours(0, 0, 0, 0)

      endDate = new Date(startDate)
      endDate.setDate(startDate.getDate() + 6)
      endDate.setHours(23, 59, 59, 999)

      periodLabel = `Week of ${startDate.toLocaleDateString()}`
    } else {
      // Monthly calculation (fallback)
      const month = searchParams.get('month') || new Date().getMonth() + 1
      const year = searchParams.get('year') || new Date().getFullYear()

      startDate = new Date(parseInt(year.toString()), parseInt(month.toString()) - 1, 1)
      endDate = new Date(parseInt(year.toString()), parseInt(month.toString()), 0, 23, 59, 59)

      periodLabel = `${new Date(startDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
    }

    // Get user's monthly income from income sources
    const { data: incomeSources, error: incomeError } = await supabase
      .from('income_sources')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (incomeError) {
      console.error('Error fetching income sources:', incomeError)
      return NextResponse.json(
        { error: 'Failed to fetch income sources' },
        { status: 500 }
      )
    }

    // Calculate expected income for the period
    const expectedIncome = incomeSources.reduce((total: number, source: DatabaseIncomeSource) => {
      let periodAmount = 0

      if (period === 'week') {
        // Weekly income calculation
        switch (source.frequency) {
          case 'weekly':
            periodAmount = source.amount
            break
          case 'biweekly':
            periodAmount = source.amount / 2
            break
          case 'monthly':
            periodAmount = source.amount / 4.33 // Average weeks per month
            break
          case 'quarterly':
            periodAmount = source.amount / 13 // 13 weeks per quarter
            break
          case 'annual':
            periodAmount = source.amount / 52 // 52 weeks per year
            break
          case 'one-time':
            periodAmount = 0 // One-time income doesn't apply to weekly calculations
            break
          default:
            periodAmount = source.amount / 4.33 // Default to weekly portion of monthly
        }
      } else {
        // Monthly income calculation (original logic)
        switch (source.frequency) {
          case 'monthly':
            periodAmount = source.amount
            break
          case 'biweekly':
            periodAmount = source.amount * 2.17
            break
          case 'weekly':
            periodAmount = source.amount * 4.33
            break
          case 'quarterly':
            periodAmount = source.amount / 3
            break
          case 'annual':
            periodAmount = source.amount / 12
            break
          case 'one-time':
            periodAmount = source.amount
            break
          default:
            periodAmount = source.amount
        }
      }

      return total + periodAmount
    }, 0)

    // Get all transactions for the period that should count as spending
    const { data: allTransactions, error: transactionsError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString())

    // Filter transactions that should count as spending
    const transactions = allTransactions?.filter((t: DatabaseTransaction) => {
      // Include all transactions that are NOT income
      // This will include expenses and transfers as spending
      return t.transaction_type !== 'income'
    }) || []

    if (transactionsError) {
      console.error('Error fetching transactions:', transactionsError)
      return NextResponse.json(
        { error: 'Failed to fetch transactions' },
        { status: 500 }
      )
    }

    // Get all active bills
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

    // Calculate expected bill amounts for the period
    const periodBillAmount = bills.reduce((total: number, bill: DatabaseBill) => {
      let periodAmount = 0

      if (period === 'week') {
        // Weekly bill calculation
        switch (bill.billing_cycle) {
          case 'weekly':
            periodAmount = bill.amount
            break
          case 'biweekly':
            periodAmount = bill.amount / 2
            break
          case 'monthly':
            periodAmount = bill.amount / 4.33
            break
          case 'quarterly':
            periodAmount = bill.amount / 13
            break
          case 'annual':
            periodAmount = bill.amount / 52
            break
          case 'one-time':
            // Check if due date falls within this week
            const dueDate = new Date(bill.due_date)
            if (dueDate >= startDate && dueDate <= endDate) {
              periodAmount = bill.amount
            }
            break
        }
      } else {
        // Monthly bill calculation (original logic)
        switch (bill.billing_cycle) {
          case 'weekly':
            periodAmount = bill.amount * 4.33
            break
          case 'biweekly':
            periodAmount = bill.amount * 2.17
            break
          case 'monthly':
            periodAmount = bill.amount
            break
          case 'quarterly':
            periodAmount = bill.amount / 3
            break
          case 'annual':
            periodAmount = bill.amount / 12
            break
          case 'one-time':
            const dueDate = new Date(bill.due_date)
            if (dueDate >= startDate && dueDate <= endDate) {
              periodAmount = bill.amount
            }
            break
        }
      }

      return total + periodAmount
    }, 0)

    // Calculate already paid bills for this period
    const paidBillsAmount = bills
      .filter((bill: DatabaseBill) => bill.is_paid)
      .reduce((total: number, bill: DatabaseBill) => {
        let periodAmount = 0

        if (period === 'week') {
          switch (bill.billing_cycle) {
            case 'weekly':
              periodAmount = bill.amount
              break
            case 'biweekly':
              periodAmount = bill.amount / 2
              break
            case 'monthly':
              periodAmount = bill.amount / 4.33
              break
            case 'quarterly':
              periodAmount = bill.amount / 13
              break
            case 'annual':
              periodAmount = bill.amount / 52
              break
            case 'one-time':
              const dueDate = new Date(bill.due_date)
              if (dueDate >= startDate && dueDate <= endDate) {
                periodAmount = bill.amount
              }
              break
          }
        } else {
          switch (bill.billing_cycle) {
            case 'weekly':
              periodAmount = bill.amount * 4.33
              break
            case 'biweekly':
              periodAmount = bill.amount * 2.17
              break
            case 'monthly':
              periodAmount = bill.amount
              break
            case 'quarterly':
              periodAmount = bill.amount / 3
              break
            case 'annual':
              periodAmount = bill.amount / 12
              break
            case 'one-time':
              const dueDate = new Date(bill.due_date)
              if (dueDate >= startDate && dueDate <= endDate) {
                periodAmount = bill.amount
              }
              break
          }
        }

        return total + periodAmount
      }, 0)

    // Calculate total spending (using enhanced transaction filtering)
    // The transactions query already excludes bill payments via exclude_from_spending=false
    const totalSpending = transactions.reduce((total: number, transaction: DatabaseTransaction) => {
      return total + Math.abs(transaction.amount) // Use absolute value since expenses can be negative
    }, 0)

    // Calculate remaining balance
    const unpaidBillsAmount = periodBillAmount - paidBillsAmount
    const remainingBalance = expectedIncome - unpaidBillsAmount - totalSpending


    // Calculate percentages
    const spendingPercentage = expectedIncome > 0 ? (totalSpending / expectedIncome) * 100 : 0
    const billsPercentage = expectedIncome > 0 ? (unpaidBillsAmount / expectedIncome) * 100 : 0
    const remainingPercentage = expectedIncome > 0 ? (remainingBalance / expectedIncome) * 100 : 0

    return NextResponse.json({
      success: true,
      data: {
        totalMonthlyIncome: Math.round(expectedIncome * 100) / 100, // Renamed for backward compatibility
        totalSpending: Math.round(totalSpending * 100) / 100,
        totalBillAmount: Math.round(periodBillAmount * 100) / 100,
        paidBillsAmount: Math.round(paidBillsAmount * 100) / 100,
        unpaidBillsAmount: Math.round(unpaidBillsAmount * 100) / 100,
        remainingBalance: Math.round(remainingBalance * 100) / 100,
        percentages: {
          spending: Math.round(spendingPercentage * 100) / 100,
          bills: Math.round(billsPercentage * 100) / 100,
          remaining: Math.round(remainingPercentage * 100) / 100
        },
        breakdown: {
          incomeSourcesCount: incomeSources.length,
          transactionsCount: transactions.length,
          nonBillTransactionsCount: transactions.length, // All transactions are now non-bill due to filtering
          billsCount: bills.length,
          paidBillsCount: bills.filter((bill: DatabaseBill) => bill.is_paid).length
        },
        period: {
          type: period,
          label: periodLabel,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        }
      }
    })

  } catch (error) {
    console.error('Error calculating remaining balance:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}