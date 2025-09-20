// app/api/plaid/sync-transactions/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { plaidSyncService } from '@/lib/services/plaid-sync'
import { handlePlaidError } from '@/lib/plaid/config'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { access_token, user_id, days = 30, cursor = null } = await request.json()

    if (!access_token) {
      return NextResponse.json({ error: 'Access token required' }, { status: 400 })
    }

    try {
      // Use centralized sync service for user-initiated sync
      const syncResult = await plaidSyncService.syncUserTransactions(
        user.id,
        access_token,
        {
          cursor,
          days: cursor ? undefined : days, // Only use days for historical sync
          priority: 'high'
        }
      )

      if (!syncResult.success) {
        return NextResponse.json({
          error: syncResult.errors[0] || 'Sync failed',
          details: syncResult.errors
        }, { status: 400 })
      }

      console.log(`User sync completed: ${syncResult.transactionsSynced} transactions for user ${user.id}`)

      return NextResponse.json({
        success: true,
        synced: syncResult.transactionsSynced,
        duplicatesSkipped: syncResult.details?.duplicatesSkipped || 0,
        hasMore: false, // User sync is complete
        nextCursor: null,
        totalAvailable: syncResult.transactionsSynced,
        timestamp: syncResult.timestamp,
      })

    } catch (plaidError: any) {
      console.error('Plaid API error during sync:', plaidError)

      // Handle specific Plaid errors
      if (plaidError.error_code === 'ITEM_LOGIN_REQUIRED') {
        // Mark item as requiring re-authentication by access_token
        await supabase
          .from('plaid_items')
          .update({ status: 'login_required' })
          .eq('access_token', access_token)
      }

      const errorMessage = handlePlaidError(plaidError)
      return NextResponse.json({ error: errorMessage }, { status: 500 })
    }

  } catch (error: any) {
    console.error('Error syncing transactions:', error)
    return NextResponse.json(
      {
        error: 'Failed to sync transactions',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}


// GET endpoint to check sync status
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all Plaid items for this user
    const { data: plaidItems } = await supabase
      .from('plaid_items')
      .select('*')
      .eq('user_id', user.id)

    const syncStatus = plaidItems?.map((item: any) => ({
      item_id: item.item_id,
      institution_name: item.institution_name,
      status: item.status,
      last_sync: item.last_sync,
      has_cursor: !!item.sync_cursor,
    })) || []

    return NextResponse.json({
      items: syncStatus,
      total_items: syncStatus.length,
    })

  } catch (error: any) {
    console.error('Error getting sync status:', error)
    return NextResponse.json({ error: 'Failed to get sync status' }, { status: 500 })
  }
}