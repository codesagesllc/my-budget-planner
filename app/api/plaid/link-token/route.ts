// app/api/plaid/link-token/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { plaidClient, handlePlaidError, PLAID_PRODUCTS, PLAID_COUNTRY_CODES, isLocalDevelopment } from '@/lib/plaid/config'
import { LinkTokenCreateRequest } from 'plaid'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile for additional context
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    // Create link token request - simplified for debugging
    const linkTokenRequest: LinkTokenCreateRequest = {
      user: {
        client_user_id: user.id,
      },
      client_name: 'PocketWiseAI',
      products: ['transactions' as any],
      country_codes: ['US' as any],
      language: 'en',
    }

    console.log('Creating link token with request:', JSON.stringify(linkTokenRequest, null, 2))

    // Create link token with Plaid
    const response = await plaidClient.linkTokenCreate(linkTokenRequest)

    // Log successful token creation for monitoring
    console.log('Link token created successfully for user:', user.id)

    return NextResponse.json({
      link_token: response.data.link_token,
      expiration: response.data.expiration,
    })

  } catch (error: any) {
    console.error('Error creating link token:', {
      error: error.message,
      code: error.error_code,
      type: error.error_type,
      response: error.response?.data || 'No response data',
      status: error.response?.status,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })

    const errorMessage = handlePlaidError(error.response?.data || error)

    return NextResponse.json(
      {
        error: errorMessage,
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? {
          original_error: error.message,
          error_code: error.error_code,
          error_type: error.error_type
        } : undefined
      },
      { status: 500 }
    )
  }
}

// Optional: Handle update mode for existing items
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { access_token } = await request.json()

    if (!access_token) {
      return NextResponse.json({ error: 'Access token required' }, { status: 400 })
    }

    // Create update mode link token
    const linkTokenRequest: LinkTokenCreateRequest = {
      user: {
        client_user_id: user.id,
      },
      client_name: 'PocketWiseAI',
      country_codes: PLAID_COUNTRY_CODES as any,
      language: 'en',
      access_token: access_token, // This enables update mode
    }

    const response = await plaidClient.linkTokenCreate(linkTokenRequest)

    return NextResponse.json({
      link_token: response.data.link_token,
      expiration: response.data.expiration,
      mode: 'update',
    })

  } catch (error: any) {
    console.error('Error creating update link token:', error)

    const errorMessage = handlePlaidError(error)

    return NextResponse.json(
      {
        error: 'Failed to create update link token',
        message: errorMessage
      },
      { status: 500 }
    )
  }
}