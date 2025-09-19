import { NextRequest, NextResponse } from 'next/server'
import { plaidClient, PLAID_PRODUCTS, PLAID_COUNTRY_CODES } from '@/lib/plaid/client'
import { createServerActionClient, createServiceRoleClient } from '@/lib/supabase/server'
import { CountryCode, Products } from 'plaid'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    console.log('Creating Plaid link token for user:', userId)

    const supabase = await createServerActionClient()
    
    // Check if user exists in auth
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !authUser) {
      console.error('Auth user not found:', authError)
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Check if user profile exists, if not create it using service role
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single()
    
    if (profileError && profileError.code === 'PGRST116') {
      // Profile doesn't exist, create it with service role client
      console.log('Creating user profile for:', authUser.email)
      const serviceSupabase = await createServiceRoleClient()
      
      const { error: insertError } = await serviceSupabase
        .from('users')
        .insert({
          id: userId,
          email: authUser.email || '',
        })
      
      if (insertError) {
        console.error('Error creating user profile with service role:', insertError)
      } else {
        console.log('User profile created successfully')
      }
    }

    // Create Plaid Link token
    console.log('Creating Plaid link token...')
    try {
      const response = await plaidClient.linkTokenCreate({
        user: {
          client_user_id: userId,
        },
        client_name: 'PocketWiseAI',
        products: PLAID_PRODUCTS as Products[],
        country_codes: PLAID_COUNTRY_CODES as CountryCode[],
        language: 'en',
        // Remove redirect_uri if it's empty
      })

      console.log('Plaid link token created successfully')
      return NextResponse.json({ link_token: response.data.link_token })
    } catch (plaidError: any) {
      console.error('Plaid API Error:', plaidError.response?.data || plaidError.message)
      return NextResponse.json(
        { 
          error: 'Failed to create Plaid link token', 
          details: plaidError.response?.data?.error_message || plaidError.message 
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in create-link-token:', error)
    return NextResponse.json(
      { error: 'Failed to create link token', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
