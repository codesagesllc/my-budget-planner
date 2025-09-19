// lib/queue/workers.ts
import { Worker, Job } from 'bullmq'
import { getRedisConnection } from './redis'
import { QUEUE_NAMES } from './queues'
import { createClient } from '@/lib/supabase/server'
import { plaidClient } from '@/lib/plaid/config'
import { TransactionsSyncRequest } from 'plaid'

// Worker instances
let workers: Record<string, Worker> = {}

// Transaction sync worker
export function createTransactionSyncWorker() {
  if (workers[QUEUE_NAMES.TRANSACTION_SYNC]) {
    return workers[QUEUE_NAMES.TRANSACTION_SYNC]
  }

  const redis = getRedisConnection()

  const worker = new Worker(
    QUEUE_NAMES.TRANSACTION_SYNC,
    async (job: Job) => {
      console.log(`🔄 Processing transaction sync job ${job.id}`)

      const { plaidItemId, userId, accessToken, cursor } = job.data

      try {
        const supabase = await createClient()

        // Get the Plaid item details
        const { data: plaidItem, error: itemError } = await supabase
          .from('plaid_items')
          .select('*')
          .eq('id', plaidItemId)
          .single()

        if (itemError || !plaidItem) {
          throw new Error(`Plaid item not found: ${plaidItemId}`)
        }

        let hasMore = true
        let nextCursor = cursor || plaidItem.sync_cursor
        let totalSynced = 0

        // Progress tracking
        await job.updateProgress(10)

        while (hasMore) {
          const syncRequest: TransactionsSyncRequest = {
            access_token: accessToken,
            cursor: nextCursor,
          }

          const syncResponse = await plaidClient.transactionsSync(syncRequest)
          const newTransactions = syncResponse.data.added.concat(syncResponse.data.modified)

          await job.updateProgress(30)

          if (newTransactions.length > 0) {
            // Get user's bills for matching
            const { data: userBills } = await supabase
              .from('bills')
              .select('*')
              .eq('user_id', userId)
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
                user_id: userId,
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

            await job.updateProgress(50)

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
                throw new Error(`Insert error: ${insertError.message}`)
              }

              totalSynced += newUniqueTransactions.length
              console.log(`Worker: Inserted ${newUniqueTransactions.length} new transactions`)
            }

            await job.updateProgress(70)
          }

          // Handle removed transactions
          if (syncResponse.data.removed.length > 0) {
            const removedIds = syncResponse.data.removed.map(t => t.transaction_id)
            await supabase
              .from('transactions')
              .delete()
              .in('id', removedIds)
            console.log(`Worker: Removed ${syncResponse.data.removed.length} transactions`)
          }

          hasMore = syncResponse.data.has_more
          nextCursor = syncResponse.data.next_cursor

          await job.updateProgress(80)
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
            .eq('id', plaidItemId)
        }

        await job.updateProgress(100)

        console.log(`✅ Worker completed transaction sync: ${totalSynced} transactions for item ${plaidItemId}`)

        return {
          success: true,
          transactionsSynced: totalSynced,
          itemId: plaidItemId,
          userId,
          timestamp: new Date().toISOString(),
        }

      } catch (error) {
        console.error(`❌ Worker error syncing transactions for item ${plaidItemId}:`, error)

        // Update item with error status
        try {
          const supabase = await createClient()
          await supabase
            .from('plaid_items')
            .update({
              error_code: 'WORKER_SYNC_ERROR',
              error_message: `Worker sync failed: ${error}`,
              updated_at: new Date().toISOString(),
            })
            .eq('id', plaidItemId)
        } catch (updateError) {
          console.error('Failed to update item error status:', updateError)
        }

        throw error
      }
    },
    {
      connection: redis,
      concurrency: 5, // Process up to 5 jobs concurrently
      limiter: {
        max: 10, // Max 10 jobs per duration
        duration: 60000, // Per minute
      },
    }
  )

  worker.on('completed', (job) => {
    console.log(`✅ Transaction sync job ${job.id} completed`)
  })

  worker.on('failed', (job, err) => {
    console.error(`❌ Transaction sync job ${job?.id} failed:`, err)
  })

  worker.on('error', (err) => {
    console.error('❌ Transaction sync worker error:', err)
  })

  workers[QUEUE_NAMES.TRANSACTION_SYNC] = worker
  console.log('✅ Transaction sync worker started')

  return worker
}

