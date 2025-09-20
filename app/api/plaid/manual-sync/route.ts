import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { plaidClient, handlePlaidError } from '@/lib/plaid/config'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all user's plaid items
    const { data: plaidItems, error: itemsError } = await supabase
      .from('plaid_items')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'connected')

    if (itemsError || !plaidItems || plaidItems.length === 0) {
      return NextResponse.json({
        error: 'No connected Plaid accounts found',
        details: itemsError?.message
      }, { status: 404 })
    }

    let totalSynced = 0
    const results = []

    for (const item of plaidItems) {
      try {
        console.log(`Syncing transactions for item: ${item.institution_name}`)

        // Try different date ranges to find transactions
        const dateRanges = [
          { days: 7, name: '7 days' },
          { days: 30, name: '30 days' },
          { days: 90, name: '90 days' },
        ]

        let transactions: any[] = []
        let usedRange = null

        for (const range of dateRanges) {
          const endDate = new Date()
          const startDate = new Date()
          startDate.setDate(startDate.getDate() - range.days)

          try {
            console.log(`Trying ${range.name} range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`)

            const response = await plaidClient.transactionsGet({
              access_token: item.access_token,
              start_date: startDate.toISOString().split('T')[0],
              end_date: endDate.toISOString().split('T')[0],
            })

            transactions = response.data.transactions
            usedRange = range.name
            console.log(`Found ${transactions.length} transactions in ${range.name}`)

            if (transactions.length > 0) break

          } catch (rangeError: any) {
            console.log(`${range.name} range failed:`, rangeError.response?.data?.error_code || rangeError.message)
            continue
          }
        }

        if (transactions.length === 0) {
          results.push({
            institution: item.institution_name,
            success: true,
            transactions: 0,
            message: 'No transactions found in any date range'
          })
          continue
        }

        // Get account mapping
        const { data: accounts } = await supabase
          .from('accounts')
          .select('id, plaid_account_id')
          .eq('user_id', user.id)

        const accountMap = new Map(
          accounts?.map((acc: any) => [acc.plaid_account_id, acc.id]) || []
        )

        console.log(`Account mapping for ${item.institution_name}:`,
          accounts?.map((acc: any) => ({ plaid_id: acc.plaid_account_id, db_id: acc.id })))

        // Process transactions
        const transactionsToInsert = transactions
          .filter(tx => {
            const hasAccount = accountMap.has(tx.account_id)
            if (!hasAccount) {
              console.log(`Transaction ${tx.transaction_id} filtered out - account ${tx.account_id} not in mapping`)
            }
            return hasAccount
          })
          .map(transaction => ({
            user_id: user.id,
            account_id: accountMap.get(transaction.account_id),
            plaid_transaction_id: transaction.transaction_id,
            description: transaction.name,
            merchant_name: transaction.merchant_name,
            amount: Math.abs(transaction.amount),
            type: transaction.amount > 0 ? 'debit' : 'credit',
            transaction_type: transaction.amount > 0 ? 'expense' : 'income',
            date: transaction.date,
            authorized_date: transaction.authorized_date,
            category: transaction.category?.[0] || 'Other',
            subcategory: transaction.category?.[1] || null,
            plaid_category: transaction.category?.join(', ') || null,
            pending: transaction.pending,
            account_owner: transaction.account_owner,
            iso_currency_code: transaction.iso_currency_code || 'USD',
            created_at: new Date().toISOString(),
          }))

        console.log(`Processing ${transactionsToInsert.length} transactions for ${item.institution_name}`)

        if (transactionsToInsert.length > 0) {
          // First, get existing plaid_transaction_ids to avoid duplicates
          const existingIds = await supabase
            .from('transactions')
            .select('plaid_transaction_id')
            .in('plaid_transaction_id', transactionsToInsert.map(t => t.plaid_transaction_id))
            .not('plaid_transaction_id', 'is', null)

          const existingPlaidIds = new Set(
            existingIds.data?.map((t: any) => t.plaid_transaction_id) || []
          )

          // Filter out transactions that already exist
          const newTransactions = transactionsToInsert.filter(
            t => !existingPlaidIds.has(t.plaid_transaction_id)
          )

          console.log(`Filtered ${transactionsToInsert.length - newTransactions.length} duplicate transactions, inserting ${newTransactions.length} new ones`)

          let upsertError = null
          if (newTransactions.length > 0) {
            const result = await supabase
              .from('transactions')
              .insert(newTransactions)
            upsertError = result.error
          }

          if (upsertError) {
            console.error('Error upserting transactions:', upsertError)
            results.push({
              institution: item.institution_name,
              success: false,
              error: upsertError.message
            })
          } else {
            totalSynced += newTransactions.length

            // Update last_sync timestamp
            await supabase
              .from('plaid_items')
              .update({ last_sync: new Date().toISOString() })
              .eq('id', item.id)

            results.push({
              institution: item.institution_name,
              success: true,
              transactions: newTransactions.length,
              duplicatesSkipped: transactionsToInsert.length - newTransactions.length,
              dateRange: usedRange
            })
          }
        } else {
          results.push({
            institution: item.institution_name,
            success: true,
            transactions: 0,
            message: 'All transactions filtered out (no matching accounts)'
          })
        }

      } catch (error: any) {
        console.error(`Error syncing ${item.institution_name}:`, error)
        results.push({
          institution: item.institution_name,
          success: false,
          error: error.message
        })
      }
    }

    return NextResponse.json({
      success: true,
      totalTransactionsSynced: totalSynced,
      accountsProcessed: plaidItems.length,
      results
    })

  } catch (error: any) {
    console.error('Error in manual sync:', error)
    return NextResponse.json(
      {
        error: 'Manual sync failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}