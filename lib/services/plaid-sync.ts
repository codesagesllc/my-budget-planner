// lib/services/plaid-sync.ts
// Centralized Plaid transaction sync service - DRY implementation

import { createClient } from '@/lib/supabase/server'
import { plaidClient } from '@/lib/plaid/config'
import { TransactionsSyncRequest } from 'plaid'

export interface PlaidSyncOptions {
  userId?: string // For user-specific sync
  cursor?: string // For incremental sync
  days?: number // For historical sync
  priority?: 'high' | 'medium' | 'low'
}

export interface PlaidSyncResult {
  success: boolean
  transactionsSynced: number
  itemsProcessed: number
  errors: string[]
  timestamp: string
  details?: {
    itemResults: ItemSyncResult[]
    totalItems: number
    duplicatesSkipped: number
  }
}

export interface ItemSyncResult {
  itemId: string
  userId: string
  success: boolean
  transactionCount: number
  error?: string
}

// Main sync service class
export class PlaidSyncService {
  private supabase: any

  constructor() {
    // Will be initialized in each method
  }

  private async getSupabaseClient() {
    if (!this.supabase) {
      this.supabase = await createClient()
    }
    return this.supabase
  }

  /**
   * Sync transactions for a specific user and access token (user-initiated)
   */
  async syncUserTransactions(
    userId: string,
    accessToken: string,
    options: PlaidSyncOptions = {}
  ): Promise<PlaidSyncResult> {
    try {
      const supabase = await this.getSupabaseClient()

      // Verify user has access to this access token
      const { data: plaidItem, error: itemError } = await supabase
        .from('plaid_items')
        .select('*')
        .eq('access_token', accessToken)
        .eq('user_id', userId)
        .single()

      if (itemError || !plaidItem) {
        return {
          success: false,
          transactionsSynced: 0,
          itemsProcessed: 0,
          errors: ['Invalid access token or unauthorized'],
          timestamp: new Date().toISOString()
        }
      }

      const itemResult = await this.syncSingleItem(plaidItem, options)

      return {
        success: itemResult.success,
        transactionsSynced: itemResult.transactionCount,
        itemsProcessed: 1,
        errors: itemResult.error ? [itemResult.error] : [],
        timestamp: new Date().toISOString(),
        details: {
          itemResults: [itemResult],
          totalItems: 1,
          duplicatesSkipped: 0
        }
      }

    } catch (error) {
      console.error('Error in syncUserTransactions:', error)
      return {
        success: false,
        transactionsSynced: 0,
        itemsProcessed: 0,
        errors: [String(error)],
        timestamp: new Date().toISOString()
      }
    }
  }

