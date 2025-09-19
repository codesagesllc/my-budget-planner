import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { plaidClient } from '@/lib/plaid/config'

export async function GET(request: NextRequest) {
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

    if (itemsError) {
      return NextResponse.json({ error: 'Database error', details: itemsError.message }, { status: 500 })
    }

    console.log('Found Plaid items:', plaidItems?.length || 0)

    const testResults = []

    for (const item of plaidItems || []) {
      console.log(`Testing item: ${item.institution_name} (${item.item_id})`)

      try {
        // Test 1: Get basic item info
        const itemResponse = await plaidClient.itemGet({
          access_token: item.access_token
        })

        console.log(`Item ${item.institution_name} - Basic info successful`)

        // Test 2: Get accounts
        const accountsResponse = await plaidClient.accountsGet({
          access_token: item.access_token
        })

        console.log(`Item ${item.institution_name} - Found ${accountsResponse.data.accounts.length} accounts`)

        // Test 3: Check if item supports transactions
        const itemInfo = itemResponse.data.item
        const availableProducts = itemInfo.available_products || []
        const billedProducts = itemInfo.billed_products || []

        testResults.push({
          institution: item.institution_name,
          item_id: item.item_id,
          status: item.status,
          success: true,
          accounts: accountsResponse.data.accounts.length,
          availableProducts,
          billedProducts,
          supportsTransactions: billedProducts.includes('transactions' as any) || availableProducts.includes('transactions' as any),
          lastUpdate: itemInfo.update_type,
          consentExpiration: itemInfo.consent_expiration_time
        })

      } catch (error: any) {
        console.error(`Error testing ${item.institution_name}:`, {
          message: error.message,
          status: error.response?.status,
          errorCode: error.response?.data?.error_code,
          errorType: error.response?.data?.error_type,
          errorMessage: error.response?.data?.error_message
        })

        testResults.push({
          institution: item.institution_name,
          item_id: item.item_id,
          status: item.status,
          success: false,
          error: error.response?.data?.error_message || error.message,
          errorCode: error.response?.data?.error_code
        })
      }
    }

    return NextResponse.json({
      success: true,
      totalItems: plaidItems?.length || 0,
      results: testResults
    })

  } catch (error: any) {
    console.error('Error testing Plaid connections:', error)
    return NextResponse.json(
      { error: 'Test failed', details: error.message },
      { status: 500 }
    )
  }
}