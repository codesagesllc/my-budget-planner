import { NextRequest, NextResponse } from 'next/server'
import { createServerActionClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { userId, bill } = await request.json()
    
    if (!userId || !bill || !bill.name || !bill.amount) {
      return NextResponse.json(
        { error: 'User ID, bill name, and amount are required' },
        { status: 400 }
      )
    }

    console.log('Adding manual bill for user:', userId)

    const supabase = await createServerActionClient()

    // Verify user exists
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !authUser || authUser.id !== userId) {
      console.error('Auth user not found or mismatch:', authError)
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Check if user profile exists
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single()
    
    if (profileError && profileError.code === 'PGRST116') {
      // Profile doesn't exist, create it with service role
      console.log('Creating user profile for manual bill entry')
      const serviceSupabase = await createServiceRoleClient()
      
      await serviceSupabase
        .from('users')
        .insert({
          id: userId,
          email: authUser.email || '',
        })
    }

    // Prepare bill for insertion
    // For one-time bills, use the current year and month with the specified day
    // For recurring bills, use a default year/month with the specified day
    const currentDate = new Date()
    const year = bill.billingCycle === 'one-time' ? currentDate.getFullYear() : 2024
    const month = bill.billingCycle === 'one-time' ? currentDate.getMonth() + 1 : 1
    
    const billToInsert = {
      user_id: userId,
      name: bill.name,
      amount: parseFloat(bill.amount),
      due_date: bill.dueDate 
        ? new Date(`${year}-${String(month).padStart(2, '0')}-${String(bill.dueDate).padStart(2, '0')}`).toISOString() 
        : new Date().toISOString(),
      billing_cycle: bill.billingCycle || 'monthly',
      categories: bill.categories || ['Other'], // Only use categories array
      is_active: true,
    }

    // Insert bill using service role to bypass RLS
    const serviceSupabase = await createServiceRoleClient()
    const { data: insertedBill, error: insertError } = await serviceSupabase
      .from('bills')
      .insert(billToInsert)
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting bill:', insertError)
      return NextResponse.json(
        { error: 'Failed to save bill', details: insertError.message },
        { status: 500 }
      )
    }

    console.log('Bill added successfully:', insertedBill)

    return NextResponse.json({
      success: true,
      bill: insertedBill,
    })
  } catch (error) {
    console.error('Error adding manual bill:', error)
    return NextResponse.json(
      { error: 'Failed to add bill', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// DELETE method moved to /api/bills/[id]/route.ts for RESTful API design