// Webhook processing worker
export function createWebhookProcessingWorker() {
  if (workers[QUEUE_NAMES.WEBHOOK_PROCESSING]) {
    return workers[QUEUE_NAMES.WEBHOOK_PROCESSING]
  }

  const redis = getRedisConnection()

  const worker = new Worker(
    QUEUE_NAMES.WEBHOOK_PROCESSING,
    async (job: Job) => {
      console.log(`🔄 Processing webhook job ${job.id}`)

      const { webhookType, webhookCode, itemId, userId, payload } = job.data

      try {
        await job.updateProgress(10)

        const supabase = await createClient()

        // Log the webhook event
        await supabase
          .from('webhook_logs')
          .insert({
            webhook_type: webhookType,
            webhook_code: webhookCode,
            item_id: itemId,
            environment: payload.environment,
            data: payload,
            processed_at: new Date().toISOString(),
          })

        await job.updateProgress(30)

        // Handle different webhook types
        switch (webhookType) {
          case 'TRANSACTIONS':
            // Get the Plaid item
            const { data: plaidItem } = await supabase
              .from('plaid_items')
              .select('*')
              .eq('item_id', itemId)
              .single()

            if (plaidItem) {
              // Add a transaction sync job to the queue instead of processing immediately
              const { addTransactionSyncJob } = await import('./queues')

              await addTransactionSyncJob({
                plaidItemId: plaidItem.id,
                userId: plaidItem.user_id,
                accessToken: plaidItem.access_token,
                cursor: plaidItem.sync_cursor,
                priority: 10, // High priority for webhook-triggered syncs
              })

              console.log(`📋 Queued transaction sync job for webhook ${webhookType}`)
            }
            break

          case 'ITEM_LOGIN_REQUIRED':
            await supabase
              .from('plaid_items')
              .update({
                status: 'login_required',
                error_code: 'ITEM_LOGIN_REQUIRED',
                error_message: 'Item requires user login to continue syncing',
                updated_at: new Date().toISOString(),
              })
              .eq('item_id', itemId)
            break

          case 'ITEM_ERROR':
            await supabase
              .from('plaid_items')
              .update({
                status: 'error',
                error_code: payload.error?.error_code,
                error_message: payload.error?.error_message,
                updated_at: new Date().toISOString(),
              })
              .eq('item_id', itemId)
            break

          default:
            console.log(`Unhandled webhook type: ${webhookType}`)
        }

        await job.updateProgress(100)

        return {
          success: true,
          webhookType,
          webhookCode,
          itemId,
          processed: true,
          timestamp: new Date().toISOString(),
        }

      } catch (error) {
        console.error(`❌ Error processing webhook ${webhookType}:`, error)
        throw error
      }
    },
    {
      connection: redis,
      concurrency: 10, // Process webhooks quickly
    }
  )

  worker.on('completed', (job) => {
    console.log(`✅ Webhook processing job ${job.id} completed`)
  })

  worker.on('failed', (job, err) => {
    console.error(`❌ Webhook processing job ${job?.id} failed:`, err)
  })

  workers[QUEUE_NAMES.WEBHOOK_PROCESSING] = worker
  console.log('✅ Webhook processing worker started')

  return worker
}

// Start all workers
export function startAllWorkers() {
  console.log('🚀 Starting all BullMQ workers...')

  createTransactionSyncWorker()
  createWebhookProcessingWorker()

  console.log('✅ All workers started')
}

// Stop all workers
export async function stopAllWorkers() {
  console.log('🔄 Stopping all workers...')

  const promises = Object.values(workers).map(worker => worker.close())
  await Promise.all(promises)

  workers = {}
  console.log('✅ All workers stopped')
}

// Graceful shutdown
if (typeof process !== 'undefined') {
  process.on('SIGTERM', stopAllWorkers)
  process.on('SIGINT', stopAllWorkers)
}