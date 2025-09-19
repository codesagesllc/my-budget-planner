import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all transactions
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    // Get all plaid items
    const { data: plaidItems, error: plaidError } = await supabase
      .from('plaid_items')
      .select('*')
      .eq('user_id', user.id)

    // Get all accounts
    const { data: accounts, error: accountsError } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', user.id)

    return NextResponse.json({
      user_id: user.id,
      transactions: {
        count: transactions?.length || 0,
        data: transactions || [],
        error: transactionsError
      },
      plaidItems: {
        count: plaidItems?.length || 0,
        data: plaidItems || [],
        error: plaidError
      },
      accounts: {
        count: accounts?.length || 0,
        data: accounts || [],
        error: accountsError
      }
    })

  } catch (error: any) {
    console.error('Debug error:', error)
    return NextResponse.json(
      { error: 'Debug failed', details: error.message },
      { status: 500 }
    )
  }
}