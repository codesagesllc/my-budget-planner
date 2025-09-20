// app/api/ai/detect-income/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { DatabaseTransaction } from '@/lib/types/database'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's transactions from the last 90 days
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setDate(threeMonthsAgo.getDate() - 90)

    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', threeMonthsAgo.toISOString().split('T')[0])
      .order('date', { ascending: false })

    if (transactionsError) {
      console.error('Error fetching transactions:', transactionsError)
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
    }

    // Simple income detection logic
    const detectedIncome: Array<{
      name: string
      amount: number
      frequency: string
      category: string
      confidence: number
      firstSeen: Date
      lastSeen: Date
      occurrences: number
      sourceTransactions: string[]
    }> = []

    if (transactions && transactions.length > 0) {
      // Group transactions by description and look for patterns
      const transactionGroups = new Map()

      transactions.forEach((transaction: DatabaseTransaction) => {
        // Look for income transactions (transaction_type should be 'income')
        if (transaction.transaction_type === 'income') {
          const key = transaction.description?.toLowerCase() || 'unknown'

          if (!transactionGroups.has(key)) {
            transactionGroups.set(key, [])
          }
          transactionGroups.get(key).push(transaction)
        }
      })

      // Analyze patterns for potential income
      transactionGroups.forEach((groupTransactions, description) => {
        if (groupTransactions.length >= 2) { // At least 2 occurrences
          const amounts = groupTransactions.map((t: DatabaseTransaction) => t.amount)
          const avgAmount = amounts.reduce((sum: number, amt: number) => sum + amt, 0) / amounts.length

          // Consider it income if it's a substantial amount and recurring
          if (avgAmount >= 100) {
            // Detect frequency based on time intervals
            let frequency = 'one-time'
            if (groupTransactions.length >= 2) {
              const dates = groupTransactions.map((t: DatabaseTransaction) => new Date(t.date)).sort((a: Date, b: Date) => a.getTime() - b.getTime())
              const intervals = []

              for (let i = 1; i < dates.length; i++) {
                const daysDiff = Math.round((dates[i].getTime() - dates[i-1].getTime()) / (1000 * 60 * 60 * 24))
                intervals.push(daysDiff)
              }

              const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length

              // Classify based on average interval
              if (avgInterval >= 6 && avgInterval <= 8) {
                frequency = 'weekly'
              } else if (avgInterval >= 13 && avgInterval <= 15) {
                frequency = 'biweekly'
              } else if (avgInterval >= 28 && avgInterval <= 35) {
                frequency = 'monthly'
              } else if (avgInterval >= 84 && avgInterval <= 96) {
                frequency = 'quarterly'
              } else if (avgInterval >= 350 && avgInterval <= 380) {
                frequency = 'annual'
              } else {
                frequency = 'monthly' // Default for irregular but recurring
              }
            }

            // Categorize income type
            let category = 'other'
            const desc = description.toLowerCase()
            if (desc.includes('payroll') || desc.includes('salary') || desc.includes('wage')) {
              category = 'salary'
            } else if (desc.includes('freelance') || desc.includes('contract')) {
              category = 'freelance'
            } else if (desc.includes('interest') || desc.includes('dividend')) {
              category = 'investment'
            } else if (desc.includes('rental') || desc.includes('rent')) {
              category = 'rental'
            }

            // Sort transactions by date to get first and last
            const sortedTransactions = groupTransactions.sort((a: DatabaseTransaction, b: DatabaseTransaction) => new Date(a.date).getTime() - new Date(b.date).getTime())
            const firstTransaction = sortedTransactions[0]
            const lastTransaction = sortedTransactions[sortedTransactions.length - 1]

            detectedIncome.push({
              name: firstTransaction.description || 'Unknown Income',
              amount: Math.round(avgAmount),
              frequency: frequency as 'monthly' | 'biweekly' | 'weekly' | 'quarterly' | 'annual' | 'one-time',
              category,
              confidence: groupTransactions.length >= 3 ? 85 : groupTransactions.length >= 2 ? 70 : 50,
              firstSeen: new Date(firstTransaction.date),
              lastSeen: new Date(lastTransaction.date),
              occurrences: groupTransactions.length,
              sourceTransactions: groupTransactions.map((t: DatabaseTransaction) => t.id)
            })
          }
        }
      })
    }

    console.log(`Income Detection Results:`)
    console.log(`- Total transactions analyzed: ${transactions?.length || 0}`)
    console.log(`- Income transactions found: ${transactions?.filter((t: DatabaseTransaction) => t.transaction_type === 'income').length || 0}`)
    console.log(`- Detected income patterns: ${detectedIncome.length}`)
    console.log(`- Patterns:`, detectedIncome.map(i => ({ name: i.name, amount: i.amount, frequency: i.frequency, confidence: i.confidence })))

    return NextResponse.json({
      success: true,
      detectedIncome: detectedIncome.slice(0, 10), // Limit to top 10
      totalTransactionsAnalyzed: transactions?.length || 0,
      incomeTransactionsFound: transactions?.filter((t: DatabaseTransaction) => t.transaction_type === 'income').length || 0,
      analysisDate: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Error detecting income:', error)
    return NextResponse.json(
      {
        error: 'Failed to detect income',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}