  /**
   * Sync transactions for all active Plaid items (cron/scheduled)
   */
  async syncAllActiveItems(options: PlaidSyncOptions = {}): Promise<PlaidSyncResult> {
    try {
      const supabase = await this.getSupabaseClient()

      // Get all active Plaid items that need syncing
      const timeThreshold = new Date(Date.now() - (options.days || 0.25) * 60 * 60 * 1000).toISOString()

      const { data: plaidItems, error: itemsError } = await supabase
        .from('plaid_items')
        .select('*')
        .eq('status', 'connected')
        .or(`last_sync.is.null,last_sync.lt.${timeThreshold}`)

      if (itemsError) {
        console.error('Error fetching Plaid items:', itemsError)
        return {
          success: false,
          transactionsSynced: 0,
          itemsProcessed: 0,
          errors: [`Failed to fetch items: ${itemsError.message}`],
          timestamp: new Date().toISOString()
        }
      }

      if (!plaidItems || plaidItems.length === 0) {
        return {
          success: true,
          transactionsSynced: 0,
          itemsProcessed: 0,
          errors: [],
          timestamp: new Date().toISOString(),
          details: {
            itemResults: [],
            totalItems: 0,
            duplicatesSkipped: 0
          }
        }
      }

      console.log(`Found ${plaidItems.length} Plaid items to sync`)

      // Process all items with rate limiting
      const itemResults: ItemSyncResult[] = []
      let totalTransactions = 0

      for (let i = 0; i < plaidItems.length; i++) {
        const item = plaidItems[i]

        try {
          // Add delay between items to avoid rate limits
          if (i > 0) {
            await this.delay(1000) // 1 second delay
          }

          const result = await this.syncSingleItem(item, options)
          itemResults.push(result)

          if (result.success) {
            totalTransactions += result.transactionCount
          }

          console.log(`Synced item ${item.item_id}: ${result.success ? 'SUCCESS' : 'FAILED'}`)

        } catch (error) {
          console.error(`Failed to sync item ${item.item_id}:`, error)
          itemResults.push({
            itemId: item.item_id,
            userId: item.user_id,
            success: false,
            transactionCount: 0,
            error: String(error)
          })
        }
      }

      const successCount = itemResults.filter(r => r.success).length

      return {
        success: successCount > 0,
        transactionsSynced: totalTransactions,
        itemsProcessed: successCount,
        errors: itemResults.filter(r => !r.success).map(r => r.error || 'Unknown error'),
        timestamp: new Date().toISOString(),
        details: {
          itemResults,
          totalItems: plaidItems.length,
          duplicatesSkipped: 0
        }
      }

    } catch (error) {
      console.error('Error in syncAllActiveItems:', error)
      return {
        success: false,
        transactionsSynced: 0,
        itemsProcessed: 0,
        errors: [String(error)],
        timestamp: new Date().toISOString()
      }
    }
  }

  /**
   * Sync transactions for a specific Plaid item (webhook-triggered)
   */
  async syncWebhookItem(itemId: string, options: PlaidSyncOptions = {}): Promise<PlaidSyncResult> {
    try {
      const supabase = await this.getSupabaseClient()

      // Find the Plaid item
      const { data: plaidItem, error: itemError } = await supabase
        .from('plaid_items')
        .select('*')
        .eq('item_id', itemId)
        .single()

      if (itemError || !plaidItem) {
        return {
          success: false,
          transactionsSynced: 0,
          itemsProcessed: 0,
          errors: [`Plaid item not found: ${itemId}`],
          timestamp: new Date().toISOString()
        }
      }

      const itemResult = await this.syncSingleItem(plaidItem, options)

      return {
        success: itemResult.success,
        transactionsSynced: itemResult.transactionCount,
        itemsProcessed: 1,
        errors: itemResult.error ? [itemResult.error] : [],
        timestamp: new Date().toISOString(),
        details: {
          itemResults: [itemResult],
          totalItems: 1,
          duplicatesSkipped: 0
        }
      }

    } catch (error) {
      console.error('Error in syncWebhookItem:', error)
      return {
        success: false,
        transactionsSynced: 0,
        itemsProcessed: 0,
        errors: [String(error)],
        timestamp: new Date().toISOString()
      }
    }
  }

