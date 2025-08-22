import { NextRequest, NextResponse } from 'next/server'
import { createServerActionClient } from '@/lib/supabase/server'
import { parseSpreadsheetWithAI } from '@/lib/ai/anthropic'

export async function POST(request: NextRequest) {
  try {
    const { content, userId } = await request.json()
    
    if (!content || !userId) {
      return NextResponse.json(
        { error: 'Content and user ID are required' },
        { status: 400 }
      )
    }

    const supabase = await createServerActionClient()

    // Verify user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Use AI to parse the spreadsheet content
    const parsedData = await parseSpreadsheetWithAI(content)

    // Prepare bills for insertion
    const billsToInsert = parsedData.bills.map(bill => ({
      user_id: userId,
      name: bill.name,
      amount: bill.amount,
      due_date: bill.dueDate ? new Date(bill.dueDate).toISOString() : new Date().toISOString(),
      billing_cycle: bill.billingCycle || 'monthly',
      category: bill.category || null,
      is_active: true,
    }))

    // Insert bills into database
    const { data: insertedBills, error: insertError } = await supabase
      .from('bills')
      .insert(billsToInsert)
      .select()

    if (insertError) {
      console.error('Error inserting bills:', insertError)
      return NextResponse.json(
        { error: 'Failed to save bills' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      billsCount: insertedBills?.length || 0,
      summary: parsedData.summary,
      bills: insertedBills,
    })
  } catch (error) {
    console.error('Error processing bills upload:', error)
    return NextResponse.json(
      { error: 'Failed to process spreadsheet' },
      { status: 500 }
    )
  }
}
