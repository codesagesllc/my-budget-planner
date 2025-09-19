// app/api/plaid/sync-transactions/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { plaidClient, handlePlaidError } from '@/lib/plaid/config'
import { TransactionsGetRequest, TransactionsSyncRequest } from 'plaid'

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

    // Verify user has access to this access token
    const { data: plaidItem } = await supabase
      .from('plaid_items')
      .select('*')
      .eq('access_token', access_token)
      .eq('user_id', user.id)
      .single()

    if (!plaidItem) {
      return NextResponse.json({ error: 'Invalid access token' }, { status: 403 })
    }

    let transactions: any[] = []
    let totalTransactions = 0
    let hasMore = true
    let nextCursor = cursor

    try {
      // Use transactions/sync for incremental updates if cursor provided
      if (cursor) {
        const syncRequest: TransactionsSyncRequest = {
          access_token,
          cursor,
        }

        const syncResponse = await plaidClient.transactionsSync(syncRequest)
        transactions = syncResponse.data.added.concat(syncResponse.data.modified)
        hasMore = syncResponse.data.has_more
        nextCursor = syncResponse.data.next_cursor

        // Handle removed transactions
        if (syncResponse.data.removed.length > 0) {
          await handleRemovedTransactions(syncResponse.data.removed, user.id, supabase)
        }
      } else {
        // Initial sync or full refresh - use transactions/get
        const endDate = new Date()
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - days)

        const transactionsRequest: TransactionsGetRequest = {
          access_token,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
        }

        const response = await plaidClient.transactionsGet(transactionsRequest)
        transactions = response.data.transactions
        totalTransactions = response.data.total_transactions
      }

      // Get account mapping
      const { data: accounts } = await supabase
        .from('accounts')
        .select('id, plaid_account_id')
        .eq('user_id', user.id)

      const accountMap = new Map(
        accounts?.map((acc: any) => [acc.plaid_account_id, acc.id]) || []
      )

      // Process and store transactions with bill matching
      const transactionsToUpsert = await Promise.all(
        transactions
          .filter(tx => accountMap.has(tx.account_id))
          .map(async transaction => {
            const isExpense = transaction.amount > 0
            const category = transaction.category?.[0] || 'Other'

            // Check if this is a recurring transaction pattern
            const isRecurring = detectRecurringPattern(transaction, transactions)

            // Try to match with existing bills
            const matchedBillId = isExpense ? await matchTransactionWithBills(transaction, user.id, supabase) : null

            return {
              user_id: user.id,
              account_id: accountMap.get(transaction.account_id),
              plaid_transaction_id: transaction.transaction_id,
              description: transaction.name,
              merchant_name: transaction.merchant_name,
              amount: Math.abs(transaction.amount), // Plaid uses negative for money out
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
              exclude_from_spending: !!matchedBillId, // Exclude bill payments from spending totals
              recurring_pattern: isRecurring ? JSON.stringify({
                detected_frequency: detectFrequency(transaction),
                merchant: transaction.merchant_name,
                category: category
              }) : null,
              created_at: new Date().toISOString(),
            }
          })
      )

      let syncedCount = 0
      let duplicatesSkipped = 0

      if (transactionsToUpsert.length > 0) {
        // First, get existing plaid_transaction_ids to avoid duplicates
        const existingIds = await supabase
          .from('transactions')
          .select('plaid_transaction_id')
          .in('plaid_transaction_id', transactionsToUpsert.map(t => t.plaid_transaction_id))
          .not('plaid_transaction_id', 'is', null)

        const existingPlaidIds = new Set(
          existingIds.data?.map((t: any) => t.plaid_transaction_id) || []
        )

        // Filter out transactions that already exist
        const newTransactions = transactionsToUpsert.filter(
          t => !existingPlaidIds.has(t.plaid_transaction_id)
        )

        syncedCount = newTransactions.length
        duplicatesSkipped = transactionsToUpsert.length - newTransactions.length

        console.log(`Filtered ${duplicatesSkipped} duplicate transactions, inserting ${syncedCount} new ones`)

        if (newTransactions.length > 0) {
          const { error: insertError } = await supabase
            .from('transactions')
            .insert(newTransactions)

          if (insertError) {
            console.error('Error inserting transactions:', insertError)
            return NextResponse.json({ error: 'Failed to store transactions' }, { status: 500 })
          }
        }
      }

      // Update sync cursor for this item
      if (nextCursor) {
        await supabase
          .from('plaid_items')
          .update({
            sync_cursor: nextCursor,
            last_sync: new Date().toISOString()
          })
          .eq('id', plaidItem.id)
      }

      console.log(`Synced ${syncedCount} new transactions for user ${user.id}`)

      return NextResponse.json({
        success: true,
        synced: syncedCount,
        duplicatesSkipped,
        hasMore,
        nextCursor,
        totalAvailable: totalTransactions,
      })

    } catch (plaidError: any) {
      console.error('Plaid API error during sync:', plaidError)

      // Handle specific Plaid errors
      if (plaidError.error_code === 'ITEM_LOGIN_REQUIRED') {
        // Mark item as requiring re-authentication
        await supabase
          .from('plaid_items')
          .update({ status: 'login_required' })
          .eq('id', plaidItem.id)
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

// Helper function to handle removed transactions
async function handleRemovedTransactions(removedTransactions: any[], userId: string, supabase: any) {
  try {
    const removedIds = removedTransactions.map(tx => tx.transaction_id)

    if (removedIds.length > 0) {
      // Soft delete by marking as removed or hard delete
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
  } catch (error) {
    console.error('Error handling removed transactions:', error)
  }
}

// Helper function to detect if transaction is part of recurring pattern
function detectRecurringPattern(transaction: any, allTransactions: any[]): boolean {
  const merchant = transaction.merchant_name
  const amount = Math.abs(transaction.amount)
  const category = transaction.category?.[0]

  if (!merchant && !category) return false

  // Look for similar transactions in the dataset
  const similarTransactions = allTransactions.filter(tx => {
    const txAmount = Math.abs(tx.amount)
    const amountMatch = Math.abs(txAmount - amount) < (amount * 0.05) // Within 5%
    const merchantMatch = merchant && tx.merchant_name === merchant
    const categoryMatch = category && tx.category?.[0] === category

    return (merchantMatch || categoryMatch) && amountMatch
  })

  // If we find 2+ similar transactions, it might be recurring
  return similarTransactions.length >= 2
}

// Helper function to detect transaction frequency
function detectFrequency(transaction: any): string {
  const category = transaction.category?.[0]?.toLowerCase() || ''
  const name = transaction.name?.toLowerCase() || ''

  // Common bill patterns
  if (name.includes('subscription') || name.includes('monthly')) return 'monthly'
  if (name.includes('annual') || name.includes('yearly')) return 'annual'
  if (name.includes('quarterly')) return 'quarterly'

  // Category-based frequency detection
  if (category.includes('subscription') || category.includes('telecommunication')) return 'monthly'
  if (category.includes('insurance')) return 'monthly'
  if (category.includes('utilities')) return 'monthly'

  return 'unknown'
}

// Enhanced function to match transactions with bills
async function matchTransactionWithBills(transaction: any, userId: string, supabase: any): Promise<string | null> {
  try {
    const { data: bills } = await supabase
      .from('bills')
      .select('id, name, amount, categories')
      .eq('user_id', userId)
      .eq('is_active', true)

    if (!bills || bills.length === 0) return null

    const txAmount = Math.abs(transaction.amount)
    const txCategory = transaction.category?.[0]
    const txMerchant = transaction.merchant_name?.toLowerCase() || ''
    const txDescription = transaction.name?.toLowerCase() || ''

    // Find matching bill
    for (const bill of bills) {
      // Amount match (within 10% tolerance)
      const amountMatch = Math.abs(bill.amount - txAmount) < (bill.amount * 0.1)

      // Category match
      const categoryMatch = bill.categories?.includes(txCategory)

      // Name/merchant match
      const nameMatch = txMerchant.includes(bill.name.toLowerCase()) ||
                       txDescription.includes(bill.name.toLowerCase()) ||
                       bill.name.toLowerCase().includes(txMerchant)

      // If we have strong matches, consider it a bill payment
      if ((amountMatch && categoryMatch) || (amountMatch && nameMatch)) {
        return bill.id
      }
    }

    return null
  } catch (error) {
    console.error('Error matching transaction with bills:', error)
    return null
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