  /**
   * Core sync logic for a single Plaid item
   */
  private async syncSingleItem(plaidItem: any, options: PlaidSyncOptions = {}): Promise<ItemSyncResult> {
    try {
      const supabase = await this.getSupabaseClient()

      let hasMore = true
      let nextCursor = options.cursor || plaidItem.sync_cursor
      let totalSynced = 0

      let batchCount = 0
      const MAX_BATCHES = 50 // Increased limit since we're handling errors better

      console.log(`Starting sync for item ${plaidItem.item_id} with cursor: ${nextCursor || 'initial (first sync)'}`)

      while (hasMore && batchCount < MAX_BATCHES) {
        batchCount++

        const syncRequest: TransactionsSyncRequest = {
          access_token: plaidItem.access_token,
          cursor: nextCursor,
        }

        try {
          console.log(`Syncing batch ${batchCount} for item ${plaidItem.item_id}`)
          const syncResponse = await plaidClient.transactionsSync(syncRequest)

          const newTransactions = syncResponse.data.added.concat(syncResponse.data.modified)
          hasMore = syncResponse.data.has_more
          nextCursor = syncResponse.data.next_cursor

          console.log(`Retrieved ${newTransactions.length} new/modified transactions. Has more: ${hasMore}`)

          // Handle removed transactions
          if (syncResponse.data.removed.length > 0) {
            await this.handleRemovedTransactions(syncResponse.data.removed, plaidItem.user_id)
            console.log(`Removed ${syncResponse.data.removed.length} transactions`)
          }

          // Process and store new transactions
          if (newTransactions.length > 0) {
            const synced = await this.processAndStoreTransactions(newTransactions, plaidItem)
            totalSynced += synced
            console.log(`Processed ${synced} transactions (${totalSynced} total)`)
          }

          // Rate limit protection: add a small delay between batches
          if (hasMore) {
            await this.delay(500) // 500ms delay between all batches
          }

        } catch (syncError: any) {
          // Handle rate limit and server errors gracefully
          if (syncError.status === 500 || syncError.status === 429) {
            console.warn(`Rate limit or server error for item ${plaidItem.item_id} (batch ${batchCount}).`)
            console.warn(`Successfully synced ${totalSynced} transactions before error.`)

            // Save progress and break
            if (nextCursor) {
              await supabase
                .from('plaid_items')
                .update({
                  sync_cursor: nextCursor,
                  last_sync: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                })
                .eq('id', plaidItem.id)
              console.log(`Progress saved. Resume later with cursor: ${nextCursor}`)
            }

            hasMore = false
            break
          } else {
            console.error(`TransactionsSync failed for item ${plaidItem.item_id}:`, {
              error_code: syncError.error_code,
              error_message: syncError.error_message,
              status: syncError.status,
              cursor: nextCursor,
              batch: batchCount
            })
            throw syncError
          }
        }
      }

      // Check if we hit the batch limit
      if (batchCount >= MAX_BATCHES) {
        console.warn(`Reached maximum batch limit (${MAX_BATCHES}) for item ${plaidItem.item_id}`)
        console.warn(`Synced ${totalSynced} transactions. Continue sync later.`)
      }

      // Update sync cursor and timestamp
      if (nextCursor) {
        await supabase
          .from('plaid_items')
          .update({
            sync_cursor: nextCursor,
            last_sync: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            error_code: null,
            error_message: null,
          })
          .eq('id', plaidItem.id)
      }

      console.log(`Completed sync for item ${plaidItem.item_id}: ${totalSynced} transactions in ${batchCount} batches`)

      return {
        itemId: plaidItem.item_id,
        userId: plaidItem.user_id,
        success: true,
        transactionCount: totalSynced
      }

    } catch (error) {
      console.error(`Error syncing item ${plaidItem.item_id}:`, error)

      // Update item with error status
      try {
        const supabase = await this.getSupabaseClient()
        await supabase
          .from('plaid_items')
          .update({
            error_code: 'SYNC_ERROR',
            error_message: `Sync failed: ${String(error)}`,
            updated_at: new Date().toISOString(),
          })
          .eq('id', plaidItem.id)
      } catch (updateError) {
        console.error('Failed to update item error status:', updateError)
      }

      return {
        itemId: plaidItem.item_id,
        userId: plaidItem.user_id,
        success: false,
        transactionCount: 0,
        error: String(error)
      }
    }
  }

