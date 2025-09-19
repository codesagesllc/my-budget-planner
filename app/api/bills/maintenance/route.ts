import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// This endpoint handles bill maintenance tasks like resetting payment status and updating overdue bills
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action } = await request.json()

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      )
    }

    let result
    let message

    switch (action) {
      case 'reset_recurring':
        // Reset recurring bills payment status
        const { error: resetError } = await supabase.rpc('reset_recurring_bills_payment_status')
        if (resetError) {
          console.error('Error resetting recurring bills:', resetError)
          return NextResponse.json(
            { error: 'Failed to reset recurring bills' },
            { status: 500 }
          )
        }
        message = 'Recurring bills reset successfully'
        break

      case 'update_overdue':
        // Update overdue bills status
        const { error: overdueError } = await supabase.rpc('update_overdue_bills')
        if (overdueError) {
          console.error('Error updating overdue bills:', overdueError)
          return NextResponse.json(
            { error: 'Failed to update overdue bills' },
            { status: 500 }
          )
        }
        message = 'Overdue bills updated successfully'
        break

      case 'full_maintenance':
        // Run both reset and overdue update
        const { error: fullError1 } = await supabase.rpc('reset_recurring_bills_payment_status')
        if (fullError1) {
          console.error('Error in full maintenance (reset):', fullError1)
          return NextResponse.json(
            { error: 'Failed to complete full maintenance' },
            { status: 500 }
          )
        }

        const { error: fullError2 } = await supabase.rpc('update_overdue_bills')
        if (fullError2) {
          console.error('Error in full maintenance (overdue):', fullError2)
          return NextResponse.json(
            { error: 'Failed to complete full maintenance' },
            { status: 500 }
          )
        }
        message = 'Full bill maintenance completed successfully'
        break

      default:
        return NextResponse.json(
          { error: 'Invalid action. Must be "reset_recurring", "update_overdue", or "full_maintenance"' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      message,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Bill maintenance error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}