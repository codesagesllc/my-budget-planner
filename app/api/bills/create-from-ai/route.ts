import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface Bill {
  id: string
  user_id: string
  name: string
  amount: number
  due_date: string
  billing_cycle: string
  categories: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export async function POST(request: NextRequest) {
  try {
    const { userId, bills } = await request.json()
    
    if (!userId || !bills || bills.length === 0) {
      return NextResponse.json(
        { error: 'Missing required data' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    
    // Prepare bills for insertion
    const billsToInsert = bills.map((bill: any) => {
      // Determine billing cycle based on frequency
      let billing_cycle = bill.frequency
      if (bill.frequency === 'biweekly') {
        billing_cycle = 'biweekly'
      } else if (bill.frequency === 'annual') {
        billing_cycle = 'annual'
      } else if (bill.frequency === 'quarterly') {
        billing_cycle = 'quarterly'
      } else if (bill.frequency === 'weekly') {
        billing_cycle = 'weekly'
      } else if (!bill.isRecurring) {
        billing_cycle = 'one-time'
      }

      // Calculate due date
      let dueDate = new Date()
      if (bill.suggestedDueDate) {
        // Set to suggested day of current/next month
        dueDate.setDate(bill.suggestedDueDate)
        if (dueDate < new Date()) {
          dueDate.setMonth(dueDate.getMonth() + 1)
        }
      } else if (!bill.isRecurring) {
        // For one-time bills, set due date to next month
        dueDate.setMonth(dueDate.getMonth() + 1)
      }

      return {
        user_id: userId,
        name: bill.name,
        amount: bill.amount,
        due_date: dueDate.toISOString(),
        billing_cycle,
        categories: bill.categories || ['Other'],
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    })

    // Insert bills into database
    const { data, error } = await supabase
      .from('bills')
      .insert(billsToInsert)
      .select()

    if (error) {
      console.error('Error creating bills:', error)
      return NextResponse.json(
        { error: 'Failed to create bills' },
        { status: 500 }
      )
    }

    // If any bills are one-time payments, also create transaction records
    const oneTimePayments = bills.filter((bill: any) => !bill.isRecurring)
    if (oneTimePayments.length > 0 && data) {
      // Get user's default account (or first account)
      const { data: accounts } = await supabase
        .from('accounts')
        .select('id')
        .eq('user_id', userId)
        .limit(1)

      if (accounts && accounts.length > 0) {
        const accountId = accounts[0].id
        
        const transactionsToInsert = oneTimePayments.map((payment: any) => {
          // Find the created bill to link it
          const createdBill = data.find((b: Bill) => b.name === payment.name)
          
          return {
            user_id: userId,
            account_id: accountId,
            description: `One-time payment: ${payment.name}`,
            amount: -Math.abs(payment.amount), // Negative for expense
            date: new Date(payment.lastDate).toISOString(),
            category: payment.categories?.[0] || 'Other',
            categories: payment.categories || [],
            transaction_type: 'expense',
            pending: false,
            created_at: new Date().toISOString()
          }
        })

        await supabase
          .from('transactions')
          .insert(transactionsToInsert)
      }
    }

    return NextResponse.json({ 
      success: true,
      billsCreated: data?.length || 0,
      bills: data
    })
  } catch (error) {
    console.error('Error creating bills from AI:', error)
    return NextResponse.json(
      { error: 'Failed to create bills from AI detection' },
      { status: 500 }
    )
  }
}