  /**
   * Process and store transactions with bill matching
   */
  private async processAndStoreTransactions(transactions: any[], plaidItem: any): Promise<number> {
    const supabase = await this.getSupabaseClient()

    // Get user's bills for matching
    const { data: userBills } = await supabase
      .from('bills')
      .select('*')
      .eq('user_id', plaidItem.user_id)
      .eq('is_active', true)

    // Get account mapping
    const { data: accounts } = await supabase
      .from('accounts')
      .select('id, plaid_account_id')
      .eq('user_id', plaidItem.user_id)

    const accountMap = new Map(
      accounts?.map((acc: any) => [acc.plaid_account_id, acc.id]) || []
    )

    // Transform transactions with bill matching
    const transactionsToInsert = transactions
      .filter(tx => accountMap.has(tx.account_id))
      .map((transaction: any) => {
        const isExpense = transaction.amount > 0
        const category = transaction.category?.[0] || 'Other'
        const transactionAmount = Math.abs(transaction.amount)
        const transactionName = transaction.name.toLowerCase()

        // Try to match with existing bills
        let matchedBillId = null
        let isRecurring = false

        if (userBills && isExpense) {
          const matchedBill = userBills.find((bill: any) => {
            const billName = bill.name.toLowerCase()
            const amountDiff = Math.abs(transactionAmount - bill.amount)
            const amountMatch = amountDiff <= bill.amount * 0.1 // 10% tolerance
            const nameMatch = transactionName.includes(billName) || billName.includes(transactionName)
            const categoryMatch = bill.categories?.includes(category)

            return (amountMatch && nameMatch) || (amountMatch && categoryMatch)
          })

          if (matchedBill) {
            matchedBillId = matchedBill.id
            isRecurring = matchedBill.billing_cycle !== 'one-time'
          }
        }

        return {
          user_id: plaidItem.user_id,
          account_id: accountMap.get(transaction.account_id),
          plaid_transaction_id: transaction.transaction_id,
          description: transaction.name,
          merchant_name: transaction.merchant_name,
          amount: Math.abs(transaction.amount),
          type: isExpense ? 'debit' : 'credit',
          transaction_type: isExpense ? 'expense' : 'income',
          date: transaction.date,
          authorized_date: transaction.authorized_date,
          category,
          subcategory: transaction.category?.[1] || null,
          plaid_category: transaction.category?.join(', ') || null,
          pending: transaction.pending,
          account_owner: transaction.account_owner,
          iso_currency_code: transaction.iso_currency_code || 'USD',
          location: transaction.location ? JSON.stringify(transaction.location) : null,
          payment_meta: transaction.payment_meta ? JSON.stringify(transaction.payment_meta) : null,
          bill_id: matchedBillId,
          is_recurring: isRecurring,
          is_bill_payment: !!matchedBillId,
          exclude_from_spending: !!matchedBillId,
          created_at: new Date().toISOString(),
        }
      })

    // Filter out duplicates
    const existingIds = new Set()
    const { data: existingTransactions } = await supabase
      .from('transactions')
      .select('plaid_transaction_id')
      .in('plaid_transaction_id', transactionsToInsert.map(t => t.plaid_transaction_id))

    if (existingTransactions) {
      existingTransactions.forEach((t: any) => existingIds.add(t.plaid_transaction_id))
    }

    const newUniqueTransactions = transactionsToInsert.filter(
      t => !existingIds.has(t.plaid_transaction_id)
    )

    if (newUniqueTransactions.length > 0) {
      const { error: insertError } = await supabase
        .from('transactions')
        .insert(newUniqueTransactions)

      if (insertError) {
        throw new Error(`Insert error: ${insertError.message}`)
      }

      return newUniqueTransactions.length
    }

    return 0
  }

  /**
   * Handle removed transactions
   */
  private async handleRemovedTransactions(removedTransactions: any[], userId: string) {
    const supabase = await this.getSupabaseClient()

    if (removedTransactions.length > 0) {
      const removedIds = removedTransactions.map(tx => tx.transaction_id)

      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('user_id', userId)
        .in('plaid_transaction_id', removedIds)

      if (error) {
        console.error('Error removing transactions:', error)
      } else {
        console.log(`Removed ${removedIds.length} transactions for user ${userId}`)
      }
    }
  }

  /**
   * Update item status for webhook events
   */
  async updateItemStatus(itemId: string, status: string, errorCode?: string, errorMessage?: string): Promise<void> {
    const supabase = await this.getSupabaseClient()

    await supabase
      .from('plaid_items')
      .update({
        status,
        error_code: errorCode || null,
        error_message: errorMessage || null,
        updated_at: new Date().toISOString(),
      })
      .eq('item_id', itemId)
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Export singleton instance
export const plaidSyncService = new PlaidSyncService()