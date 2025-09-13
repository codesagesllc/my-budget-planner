import { NextRequest, NextResponse } from 'next/server'
import { createServerActionClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: billId } = await params
    const { userId, bill } = await request.json()
    
    if (!userId || !billId || !bill || !bill.name || !bill.amount) {
      return NextResponse.json(
        { error: 'User ID, bill ID, name, and amount are required' },
        { status: 400 }
      )
    }

    console.log('Updating bill:', billId, 'for user:', userId)

    const supabase = await createServerActionClient()

    // Verify user exists
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !authUser || authUser.id !== userId) {
      console.error('Auth user not found or mismatch:', authError)
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Prepare bill for update
    const currentDate = new Date()
    const year = bill.billingCycle === 'one-time' ? currentDate.getFullYear() : 2024
    const month = bill.billingCycle === 'one-time' ? currentDate.getMonth() + 1 : 1
    
    const billToUpdate = {
      name: bill.name,
      amount: parseFloat(bill.amount),
      due_date: bill.dueDate 
        ? new Date(`${year}-${String(month).padStart(2, '0')}-${String(bill.dueDate).padStart(2, '0')}`).toISOString() 
        : new Date().toISOString(),
      billing_cycle: bill.billingCycle || 'monthly',
      categories: bill.categories || ['Other'], // Only use categories array
      is_active: true,
    }

    // Update bill using service role to bypass RLS
    const serviceSupabase = await createServiceRoleClient()
    const { data: updatedBill, error: updateError } = await serviceSupabase
      .from('bills')
      .update(billToUpdate)
      .eq('id', billId)
      .eq('user_id', userId) // Extra safety check
      .select()
      .single()

    if (updateError) {
      console.error('Error updating bill:', updateError)
      return NextResponse.json(
        { error: 'Failed to update bill', details: updateError.message },
        { status: 500 }
      )
    }

    console.log('Bill updated successfully:', updatedBill)

    return NextResponse.json({
      success: true,
      bill: updatedBill,
    })
  } catch (error) {
    console.error('Error updating bill:', error)
    return NextResponse.json(
      { error: 'Failed to update bill', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: billId } = await params
    const url = new URL(request.url)
    const userId = url.searchParams.get('userId')
    
    if (!billId || !userId) {
      return NextResponse.json(
        { error: 'Bill ID and User ID are required' },
        { status: 400 }
      )
    }

    const supabase = await createServerActionClient()

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user || user.id !== userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Delete bill using service role
    const serviceSupabase = await createServiceRoleClient()
    const { error: deleteError } = await serviceSupabase
      .from('bills')
      .delete()
      .eq('id', billId)
      .eq('user_id', userId)

    if (deleteError) {
      console.error('Error deleting bill:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete bill', details: deleteError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Bill deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting bill:', error)
    return NextResponse.json(
      { error: 'Failed to delete bill', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}