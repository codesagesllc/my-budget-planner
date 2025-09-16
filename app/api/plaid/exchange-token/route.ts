import { NextRequest, NextResponse } from 'next/server'
import { plaidClient } from '@/lib/plaid/client'
import { createServerActionClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { public_token, userId, institution } = await request.json()
    
    if (!public_token || !userId) {
      return NextResponse.json(
        { error: 'Public token and user ID are required' },
        { status: 400 }
      )
    }

    const supabase = await createServerActionClient()

    // Exchange public token for access token
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token,
    })

    const { access_token, item_id } = exchangeResponse.data

    // Store the access token securely in database
    const { error: insertError } = await supabase
      .from('plaid_items')
      .insert({
        user_id: userId,
        access_token,
        item_id,
        institution_name: institution?.name || 'Unknown',
      })

    if (insertError) {
      console.error('Error storing Plaid item:', insertError)
      return NextResponse.json(
        { error: 'Failed to store bank connection' },
        { status: 500 }
      )
    }

    // Fetch accounts
    const accountsResponse = await plaidClient.accountsGet({
      access_token,
    })

    // Store accounts in database
    const accountsToInsert = accountsResponse.data.accounts.map(account => ({
      user_id: userId,
      plaid_account_id: account.account_id,
      name: account.name,
      type: account.type,
      balance: account.balances.current || 0,
      currency: account.balances.iso_currency_code || 'USD',
    }))

    const { error: accountsError } = await supabase
      .from('accounts')
      .insert(accountsToInsert)

    if (accountsError) {
      console.error('Error storing accounts:', accountsError)
    }

    // Initiate initial transaction sync
    try {
      const now = new Date()
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      
      const transactionsResponse = await plaidClient.transactionsGet({
        access_token,
        start_date: thirtyDaysAgo.toISOString().split('T')[0],
        end_date: now.toISOString().split('T')[0],
      })

      // Map Plaid accounts to our accounts
      const { data: ourAccounts } = await supabase
        .from('accounts')
        .select('id, plaid_account_id')
        .eq('user_id', userId)

      const accountMap = new Map(
        ourAccounts?.map((acc: any) => [acc.plaid_account_id, acc.id]) || []
      )

      // Store transactions
      const transactionsToInsert = transactionsResponse.data.transactions
        .filter(tx => accountMap.has(tx.account_id))
        .map(transaction => ({
          user_id: userId,
          account_id: accountMap.get(transaction.account_id),
          plaid_transaction_id: transaction.transaction_id,
          description: transaction.name,
          amount: Math.abs(transaction.amount), // Plaid uses negative for money out
          date: transaction.date,
          category: transaction.category?.[0] || null,
          pending: transaction.pending,
        }))

      if (transactionsToInsert.length > 0) {
        const { error: txError } = await supabase
          .from('transactions')
          .insert(transactionsToInsert)

        if (txError) {
          console.error('Error storing transactions:', txError)
        }
      }
    } catch (txError) {
      console.error('Error fetching initial transactions:', txError)
      // Don't fail the whole request if transaction sync fails
    }

    return NextResponse.json({
      success: true,
      accounts: accountsResponse.data.accounts.length,
    })
  } catch (error) {
    console.error('Error exchanging token:', error)
    return NextResponse.json(
      { error: 'Failed to exchange token' },
      { status: 500 }
    )
  }
}
