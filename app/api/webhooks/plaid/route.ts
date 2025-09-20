// app/api/webhooks/plaid/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'
import { headers } from 'next/headers'
import { TransactionsSyncRequest } from 'plaid'

// Webhook event types we handle
const WEBHOOK_EVENTS = {
  TRANSACTIONS: 'TRANSACTIONS',
  ITEM_LOGIN_REQUIRED: 'ITEM_LOGIN_REQUIRED',
  ITEM_ERROR: 'ITEM_ERROR',
  PENDING_EXPIRATION: 'PENDING_EXPIRATION',
  USER_PERMISSION_REVOKED: 'USER_PERMISSION_REVOKED',
  ITEM_WEBHOOK_UPDATE_ACKNOWLEDGED: 'ITEM_WEBHOOK_UPDATE_ACKNOWLEDGED',
} as const

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const headersList = await headers()

    // Verify webhook signature for security
    const signature = headersList.get('plaid-verification')

    if (!verifyWebhookSignature(body, signature)) {
      console.error('Invalid webhook signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const webhookData = JSON.parse(body)
    const { webhook_type, webhook_code, item_id, environment, error } = webhookData

    console.log(`Plaid webhook received: ${webhook_type} - ${webhook_code} for item ${item_id}`)

    const supabase = await createClient()

    // Find the Plaid item in our database
    const { data: plaidItem, error: itemError } = await supabase
      .from('plaid_items')
      .select('*')
      .eq('item_id', item_id)
      .single()

    if (itemError || !plaidItem) {
      console.error('Plaid item not found:', item_id)
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    // Handle different webhook types
    switch (webhook_type) {
      case WEBHOOK_EVENTS.TRANSACTIONS:
        await handleTransactionsWebhook(webhookData, plaidItem, supabase)
        break

      case WEBHOOK_EVENTS.ITEM_LOGIN_REQUIRED:
        await handleLoginRequiredWebhook(plaidItem, supabase)
        break

      case WEBHOOK_EVENTS.ITEM_ERROR:
        await handleItemErrorWebhook(webhookData, plaidItem, supabase)
        break

      case WEBHOOK_EVENTS.PENDING_EXPIRATION:
        await handlePendingExpirationWebhook(plaidItem, supabase)
        break

      case WEBHOOK_EVENTS.USER_PERMISSION_REVOKED:
        await handlePermissionRevokedWebhook(plaidItem, supabase)
        break

      case WEBHOOK_EVENTS.ITEM_WEBHOOK_UPDATE_ACKNOWLEDGED:
        // No action needed, just acknowledgment
        console.log('Webhook update acknowledged for item:', item_id)
        break

      default:
        console.log('Unhandled webhook type:', webhook_type)
    }

    // Log webhook for monitoring
    await logWebhookEvent(webhookData, supabase)

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Error processing Plaid webhook:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Verify webhook signature for security
function verifyWebhookSignature(body: string, signature: string | null): boolean {
  if (!signature || !process.env.PLAID_WEBHOOK_SECRET) {
    console.warn('Missing webhook signature or secret')
    return process.env.NODE_ENV === 'development' // Allow in development
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', process.env.PLAID_WEBHOOK_SECRET)
      .update(body)
      .digest('base64')

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  } catch (error) {
    console.error('Error verifying webhook signature:', error)
    return false
  }
}

// Handle transaction webhooks
async function handleTransactionsWebhook(webhookData: any, plaidItem: any, supabase: any) {
  const { webhook_code, new_transactions, removed_transactions } = webhookData

  try {
    switch (webhook_code) {
      case 'INITIAL_UPDATE':
      case 'HISTORICAL_UPDATE':
      case 'DEFAULT_UPDATE':
        console.log(`Transaction update for item ${plaidItem.item_id}: ${new_transactions} new, ${removed_transactions} removed`)

        // Use BullMQ for production, direct sync for local development
        await triggerTransactionSync(plaidItem, supabase, webhookData)
        break

      case 'TRANSACTIONS_REMOVED':
        console.log(`Transactions removed for item ${plaidItem.item_id}: ${removed_transactions}`)
        // Sync will handle removals
        await triggerTransactionSync(plaidItem, supabase, webhookData)
        break

      default:
        console.log('Unhandled transaction webhook code:', webhook_code)
    }
  } catch (error) {
    console.error('Error handling transactions webhook:', error)
  }
}

// Handle login required webhook
async function handleLoginRequiredWebhook(plaidItem: any, supabase: any) {
  try {
    // Update item status to require login
    await supabase
      .from('plaid_items')
      .update({
        status: 'login_required',
        error_code: 'ITEM_LOGIN_REQUIRED',
        error_message: 'Item requires user login to continue syncing',
        updated_at: new Date().toISOString(),
      })
      .eq('id', plaidItem.id)

    console.log(`Item ${plaidItem.item_id} requires login`)

    // Optionally notify user (via email, push notification, etc.)
    await notifyUserOfItemIssue(plaidItem, 'login_required')

  } catch (error) {
    console.error('Error handling login required webhook:', error)
  }
}

// Handle item error webhook
async function handleItemErrorWebhook(webhookData: any, plaidItem: any, supabase: any) {
  const { error } = webhookData

  try {
    await supabase
      .from('plaid_items')
      .update({
        status: 'error',
        error_code: error?.error_code,
        error_message: error?.error_message,
        updated_at: new Date().toISOString(),
      })
      .eq('id', plaidItem.id)

    console.log(`Item ${plaidItem.item_id} error: ${error?.error_code} - ${error?.error_message}`)

    // Notify user of the error
    await notifyUserOfItemIssue(plaidItem, 'error', error)

  } catch (error) {
    console.error('Error handling item error webhook:', error)
  }
}

// Handle pending expiration webhook
async function handlePendingExpirationWebhook(plaidItem: any, supabase: any) {
  try {
    // Update consent expiration warning
    await supabase
      .from('plaid_items')
      .update({
        status: 'expiring_soon',
        updated_at: new Date().toISOString(),
      })
      .eq('id', plaidItem.id)

    console.log(`Item ${plaidItem.item_id} consent expiring soon`)

    // Notify user to refresh consent
    await notifyUserOfItemIssue(plaidItem, 'expiring_soon')

  } catch (error) {
    console.error('Error handling pending expiration webhook:', error)
  }
}

// Handle permission revoked webhook
async function handlePermissionRevokedWebhook(plaidItem: any, supabase: any) {
  try {
    // Mark item as disconnected
    await supabase
      .from('plaid_items')
      .update({
        status: 'disconnected',
        error_code: 'USER_PERMISSION_REVOKED',
        error_message: 'User revoked access to this item',
        updated_at: new Date().toISOString(),
      })
      .eq('id', plaidItem.id)

    // Optionally soft-delete or mark accounts as inactive
    await supabase
      .from('accounts')
      .update({
        status: 'inactive',
        updated_at: new Date().toISOString(),
      })
      .eq('plaid_item_id', plaidItem.id)

    console.log(`Item ${plaidItem.item_id} permission revoked`)

  } catch (error) {
    console.error('Error handling permission revoked webhook:', error)
  }
}

// Trigger transaction sync using BullMQ or direct processing
async function triggerTransactionSync(plaidItem: any, supabase: any, webhookData?: any) {
  try {
    console.log(`Starting automatic transaction sync for item ${plaidItem.item_id}`)

    // Try to use BullMQ first (production), fallback to direct sync (local dev)
    const useQueue = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL

    if (useQueue) {
      console.log('🚀 Using BullMQ for transaction sync')
      await queueTransactionSync(plaidItem, webhookData)
    } else {
      console.log('🔄 Using direct sync (local development)')
      await directTransactionSync(plaidItem, supabase)
    }

  } catch (error) {
    console.error('Error triggering transaction sync:', error)
    // Fallback to direct sync if queue fails
    await directTransactionSync(plaidItem, supabase)
  }
}

// Queue transaction sync using BullMQ
async function queueTransactionSync(plaidItem: any, webhookData?: any) {
  try {
    const { addTransactionSyncJob } = await import('@/lib/queue/queues')

    await addTransactionSyncJob({
      plaidItemId: plaidItem.id,
      userId: plaidItem.user_id,
      accessToken: plaidItem.access_token,
      cursor: plaidItem.sync_cursor,
      priority: 10, // High priority for webhook-triggered syncs
    })

    console.log(`📋 Queued transaction sync job for item ${plaidItem.item_id}`)
  } catch (error) {
    console.error('Error queuing transaction sync:', error)
    throw error
  }
}

// Direct transaction sync (fallback for local development)
async function directTransactionSync(plaidItem: any, supabase: any) {
  try {
    // Import plaidClient here to avoid circular imports
    const { plaidClient } = await import('@/lib/plaid/config')

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

        // Transform transactions for database with bill matching
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

        // Filter out duplicates by checking existing transaction IDs
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
            console.error('Error inserting transactions from webhook:', insertError)
            throw insertError
          }

          totalSynced += newUniqueTransactions.length
          console.log(`Webhook sync: Inserted ${newUniqueTransactions.length} new transactions`)
        }
      }

      // Handle removed transactions
      if (syncResponse.data.removed.length > 0) {
        const removedIds = syncResponse.data.removed.map(t => t.transaction_id)
        await supabase
          .from('transactions')
          .delete()
          .in('id', removedIds)
        console.log(`Webhook sync: Removed ${syncResponse.data.removed.length} transactions`)
      }

      hasMore = syncResponse.data.has_more
      nextCursor = syncResponse.data.next_cursor
    }

    // Update sync cursor
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

    console.log(`Webhook sync completed: ${totalSynced} transactions synced for item ${plaidItem.item_id}`)

  } catch (error) {
    console.error('Error in direct transaction sync:', error)

    // Update item status to indicate sync issue
    await supabase
      .from('plaid_items')
      .update({
        error_code: 'SYNC_ERROR',
        error_message: `Webhook sync failed: ${error}`,
        updated_at: new Date().toISOString(),
      })
      .eq('id', plaidItem.id)
  }
}

