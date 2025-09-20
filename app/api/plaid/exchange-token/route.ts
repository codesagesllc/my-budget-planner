import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { plaidClient, handlePlaidError } from '@/lib/plaid/config'
import { ItemPublicTokenExchangeRequest, AccountsGetRequest } from 'plaid'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { public_token, metadata } = await request.json()

    if (!public_token) {
      return NextResponse.json({ error: 'Public token required' }, { status: 400 })
    }

    // Exchange public token for access token
    const exchangeRequest: ItemPublicTokenExchangeRequest = {
      public_token,
    }

    const exchangeResponse = await plaidClient.itemPublicTokenExchange(exchangeRequest)
    const access_token = exchangeResponse.data.access_token
    const item_id = exchangeResponse.data.item_id

    // Check if this item already exists for this user
    const { data: existingItem } = await supabase
      .from('plaid_items')
      .select('*')
      .eq('user_id', user.id)
      .eq('item_id', item_id)
      .single()

    let plaidItem = existingItem

    if (!existingItem) {
      // Store new Plaid item in database
      const { data: newItem, error: itemError } = await supabase
        .from('plaid_items')
        .insert({
          user_id: user.id,
          item_id,
          access_token, // In production, encrypt this
          institution_id: metadata?.institution?.institution_id,
          institution_name: metadata?.institution?.name,
          status: 'connected',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (itemError) {
        console.error('Error storing Plaid item:', itemError)
        return NextResponse.json({ error: 'Failed to store connection' }, { status: 500 })
      }

      plaidItem = newItem
    } else {
      // Update existing item
      const { data: updatedItem, error: updateError } = await supabase
        .from('plaid_items')
        .update({
          access_token,
          institution_id: metadata?.institution?.institution_id,
          institution_name: metadata?.institution?.name,
          status: 'connected',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingItem.id)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating Plaid item:', updateError)
        return NextResponse.json({ error: 'Failed to update connection' }, { status: 500 })
      }

      plaidItem = updatedItem
    }

    // Get account information
    const accountsRequest: AccountsGetRequest = {
      access_token,
    }

    const accountsResponse = await plaidClient.accountsGet(accountsRequest)
    const accounts = accountsResponse.data.accounts

    // Store accounts in database
    const accountsToInsert = accounts.map(account => ({
      user_id: user.id,
      plaid_item_id: plaidItem.id,
      plaid_account_id: account.account_id,
      name: account.name,
      official_name: account.official_name,
      type: account.type,
      subtype: account.subtype,
      mask: account.mask,
      balance: account.balances.current || 0,
      available_balance: account.balances.available,
      currency: account.balances.iso_currency_code || 'USD',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }))

    const { data: insertedAccounts, error: accountsError } = await supabase
      .from('accounts')
      .insert(accountsToInsert)
      .select()

    if (accountsError) {
      console.error('Error storing accounts:', accountsError)
      // Don't fail the entire request if accounts storage fails
    }


    // Schedule initial transaction sync
    await scheduleTransactionSync(access_token, user.id)

    console.log(`Successfully connected Plaid item ${item_id} for user ${user.id}`)

    return NextResponse.json({
      success: true,
      item: {
        id: plaidItem.id,
        item_id,
        institution_name: metadata?.institution?.name,
        accounts: insertedAccounts || [],
      }
    })

  } catch (error: any) {
    console.error('Error exchanging public token:', error)

    const errorMessage = handlePlaidError(error)

    return NextResponse.json(
      {
        error: 'Failed to connect account',
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    )
  }
}

// Helper function to schedule transaction sync
async function scheduleTransactionSync(access_token: string, user_id: string) {
  try {
    // Use direct Plaid API call instead of internal fetch
    const { plaidClient } = await import('@/lib/plaid/config')
    const { createClient } = await import('@/lib/supabase/server')

    // Get transactions from Plaid - start with 30 days, can expand later
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 30) // Start with 30 days

    console.log(`Fetching transactions for date range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`)

    let transactionsResponse
    try {
      transactionsResponse = await plaidClient.transactionsGet({
        access_token,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
      })
    } catch (plaidError: any) {
      console.error('Plaid transactionsGet failed:', {
        error: plaidError.response?.data || plaidError.message,
        status: plaidError.response?.status,
        errorCode: plaidError.response?.data?.error_code,
        errorType: plaidError.response?.data?.error_type,
        errorMessage: plaidError.response?.data?.error_message,
        displayMessage: plaidError.response?.data?.display_message
      })

      // If transactions API fails, just exit gracefully
      // The account connection is still successful
      console.log('Transaction sync failed, but account connection completed successfully')
      return
    }

    console.log(`Plaid returned ${transactionsResponse.data.transactions.length} transactions`)

    if (transactionsResponse.data.transactions.length > 0) {
      const supabase = await createClient()

      // Get account mapping
      const { data: accounts } = await supabase
        .from('accounts')
        .select('id, plaid_account_id')
        .eq('user_id', user_id)

      const accountMap = new Map(
        accounts?.map((acc: any) => [acc.plaid_account_id, acc.id]) || []
      )

      console.log(`Found ${accounts?.length || 0} accounts, created mapping:`,
        accounts?.map((acc: any) => ({ plaid_id: acc.plaid_account_id, db_id: acc.id })))

      // Process and store transactions
      console.log(`Transaction account IDs from Plaid:`,
        transactionsResponse.data.transactions.map(tx => tx.account_id))

      const transactionsToInsert = transactionsResponse.data.transactions
        .filter(tx => {
          const hasAccount = accountMap.has(tx.account_id)
          if (!hasAccount) {
            console.log(`Transaction ${tx.transaction_id} filtered out - account ${tx.account_id} not found in mapping`)
          }
          return hasAccount
        })
        .map(transaction => ({
          user_id: user_id,
          account_id: accountMap.get(transaction.account_id),
          plaid_transaction_id: transaction.transaction_id,
          description: transaction.name,
          merchant_name: transaction.merchant_name,
          amount: Math.abs(transaction.amount),
          type: transaction.amount > 0 ? 'credit' : 'debit',
          transaction_type: transaction.amount > 0 ? 'income' : 'expense',
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

      if (transactionsToInsert.length > 0) {
        const { error: upsertError } = await supabase
          .from('transactions')
          .upsert(transactionsToInsert, {
            onConflict: 'plaid_transaction_id',
            ignoreDuplicates: false
          })

        if (upsertError) {
          console.error('Error upserting transactions:', upsertError)
        } else {
          console.log(`Successfully synced ${transactionsToInsert.length} transactions`)

          // Update last_sync timestamp for the plaid item
          const { data: plaidItems } = await supabase
            .from('plaid_items')
            .select('id')
            .eq('access_token', access_token)
            .eq('user_id', user_id)

          if (plaidItems && plaidItems.length > 0) {
            await supabase
              .from('plaid_items')
              .update({ last_sync: new Date().toISOString() })
              .eq('id', plaidItems[0].id)
          }
        }
      }
    }
  } catch (error: any) {
    console.error('Error in transaction sync:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
}
