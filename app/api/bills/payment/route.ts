import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { billId, action } = await request.json()

    if (!billId || !action) {
      return NextResponse.json(
        { error: 'Bill ID and action are required' },
        { status: 400 }
      )
    }

    if (!['pay', 'unpay'].includes(action)) {
      return NextResponse.json(
        { error: 'Action must be either "pay" or "unpay"' },
        { status: 400 }
      )
    }

    // Call the appropriate database function
    const functionName = action === 'pay' ? 'mark_bill_paid' : 'mark_bill_unpaid'
    const { data, error } = await supabase.rpc(functionName, {
      bill_id: billId
    })

    if (error) {
      console.error(`Error ${action}ing bill:`, error)
      return NextResponse.json(
        { error: `Failed to ${action} bill` },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Bill not found or access denied' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      bill: data,
      message: `Bill successfully ${action === 'pay' ? 'marked as paid' : 'marked as unpaid'}`
    })

  } catch (error) {
    console.error('Bill payment error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') // 'overdue', 'paid', 'unpaid'

    let query = supabase
      .from('bills')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('due_date', { ascending: true })

    if (status === 'overdue') {
      query = query.eq('is_overdue', true)
    } else if (status === 'paid') {
      query = query.eq('is_paid', true)
    } else if (status === 'unpaid') {
      query = query.eq('is_paid', false)
    }

    const { data: bills, error } = await query

    if (error) {
      console.error('Error fetching bills:', error)
      return NextResponse.json(
        { error: 'Failed to fetch bills' },
        { status: 500 }
      )
    }

    // Calculate summary statistics
    const summary = {
      total: bills.length,
      paid: bills.filter((bill: any) => bill.is_paid).length,
      unpaid: bills.filter((bill: any) => !bill.is_paid && !bill.is_overdue).length,
      overdue: bills.filter((bill: any) => bill.is_overdue).length,
      totalAmount: bills.reduce((sum: number, bill: any) => sum + parseFloat(bill.amount), 0),
      paidAmount: bills.filter((bill: any) => bill.is_paid).reduce((sum: number, bill: any) => sum + parseFloat(bill.amount), 0),
      unpaidAmount: bills.filter((bill: any) => !bill.is_paid).reduce((sum: number, bill: any) => sum + parseFloat(bill.amount), 0)
    }

    return NextResponse.json({
      success: true,
      bills,
      summary
    })

  } catch (error) {
    console.error('Error fetching bills:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}