// Notify user of item issues (placeholder for future implementation)
async function notifyUserOfItemIssue(plaidItem: any, issueType: string, error?: any) {
  // TODO: Implement user notifications
  // This could send emails, push notifications, or in-app notifications
  // For now, just log the issue
  console.log(`User notification needed for item ${plaidItem.item_id}: ${issueType}`)

  // You could implement:
  // - Email notifications via SendGrid, SES, etc.
  // - Push notifications
  // - In-app notification system
  // - SMS notifications
}

// Log webhook events for monitoring and debugging
async function logWebhookEvent(webhookData: any, supabase: any) {
  try {
    // Create a webhook_logs table to store events
    await supabase
      .from('webhook_logs')
      .insert({
        webhook_type: webhookData.webhook_type,
        webhook_code: webhookData.webhook_code,
        item_id: webhookData.item_id,
        environment: webhookData.environment,
        data: webhookData,
        processed_at: new Date().toISOString(),
      })
  } catch (error) {
    // Don't fail webhook processing if logging fails
    console.error('Error logging webhook event:', error)
  }
}

// GET endpoint for webhook verification (some providers require this)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const challenge = searchParams.get('challenge')

  if (challenge) {
    return NextResponse.json({ challenge })
  }

  return NextResponse.json({ status: 'Plaid webhook endpoint active' })
}