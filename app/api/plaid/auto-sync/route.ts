// app/api/plaid/auto-sync/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { plaidClient } from '@/lib/plaid/config'
import { TransactionsSyncRequest } from 'plaid'

// This endpoint can be called by a cron job (Vercel Cron, GitHub Actions, etc.)
// to periodically sync transactions for all active Plaid items
export async function POST(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request (basic security)
    const authHeader = request.headers.get('authorization')
    const expectedAuth = `Bearer ${process.env.CRON_SECRET || 'dev-secret'}`

    if (authHeader !== expectedAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Starting automatic transaction sync for all users...')

    const supabase = await createClient()

    // Get all active Plaid items that haven't been synced recently
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

    const { data: plaidItems, error: itemsError } = await supabase
      .from('plaid_items')
      .select('*')
      .eq('status', 'connected')
      .or(`last_sync.is.null,last_sync.lt.${oneHourAgo}`)

    if (itemsError) {
      console.error('Error fetching Plaid items:', itemsError)
      return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 })
    }

    if (!plaidItems || plaidItems.length === 0) {
      console.log('No Plaid items need syncing')
      return NextResponse.json({
        message: 'No items to sync',
        synced: 0,
        errors: 0
      })
    }

    console.log(`Found ${plaidItems.length} Plaid items to sync`)

    let successCount = 0
    let errorCount = 0
    const errors: string[] = []

    // Sync each item
    for (const item of plaidItems) {
      try {
        console.log(`Syncing item ${item.item_id} for user ${item.user_id}`)

        const syncResult = await syncTransactionsForItem(item, supabase)

        if (syncResult.success) {
          successCount++
          console.log(`✓ Synced ${syncResult.transactionCount} transactions for item ${item.item_id}`)
        } else {
          errorCount++
          errors.push(`Item ${item.item_id}: ${syncResult.error}`)
          console.error(`✗ Failed to sync item ${item.item_id}:`, syncResult.error)
        }

      } catch (error) {
        errorCount++
        const errorMsg = `Item ${item.item_id}: ${error}`
        errors.push(errorMsg)
        console.error('Error syncing item:', error)
      }
    }

    console.log(`Auto-sync completed: ${successCount} successful, ${errorCount} errors`)

    return NextResponse.json({
      message: 'Auto-sync completed',
      synced: successCount,
      errors: errorCount,
      errorDetails: errors.slice(0, 10), // Limit error details
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in auto-sync:', error)
    return NextResponse.json(
      { error: 'Auto-sync failed', details: String(error) },
      { status: 500 }
    )
  }
}

// Helper function to sync transactions for a single Plaid item
async function syncTransactionsForItem(plaidItem: any, supabase: any) {
  try {
    let hasMore = true
    let nextCursor = plaidItem.sync_cursor
    let totalSynced = 0

    while (hasMore) {
      const syncRequest: TransactionsSyncRequest = {
        access_token: plaidItem.access_token,
        cursor: nextCursor,
      }

      const syncResponse = await plaidClient.transactionsSync(syncRequest)
      const newTransactions = syncResponse.data.added.concat(syncResponse.data.modified)

      if (newTransactions.length > 0) {
        // Get user's bills for matching
        const { data: userBills } = await supabase
          .from('bills')
          .select('*')
          .eq('user_id', plaidItem.user_id)
          .eq('is_active', true)

        // Transform transactions with bill matching
        const transactionsToInsert = newTransactions.map((transaction: any) => {
          const transactionAmount = Math.abs(transaction.amount)
          const transactionName = transaction.name.toLowerCase()

          // Try to match with existing bills
          let matchedBillId = null
          let isRecurring = false

          if (userBills) {
            const matchedBill = userBills.find((bill: any) => {
              const billName = bill.name.toLowerCase()
              const amountDiff = Math.abs(transactionAmount - bill.amount)
              const amountMatch = amountDiff <= bill.amount * 0.1 // 10% tolerance
              const nameMatch = transactionName.includes(billName) || billName.includes(transactionName)

              return amountMatch && nameMatch
            })

            if (matchedBill) {
              matchedBillId = matchedBill.id
              isRecurring = matchedBill.billing_cycle !== 'one-time'
            }
          }

          return {
            id: transaction.transaction_id,
            user_id: plaidItem.user_id,
            account_id: transaction.account_id,
            amount: transaction.amount,
            description: transaction.name,
            date: transaction.date,
            pending: transaction.pending,
            category: transaction.category?.[0] || null,
            subcategory: transaction.category?.[1] || null,
            merchant_name: transaction.merchant_name,
            account_owner: transaction.account_owner,
            plaid_transaction_id: transaction.transaction_id,
            transaction_type: transaction.amount < 0 ? 'expense' : 'income',
            bill_id: matchedBillId,
            is_recurring: isRecurring,
            is_bill_payment: !!matchedBillId,
            exclude_from_spending: !!matchedBillId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
        })

        // Filter out duplicates
        const existingIds = new Set()
        const { data: existingTransactions } = await supabase
          .from('transactions')
          .select('id')
          .in('id', transactionsToInsert.map(t => t.id))

        if (existingTransactions) {
          existingTransactions.forEach((t: any) => existingIds.add(t.id))
        }

        const newUniqueTransactions = transactionsToInsert.filter(t => !existingIds.has(t.id))

        if (newUniqueTransactions.length > 0) {
          const { error: insertError } = await supabase
            .from('transactions')
            .insert(newUniqueTransactions)

          if (insertError) {
            throw new Error(`Insert error: ${insertError.message}`)
          }

          totalSynced += newUniqueTransactions.length
        }
      }

      // Handle removed transactions
      if (syncResponse.data.removed.length > 0) {
        const removedIds = syncResponse.data.removed.map(t => t.transaction_id)
        await supabase
          .from('transactions')
          .delete()
          .in('id', removedIds)
      }

      hasMore = syncResponse.data.has_more
      nextCursor = syncResponse.data.next_cursor
    }

    // Update sync cursor and timestamp
    if (nextCursor) {
      await supabase
        .from('plaid_items')
        .update({
          sync_cursor: nextCursor,
          last_sync: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', plaidItem.id)
    }

    return {
      success: true,
      transactionCount: totalSynced
    }

  } catch (error) {
    // Update item with error status
    await supabase
      .from('plaid_items')
      .update({
        error_code: 'AUTO_SYNC_ERROR',
        error_message: `Auto-sync failed: ${error}`,
        updated_at: new Date().toISOString(),
      })
      .eq('id', plaidItem.id)

    return {
      success: false,
      error: String(error)
    }
  }
}

// GET endpoint for health check
export async function GET() {
  return NextResponse.json({
    status: 'Auto-sync endpoint active',
    timestamp: new Date().toISOString()
  })
}